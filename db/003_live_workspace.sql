-- Выполняется владельцем через кнопку включения CRM. Существующие таблицы и роли не изменяются.
BEGIN;
CREATE TABLE IF NOT EXISTS public.shop_state(id integer PRIMARY KEY CHECK(id=1),version integer NOT NULL DEFAULT 1,data jsonb NOT NULL DEFAULT '{}'::jsonb,updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.shop_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.shop_state FROM anon,authenticated;
CREATE TABLE IF NOT EXISTS public.bot_support_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id text NOT NULL,kind text NOT NULL CHECK(kind IN ('complaint','cooperation','rental')),sender jsonb NOT NULL,body text NOT NULL,photo text NOT NULL DEFAULT '',source text NOT NULL UNIQUE,status text NOT NULL DEFAULT 'new',reply text NOT NULL DEFAULT '',replied_by text,replied_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.bot_support_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.bot_support_requests FROM anon,authenticated;
COMMIT;
