BEGIN;
CREATE TABLE IF NOT EXISTS settings (id integer PRIMARY KEY CHECK(id=1), data jsonb NOT NULL);
INSERT INTO settings VALUES (1, '{"name":"Мой магазин","description":"Ваши находки — в одном месте","theme":"blue","glow":"blue","referral_reward":0,"purchase_percent":0,"banners":[]}') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS ownership (id integer PRIMARY KEY CHECK(id=1), owner_id text NOT NULL);
CREATE TABLE IF NOT EXISTS profiles (
 id text PRIMARY KEY, first_name text NOT NULL, last_name text NOT NULL DEFAULT '', username text NOT NULL DEFAULT '', photo_url text NOT NULL DEFAULT '',
 role text NOT NULL DEFAULT 'buyer' CHECK(role IN ('buyer','deputy')), theme text CHECK(theme IN ('blue','purple','pink')),
 referred_by text REFERENCES profiles(id), created_at timestamptz NOT NULL DEFAULT now(), last_seen timestamptz NOT NULL DEFAULT now(), CHECK(referred_by IS DISTINCT FROM id)
);
CREATE TABLE IF NOT EXISTS categories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, parent_id uuid REFERENCES categories(id) ON DELETE RESTRICT);
CREATE TABLE IF NOT EXISTS products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, description text NOT NULL DEFAULT '', price integer NOT NULL CHECK(price>0),
 stock integer NOT NULL CHECK(stock>=0), category_id uuid REFERENCES categories(id) ON DELETE RESTRICT, image_url text NOT NULL DEFAULT '', active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL REFERENCES profiles(id), items jsonb NOT NULL, total integer NOT NULL CHECK(total>0),
 status text NOT NULL DEFAULT 'awaiting_payment_setup' CHECK(status IN ('awaiting_payment_setup','pending','paid','shipped','completed','cancelled','refunded')),
 contact text NOT NULL, address text NOT NULL, idempotency_key uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS bonus_ledger (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL REFERENCES profiles(id), amount integer NOT NULL, reason text NOT NULL,
 source text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS media (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), data text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS audit_log (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id text NOT NULL REFERENCES profiles(id), action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS referrals_idx ON profiles(referred_by);
CREATE INDEX IF NOT EXISTS ledger_user_idx ON bonus_ledger(user_id);
COMMIT;
