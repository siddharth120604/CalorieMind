-- Add concerns field to daily_reports for richer AI output

ALTER TABLE daily_reports
    ADD COLUMN IF NOT EXISTS concerns TEXT;
