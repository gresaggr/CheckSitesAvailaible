import logging
import sys
from pathlib import Path
from app.core.config import settings

# Create logs directory
Path("logs").mkdir(exist_ok=True)

# Configure logging format
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Create formatters
formatter = logging.Formatter(LOG_FORMAT, DATE_FORMAT)

# Console handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(formatter)

# File handler
file_handler = logging.FileHandler("logs/app.log")
file_handler.setFormatter(formatter)

# Configure root logger
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    handlers=[console_handler, file_handler]
)

# Create logger instance
logger = logging.getLogger("telegram_monitor")


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the given name"""
    return logging.getLogger(f"telegram_monitor.{name}")