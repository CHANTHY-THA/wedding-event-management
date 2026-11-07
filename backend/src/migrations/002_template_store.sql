-- Invitation template store: catalogue, orders, payments and what each wedding owns.

CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  -- US cents. The price charged always comes from here, never from the browser.
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  -- Price before a promotion, shown struck through when higher than price_cents.
  list_price_cents INTEGER NOT NULL CHECK (list_price_cents >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  on_sale BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO templates (id, name, description, price_cents, list_price_cents, sort_order) VALUES
  ('split', 'Split photo & paper', 'Your photo beside a cream panel with gold lettering.', 0, 0, 1),
  ('overlay', 'Photo overlay', 'A full photo cover with gold names inside a gold frame.', 1299, 1499, 2),
  ('floral', 'Classic floral cream', 'Cream watercolour paper, green leaves and an arched photo.', 999, 1199, 3),
  ('royal', 'Royal night gold', 'Deep navy with an ornate gold border and a round photo.', 2549, 2999, 4);

-- The design guests see. Free templates (price 0) can always be chosen.
ALTER TABLE weddings
  ADD COLUMN active_template_id TEXT NOT NULL DEFAULT 'split' REFERENCES templates (id);

CREATE TABLE orders (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Shown to the buyer and written in the transfer note, e.g. VW-3F9A12BC.
  reference TEXT NOT NULL UNIQUE,
  wedding_id INTEGER NOT NULL REFERENCES weddings (id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES templates (id),
  created_by INTEGER REFERENCES users (id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'KHR')),
  -- pending: waiting for payment; paid: confirmed, template granted; expired: QR ran out unpaid;
  -- failed: the provider refused it; review: money arrived but does not match, check by hand.
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'expired', 'failed', 'review')),
  provider TEXT NOT NULL,
  -- The provider's id for this payment (KHQR md5, PayWay transaction id...).
  provider_ref TEXT,
  qr_string TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX orders_wedding_id_idx ON orders (wedding_id);
CREATE INDEX orders_pending_idx ON orders (expires_at) WHERE status = 'pending';
CREATE UNIQUE INDEX orders_provider_ref_idx ON orders (provider, provider_ref)
  WHERE provider_ref IS NOT NULL;

-- Templates a wedding has bought. One row per pair, so a payment can never grant twice.
CREATE TABLE entitlements (
  wedding_id INTEGER NOT NULL REFERENCES weddings (id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES templates (id),
  order_id INTEGER REFERENCES orders (id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (wedding_id, template_id)
);

-- Everything the payment provider told us, kept for audits and disputes.
CREATE TABLE payment_events (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payment_events_order_id_idx ON payment_events (order_id);

-- Guest invitation links, so a guest's page can show the template their couple chose.
-- (The full guest list moves here in a later step; for now only the link and the name.)
CREATE TABLE guests (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  wedding_id INTEGER NOT NULL REFERENCES weddings (id) ON DELETE CASCADE,
  invitation_token TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);
