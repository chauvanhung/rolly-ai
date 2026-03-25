# APScheduler Automation Skill

## Purpose
Automate and manage scheduled background jobs in a FastAPI application using APScheduler. This skill ensures jobs (such as daily reports and anomaly detection) are reliably scheduled, executed, and logged, with clean startup and shutdown integration.

## Workflow Steps
1. **Initialize Scheduler**
   - Create a singleton `BackgroundScheduler` with memory job store and thread pool executor.
   - Set timezone and job defaults.
2. **Start Scheduler**
   - On FastAPI startup, call `start_scheduler()`.
   - Register default jobs (e.g., daily report, anomaly detection) with appropriate triggers (cron, interval).
   - Log all scheduled jobs and their timing.
3. **Job Execution**
   - Each job is defined as an async function (e.g., `daily_report_job`, `anomaly_detection_job`).
   - Synchronous wrappers (`sync_daily_report`, `sync_anomaly_detection`) run async jobs in APScheduler threads.
   - Jobs perform business logic (SQL queries, reporting, alerting) and send results (e.g., via Telegram).
   - All job actions and results are logged.
4. **Shutdown Scheduler**
   - On FastAPI shutdown, call `stop_scheduler()` to gracefully stop the scheduler and log shutdown.

## Decision Points
- If scheduler is already running, do not start again (idempotent startup).
- Jobs are replaced if already scheduled (using `replace_existing=True`).
- Telegram alerts are only sent if credentials are configured.
- SQL queries are validated for safety before execution.

## Quality Criteria
- All jobs are reliably scheduled and executed at the correct time.
- No duplicate scheduler instances.
- All job actions, results, and errors are logged.
- System is robust to SQL/Telegram/config errors (logs and continues).
- Clean shutdown on app exit.

## Example Prompts
- "Add a new scheduled job to send a weekly summary."
- "Change the daily report time to 7:30 AM."
- "Log all failed job executions with error details."
- "Integrate a new alert job for low stock every 6 hours."

## Related Customizations
- Skill for custom job registration and dynamic scheduling.
- Skill for job monitoring and alerting on failures.
- Skill for integrating additional notification channels (email, Slack).
