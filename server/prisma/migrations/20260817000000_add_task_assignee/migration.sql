-- AlterEnum
-- Note: this migration originally also re-added Task.assignedToId (column,
-- index, and FK) — but those already exist from the earlier
-- 20260802092952_add_project_and_task migration, so re-adding them here
-- made this migration fail (P3018 "column already exists") any time the
-- full history was replayed from scratch (a shadow database, a fresh local
-- dev DB, etc.). Trimmed to just the one genuinely new statement.
ALTER TYPE "NotificationType" ADD VALUE 'TASK_ASSIGNED';
