"""
APScheduler lifecycle and helper functions.
"""
from __future__ import annotations

from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.schedulers.background import BackgroundScheduler

from app.automation.jobs import sync_anomaly_detection, sync_daily_report
from app.core.config import settings
from app.core.logger import logger

_scheduler: BackgroundScheduler | None = None


def get_scheduler() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = BackgroundScheduler(
            jobstores={"default": MemoryJobStore()},
            executors={"default": ThreadPoolExecutor(max_workers=2)},
            job_defaults={"coalesce": True, "max_instances": 1},
            timezone=settings.scheduler_timezone,
        )
    return _scheduler


def start_scheduler() -> None:
    scheduler = get_scheduler()
    if scheduler.running:
        return

    scheduler.add_job(
        sync_daily_report,
        trigger="cron",
        hour=settings.daily_report_hour,
        minute=settings.daily_report_minute,
        id="default_daily_report",
        name="Daily Report",
        replace_existing=True,
    )
    scheduler.add_job(
        sync_anomaly_detection,
        trigger="interval",
        hours=1,
        id="default_anomaly_detection",
        name="Anomaly Detection",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("APScheduler started.")


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped.")


def schedule_daily_report(hour: int, minute: int = 0) -> str:
    scheduler = get_scheduler()
    scheduler.add_job(
        sync_daily_report,
        trigger="cron",
        hour=hour,
        minute=minute,
        id="chat_daily_report",
        name="Chat Scheduled Daily Report",
        replace_existing=True,
    )
    return f"Đã lên lịch báo cáo hằng ngày lúc {hour:02d}:{minute:02d}."


def list_jobs_payload() -> list[dict[str, str]]:
    scheduler = get_scheduler()
    return [
        {
            "id": job.id,
            "name": job.name,
            "trigger": str(job.trigger),
            "next_run": str(job.next_run_time) if job.next_run_time else "not scheduled",
        }
        for job in scheduler.get_jobs()
    ]
