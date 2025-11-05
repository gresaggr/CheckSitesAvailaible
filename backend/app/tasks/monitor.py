import httpx
import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.celery_app import celery_app
from app.core.logger import get_logger
from app.db.session import async_session_maker, engine
from app.models import User, Website, WebsiteCheck
from app.services.telegram import send_telegram_notification

from curl_cffi.requests import AsyncSession as CurlAsyncSession

logger = get_logger("tasks.monitor")


# Создаем единый event loop для всех задач Celery
def get_or_create_eventloop():
    try:
        return asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop


@celery_app.task(name="app.tasks.monitor.check_all_websites")
def check_all_websites():
    """Проверяет все активные сайты, которые нужно проверить"""
    loop = get_or_create_eventloop()
    try:
        loop.run_until_complete(_check_all_websites())
    finally:
        # Dispose engine для освобождения соединений
        loop.run_until_complete(engine.dispose())


async def _check_all_websites():
    """Async implementation"""
    async with async_session_maker() as db:
        try:
            now = datetime.now(timezone.utc)

            # Находим все активные сайты, которые нужно проверить
            query = select(Website).where(
                Website.is_active == True,
                Website.status != "stopped"
            )

            result = await db.execute(query)
            websites = result.scalars().all()

            tasks = []
            for website in websites:
                if website.last_check is None:
                    should_check = True
                else:
                    time_since_check = (now - website.last_check).total_seconds()
                    should_check = time_since_check >= website.check_interval

                if should_check:
                    tasks.append(check_website.delay(website.id))

            logger.info(f"Scheduled {len(tasks)} website checks")

        except Exception as e:
            logger.error(f"Error in check_all_websites: {e}")
            raise
        finally:
            await db.close()


@celery_app.task(name="app.tasks.monitor.check_website", bind=True, max_retries=3)
def check_website(self, website_id: int):
    """Проверяет конкретный сайт"""
    loop = get_or_create_eventloop()
    try:
        loop.run_until_complete(_check_website(website_id))
    except Exception as exc:
        logger.error(f"Error checking website {website_id}: {exc}")
        raise self.retry(exc=exc, countdown=60)
    finally:
        # Dispose engine для освобождения соединений
        try:
            loop.run_until_complete(engine.dispose())
        except Exception as e:
            logger.warning(f"Error disposing engine: {e}")


async def _check_website(website_id: int):
    """Async implementation of website check"""
    async with async_session_maker() as db:
        try:
            # Получаем сайт
            result = await db.execute(
                select(Website).where(Website.id == website_id)
            )
            website = result.scalar_one_or_none()

            if not website or not website.is_active:
                return

            logger.info(f'Checking website: {website.url} with "{website.valid_word}"')

            # Сохраняем предыдущий статус для проверки восстановления
            previous_status = website.status

            # Инициализируем значения если None
            if website.consecutive_failures is None:
                website.consecutive_failures = 0
            if website.total_checks is None:
                website.total_checks = 0
            if website.failed_checks is None:
                website.failed_checks = 0

            status = "offline"
            response_time = None
            status_code = None
            error_message = None
            start_time = datetime.now(timezone.utc)

            try:
                # async with httpx.AsyncClient(timeout=website.timeout) as client:
                async with CurlAsyncSession() as client:
                    # response = await client.get(website.url, follow_redirects=True)
                    response = await client.get(website.url, impersonate="chrome")
                    logger.debug(f'Checking website: {website.url} response succeed...')
                    response_time = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
                    status_code = response.status_code

                    # Проверяем наличие валидного слова
                    if website.valid_word in response.text:
                        status = "online"
                        website.consecutive_failures = 0
                    else:
                        status = "offline"
                        error_message = f"Valid word '{website.valid_word}' not found"
                        website.consecutive_failures += 1

            except httpx.TimeoutException:
                error_message = f"Timeout after {website.timeout}s"
                website.consecutive_failures += 1
            except httpx.RequestError as e:
                error_message = f"Request error: {str(e)}"
                website.consecutive_failures += 1
            except Exception as e:
                error_message = f"Unknown error: {str(e)}"
                website.consecutive_failures += 1

            # Обновляем статус сайта
            website.status = status
            website.last_check = datetime.now(timezone.utc)
            website.response_time = response_time
            website.error_message = error_message
            website.total_checks += 1

            if status != "online":
                website.failed_checks += 1

            # Сохраняем историю проверки
            check = WebsiteCheck(
                website_id=website_id,
                status=status,
                response_time=response_time,
                status_code=status_code,
                error_message=error_message
            )
            db.add(check)
            await db.commit()

            # Проверяем восстановление сайта
            if status == "online" and previous_status in ["offline", "error"]:
                await _send_recovery_notification(website)

            # Отправляем уведомление при падении сайта
            elif status != "online" and website.telegram_chat_id:
                await _send_alert_if_needed(website, db)

            logger.info(
                f"Website {website.url} check completed: "
                f"status={status}, response_time={response_time}ms, failures={website.consecutive_failures}"
            )

        except Exception as e:
            logger.error(f"Error in _check_website: {e}")
            await db.rollback()
            raise
        finally:
            await db.close()


