import httpx
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.celery_app import celery_app
from app.core.logger import get_logger
from app.db.session import async_session_maker
from app.models.website import Website, WebsiteCheck
from app.services.telegram import send_telegram_notification

logger = get_logger("tasks.monitor")


@celery_app.task(name="app.tasks.monitor.check_all_websites")
def check_all_websites():
    """Проверяет все активные сайты, которые нужно проверить"""
    asyncio.run(_check_all_websites())


async def _check_all_websites():
    """Async implementation"""
    async with async_session_maker() as db:
        now = datetime.utcnow()

        # Находим все активные сайты, которые нужно проверить
        query = select(Website).where(
            Website.is_active == True,
            Website.status != "stopped"
        )
        result = await db.execute(query)
        websites = result.scalars().all()

        tasks = []
        for website in websites:
            # Проверяем, нужно ли проверять этот сайт
            if website.last_check is None:
                should_check = True
            else:
                time_since_check = (now - website.last_check).total_seconds()
                should_check = time_since_check >= website.check_interval

            if should_check:
                tasks.append(check_website.delay(website.id))

        logger.info(f"Scheduled {len(tasks)} website checks")


@celery_app.task(name="app.tasks.monitor.check_website", bind=True, max_retries=3)
def check_website(self, website_id: int):
    """Проверяет конкретный сайт"""
    try:
        asyncio.run(_check_website(website_id))
    except Exception as exc:
        logger.error(f"Error checking website {website_id}: {exc}")
        raise self.retry(exc=exc, countdown=60)


async def _check_website(website_id: int):
    """Async implementation of website check"""
    async with async_session_maker() as db:
        # Получаем сайт
        result = await db.execute(
            select(Website).where(Website.id == website_id)
        )
        website = result.scalar_one_or_none()

        if not website or not website.is_active:
            return

        logger.info(f"Checking website: {website.url}")

        start_time = datetime.utcnow()
        status = "offline"
        response_time = None
        status_code = None
        error_message = None

        try:
            async with httpx.AsyncClient(timeout=website.timeout) as client:
                response = await client.get(website.url, follow_redirects=True)
                response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
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
        website.last_check = datetime.utcnow()
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

        # Отправляем уведомление при падении сайта
        if status != "online" and website.telegram_chat_id:
            await _send_alert_if_needed(website, db)

        logger.info(
            f"Website {website.url} check completed: "
            f"status={status}, response_time={response_time}ms"
        )


async def _send_alert_if_needed(website: Website, db: AsyncSession):
    """Отправляет уведомление если необходимо"""
    # Отправляем уведомление только после 3 последовательных сбоев
    # И не чаще чем раз в 30 минут
    should_notify = False

    if website.consecutive_failures >= 3:
        if website.last_notification_sent is None:
            should_notify = True
        else:
            time_since_notification = (
                    datetime.utcnow() - website.last_notification_sent
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
            f"*Time:* {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC"
        )

        success = await send_telegram_notification(
            website.telegram_chat_id,
            message
        )

        if success:
            website.last_notification_sent = datetime.utcnow()
            await db.commit()
            logger.info(f"Alert sent for website {website.id}")


@celery_app.task(name="app.tasks.monitor.cleanup_old_checks")
def cleanup_old_checks():
    """Удаляет старые записи проверок (старше 30 дней)"""
    asyncio.run(_cleanup_old_checks())


async def _cleanup_old_checks():
    """Async implementation"""
    async with async_session_maker() as db:
        cutoff_date = datetime.utcnow() - timedelta(days=30)

        result = await db.execute(
            delete(WebsiteCheck).where(
                WebsiteCheck.checked_at < cutoff_date
            )
        )

        await db.commit()
        logger.info(f"Cleaned up {result.rowcount} old check records")


@celery_app.task(name="app.tasks.monitor.stop_website_monitoring")
def stop_website_monitoring(website_id: int):
    """Останавливает мониторинг сайта"""
    asyncio.run(_stop_website_monitoring(website_id))


async def _stop_website_monitoring(website_id: int):
    """Async implementation"""
    async with async_session_maker() as db:
        result = await db.execute(
            select(Website).where(Website.id == website_id)
        )
        website = result.scalar_one_or_none()

        if website:
            website.status = "stopped"
            website.is_active = False
            await db.commit()
            logger.info(f"Stopped monitoring for website {website_id}")
