from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "website_monitor",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.monitor"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,
    task_soft_time_limit=240,
    worker_prefetch_multiplier=1,  # Уменьшено для избежания проблем с пулом
    worker_max_tasks_per_child=100,  # Уменьшено для перезапуска воркеров
    broker_connection_retry_on_startup=True,
    broker_pool_limit=None,  # Отключаем лимит пула брокера
    result_backend_transport_options={
        'master_name': 'mymaster',
    },
    # Настройки для лучшей работы с async
    worker_pool='prefork',  # Используем prefork для изоляции
    worker_concurrency=2,  # Ограничиваем количество воркеров
)

# Динамическое расписание для мониторинга
celery_app.conf.beat_schedule = {
    "check-all-websites": {
        "task": "app.tasks.monitor.check_all_websites",
        "schedule": 60.0,  # Каждую минуту проверяем, какие сайты нужно проверить
    },
    "cleanup-old-checks": {
        "task": "app.tasks.monitor.cleanup_old_checks",
        "schedule": crontab(hour=2, minute=0),  # Каждую ночь в 2:00
    },
}

# Для запуска воркера: celery -A app.core.celery_app worker --loglevel=info
# Для запуска beat: celery -A app.core.celery_app beat --loglevel=info