async def _send_recovery_notification(website: Website):
    """Отправляет уведомление о восстановлении сайта"""
    if not website.telegram_chat_id:
        return

    # Отправляем уведомление о восстановлении
    message = (
        f"✅ *Website Recovered*\n\n"
        f"*Website:* {website.name or website.url}\n"
        f"*URL:* {website.url}\n"
        f"*Status:* {website.status}\n"
        f"*Response Time:* {website.response_time:.2f}ms\n"
        f"*Time:* {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC"
    )

    success = await send_telegram_notification(
        website.telegram_chat_id,
        message
    )

    if success:
        logger.info(f"Recovery notification sent for website {website.id}")


async def _send_alert_if_needed(website: Website, db: AsyncSession):
    """Отправляет уведомление если необходимо"""
    # Отправляем уведомление только после 3 последовательных сбоев
    # И не чаще чем раз в 30 минут
    should_notify = False

    consecutive_failures = website.consecutive_failures or 0
    failure_threshold = website.failure_threshold or 3

    if consecutive_failures >= failure_threshold:
        if website.last_notification_sent is None:
            should_notify = True
        else:
            time_since_notification = (
                    datetime.now(timezone.utc) - website.last_notification_sent
            ).total_seconds()
            if time_since_notification >= 1800:  # 30 минут
                should_notify = True

    if should_notify:
        message = (
            f"🚨 *Website Down Alert*\n\n"
            f"*Website:* {website.name or website.url}\n"
            f"*URL:* {website.url}\n"
            f"*Status:* {website.status}\n"
            f"*Consecutive Failures:* {website.consecutive_failures}\n"
            f"*Error:* {website.error_message or 'Unknown'}\n"
            f"*Time:* {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC"
        )
        logger.info(f"Sending notification to {website.telegram_chat_id}")
        success = await send_telegram_notification(
            website.telegram_chat_id,
            message
        )

        if success:
            website.last_notification_sent = datetime.now(timezone.utc)
            await db.commit()
            logger.info(f"Alert sent for website {website.id}")


@celery_app.task(name="app.tasks.monitor.cleanup_old_checks")
def cleanup_old_checks():
    """Удаляет старые записи проверок (старше 30 дней)"""
    loop = get_or_create_eventloop()
    try:
        loop.run_until_complete(_cleanup_old_checks())
    finally:
        loop.run_until_complete(engine.dispose())


async def _cleanup_old_checks():
    """Async implementation"""
    async with async_session_maker() as db:
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)
            result = await db.execute(
                delete(WebsiteCheck).where(
                    WebsiteCheck.checked_at < cutoff_date
                )
            )
            await db.commit()
            logger.info(f"Cleaned up {result.rowcount} old check records")
        except Exception as e:
            logger.error(f"Error in cleanup_old_checks: {e}")
            await db.rollback()
            raise
        finally:
            await db.close()


@celery_app.task(name="app.tasks.monitor.stop_website_monitoring")
def stop_website_monitoring(website_id: int):
    """Останавливает мониторинг сайта"""
    loop = get_or_create_eventloop()
    try:
        loop.run_until_complete(_stop_website_monitoring(website_id))
    finally:
        loop.run_until_complete(engine.dispose())


async def _stop_website_monitoring(website_id: int):
    """Async implementation"""
    async with async_session_maker() as db:
        try:
            result = await db.execute(
                select(Website).where(Website.id == website_id)
            )
            website = result.scalar_one_or_none()

            if website:
                website.status = "stopped"
                website.is_active = False
                await db.commit()
                logger.info(f"Stopped monitoring for website {website_id}")
        except Exception as e:
            logger.error(f"Error in stop_website_monitoring: {e}")
            await db.rollback()
            raise
        finally:
            await db.close()
