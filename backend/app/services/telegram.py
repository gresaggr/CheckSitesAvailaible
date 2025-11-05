import httpx
from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger("services.telegram")


async def send_telegram_notification(chat_id: str, message: str) -> bool:
    """
    Отправляет уведомление в Telegram

    Args:
        chat_id: ID чата/пользователя в Telegram
        message: Текст сообщения (поддерживает Markdown)

    Returns:
        bool: True если сообщение отправлено успешно
    """
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.warning("Telegram bot token not configured")
        return False

    if chat_id.startswith("100"):
        chat_id = f'-{chat_id}'
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"

    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "Markdown",
        "disable_web_page_preview": True
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            logger.info(f"Telegram notification sent to {chat_id}")
            return True

    except httpx.HTTPStatusError as e:
        logger.error(f"Failed to send Telegram notification: {e.response.status_code}")
        logger.error(f"Response: {e.response.text}")
        return False

    except Exception as e:
        logger.error(f"Error sending Telegram notification: {e}")
        return False


async def validate_telegram_chat_id(chat_id: str) -> bool:
    """
    Проверяет валидность Telegram Chat ID

    Args:
        chat_id: ID чата для проверки

    Returns:
        bool: True если chat_id валиден
    """
    if not settings.TELEGRAM_BOT_TOKEN:
        return False

    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/getChat"
    if chat_id.startswith("100"):
        chat_id = f'-{chat_id}'
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url, params={"chat_id": chat_id})
            response.raise_for_status()
            return True

    except Exception as e:
        logger.warning(f"Invalid Telegram chat ID {chat_id}: {e}")
        return False
