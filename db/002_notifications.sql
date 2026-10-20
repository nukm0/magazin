BEGIN;
CREATE TABLE IF NOT EXISTS app_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id text NOT NULL,text text NOT NULL,source text NOT NULL,entity jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),read_at timestamptz,telegram_status text NOT NULL DEFAULT 'queued' CHECK(telegram_status IN ('queued','sending','sent','failed','disabled')),
 attempts integer NOT NULL DEFAULT 0,next_attempt timestamptz NOT NULL DEFAULT now(),locked_at timestamptz,sent_at timestamptz,last_error text NOT NULL DEFAULT '',UNIQUE(user_id,source)
);
CREATE INDEX IF NOT EXISTS app_notifications_recipient ON app_notifications(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS app_notifications_pending ON app_notifications(telegram_status,next_attempt);
COMMIT;
