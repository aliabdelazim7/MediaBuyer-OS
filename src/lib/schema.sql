-- =====================================================================
-- MediaBuyer OS — Production Database Schema (Supabase / Postgres)
--
-- SECURITY MODEL
-- The browser holds the Supabase *anon* key, which is public by design.
-- Therefore Row Level Security is the ONLY thing standing between one
-- agency's data and another's. Every table below must have RLS enabled and
-- an explicit policy for every command it should permit. A table with RLS
-- enabled but no policy for a command denies that command (fail-closed); a
-- table with RLS *disabled* is world-readable with the anon key.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Case-insensitive email so 'A@x.com' and 'a@x.com' cannot become two leads.
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------------
-- 1. ORGANIZATIONS (multi-tenancy root)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       VARCHAR(255) NOT NULL,
    slug       VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 2. ORGANIZATION MEMBERS (RBAC)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organization_members (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role       VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'media_buyer', 'client_viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members (user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org  ON organization_members (org_id);

-- ---------------------------------------------------------------------
-- 3. PORTFOLIOS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portfolios (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name             VARCHAR(255) NOT NULL,
    category         VARCHAR(100) NOT NULL,
    client_name      VARCHAR(255) NOT NULL,
    -- CHECK constraints: a non-positive ROAS target or a negative cost target
    -- silently breaks the green/red evaluation logic in the UI.
    target_roas      NUMERIC(6, 2) NOT NULL DEFAULT 3.0  CHECK (target_roas > 0),
    target_cpa       NUMERIC(12, 2) NOT NULL DEFAULT 25.0 CHECK (target_cpa >= 0),
    target_cpl       NUMERIC(12, 2) NOT NULL DEFAULT 10.0 CHECK (target_cpl >= 0),
    target_hook_rate NUMERIC(5, 2) NOT NULL DEFAULT 30.0 CHECK (target_hook_rate BETWEEN 0 AND 100),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolios_org ON portfolios (org_id);

-- ---------------------------------------------------------------------
-- 4. AD ACCOUNTS
--
-- ⚠️ OAuth tokens do NOT belong here. This table is reachable with the anon
-- key, so a token column is one RLS mistake away from handing an attacker
-- full control of the client's ad accounts (and their ad budget). Tokens are
-- stored in `ad_account_secrets`, which is revoked from anon/authenticated
-- entirely and only readable by trusted server-side code.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ad_accounts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id        UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    external_account_id VARCHAR(255) NOT NULL,
    name                VARCHAR(255) NOT NULL,
    platform            VARCHAR(50) NOT NULL CHECK (platform IN ('meta', 'tiktok', 'google')),
    currency            CHAR(3) NOT NULL DEFAULT 'USD',
    status              VARCHAR(50) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'paused', 'warning')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Prevents the same platform account being linked twice, which would
    -- double-count its spend in every portfolio aggregate.
    UNIQUE (platform, external_account_id)
);

CREATE INDEX IF NOT EXISTS idx_ad_accounts_portfolio ON ad_accounts (portfolio_id);

CREATE TABLE IF NOT EXISTS ad_account_secrets (
    ad_account_id    UUID PRIMARY KEY REFERENCES ad_accounts(id) ON DELETE CASCADE,
    access_token     TEXT NOT NULL,
    refresh_token    TEXT,
    token_expires_at TIMESTAMPTZ,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 5. CAMPAIGNS
--
-- Raw counters are stored; every ratio is a GENERATED column so ROAS/CPA/CPL
-- can never disagree with the numbers they are derived from. Previously these
-- were plain columns written by the client, which let a partial update leave
-- (for example) revenue updated but ROAS stale.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaigns (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id         UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    ad_account_id        UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
    external_campaign_id VARCHAR(255) NOT NULL,
    name                 VARCHAR(255) NOT NULL,
    platform             VARCHAR(50) NOT NULL CHECK (platform IN ('meta', 'tiktok', 'google')),
    status               VARCHAR(50) NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'paused', 'warning')),

    daily_budget    NUMERIC(14, 2) NOT NULL CHECK (daily_budget > 0),
    spend           NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (spend >= 0),
    revenue         NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (revenue >= 0),
    cogs            NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (cogs >= 0),
    impressions     BIGINT NOT NULL DEFAULT 0 CHECK (impressions >= 0),
    clicks          BIGINT NOT NULL DEFAULT 0 CHECK (clicks >= 0),
    conversions     INT    NOT NULL DEFAULT 0 CHECK (conversions >= 0),
    leads_count     INT    NOT NULL DEFAULT 0 CHECK (leads_count >= 0),
    video_3s_views  BIGINT NOT NULL DEFAULT 0 CHECK (video_3s_views >= 0),
    video_15s_views BIGINT NOT NULL DEFAULT 0 CHECK (video_15s_views >= 0),
    fatigue_score   SMALLINT NOT NULL DEFAULT 0 CHECK (fatigue_score BETWEEN 0 AND 100),

    net_profit NUMERIC(14, 2) GENERATED ALWAYS AS (revenue - spend - cogs) STORED,
    roas       NUMERIC(14, 4) GENERATED ALWAYS AS
               (CASE WHEN spend > 0 THEN revenue / spend ELSE 0 END) STORED,
    cpa        NUMERIC(14, 4) GENERATED ALWAYS AS
               (CASE WHEN conversions > 0 THEN spend / conversions ELSE 0 END) STORED,
    cpl        NUMERIC(14, 4) GENERATED ALWAYS AS
               (CASE WHEN leads_count > 0 THEN spend / leads_count ELSE 0 END) STORED,
    ctr        NUMERIC(9, 4) GENERATED ALWAYS AS
               (CASE WHEN impressions > 0 THEN (clicks::NUMERIC / impressions) * 100 ELSE 0 END) STORED,
    cpm        NUMERIC(14, 4) GENERATED ALWAYS AS
               (CASE WHEN impressions > 0 THEN (spend / impressions) * 1000 ELSE 0 END) STORED,
    cpc        NUMERIC(14, 4) GENERATED ALWAYS AS
               (CASE WHEN clicks > 0 THEN spend / clicks ELSE 0 END) STORED,
    hook_rate  NUMERIC(9, 4) GENERATED ALWAYS AS
               (CASE WHEN impressions > 0 THEN (video_3s_views::NUMERIC / impressions) * 100 ELSE 0 END) STORED,
    hold_rate  NUMERIC(9, 4) GENERATED ALWAYS AS
               (CASE WHEN video_3s_views > 0 THEN (video_15s_views::NUMERIC / video_3s_views) * 100 ELSE 0 END) STORED,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (ad_account_id, external_campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_portfolio  ON campaigns (portfolio_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_account    ON campaigns (ad_account_id);
-- The dashboard's default view is "active campaigns in this portfolio".
CREATE INDEX IF NOT EXISTS idx_campaigns_portfolio_status
    ON campaigns (portfolio_id, status);

-- ---------------------------------------------------------------------
-- 6. LEADS (CRM pipeline)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id    UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    campaign_id     UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    -- Platform's own lead id. Webhooks retry aggressively; without this the
    -- same lead is inserted repeatedly and inflates leads_count / CPL.
    external_lead_id VARCHAR(255),
    name            VARCHAR(255) NOT NULL,
    email           CITEXT NOT NULL,
    phone           VARCHAR(100),
    source_platform VARCHAR(50) NOT NULL CHECK (source_platform IN ('meta', 'tiktok', 'google')),
    status          VARCHAR(50) NOT NULL DEFAULT 'registered'
                    CHECK (status IN ('registered', 'qualified', 'closed')),
    estimated_value NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (estimated_value >= 0),
    closed_value    NUMERIC(14, 2) CHECK (closed_value IS NULL OR closed_value >= 0),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- A lead may only be 'closed' with a recorded value; otherwise closed
    -- revenue reporting silently under-counts.
    CONSTRAINT closed_leads_need_value
        CHECK (status <> 'closed' OR closed_value IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_external
    ON leads (source_platform, external_lead_id)
    WHERE external_lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_portfolio_status ON leads (portfolio_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_campaign         ON leads (campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_created          ON leads (created_at DESC);

-- ---------------------------------------------------------------------
-- 7. AUDIT LOGS (append-only financial action ledger)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name     VARCHAR(255) NOT NULL,
    action_type   VARCHAR(100) NOT NULL,
    target_entity VARCHAR(100) NOT NULL,
    entity_id     VARCHAR(255) NOT NULL,
    old_value     TEXT,
    new_value     TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_org_created ON audit_logs (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity      ON audit_logs (target_entity, entity_id);

-- The ledger is only append-only if the database enforces it. Policies alone
-- are not enough because a compromised service_role key bypasses RLS.
CREATE OR REPLACE FUNCTION reject_audit_mutation() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();

-- ---------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['portfolios', 'campaigns', 'leads', 'ad_account_secrets'] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_touch_%1$s ON %1$I', t);
        EXECUTE format(
            'CREATE TRIGGER trg_touch_%1$s BEFORE UPDATE ON %1$I
             FOR EACH ROW EXECUTE FUNCTION touch_updated_at()', t);
    END LOOP;
END $$;

-- =====================================================================
-- ROW LEVEL SECURITY
--
-- Previously RLS was enabled on only four tables and each had a SELECT policy
-- and nothing else. Consequences:
--   * organizations / organization_members / ad_accounts had RLS OFF, so any
--     holder of the public anon key could enumerate every tenant and read
--     `ad_accounts.access_token` — full takeover of every connected ad
--     account.
--   * The four protected tables had no INSERT/UPDATE/DELETE policies, so
--     every write from the app was silently rejected.
-- =====================================================================

ALTER TABLE organizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_accounts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_account_secrets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns            ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;

-- Secrets are never exposed to the client roles at all. No policy is defined,
-- so RLS denies everything; grants are revoked as defence in depth.
REVOKE ALL ON ad_account_secrets FROM anon, authenticated;

-- Helper functions. SECURITY DEFINER + a pinned search_path so the membership
-- lookup inside a policy cannot itself be filtered by that policy (which would
-- recurse), and cannot be hijacked by a caller-controlled search_path.
CREATE OR REPLACE FUNCTION current_org_ids()
RETURNS SETOF UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT org_id FROM organization_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION has_org_role(target_org UUID, allowed TEXT[])
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT EXISTS (
        SELECT 1 FROM organization_members
        WHERE user_id = auth.uid() AND org_id = target_org AND role = ANY(allowed)
    );
$$;

-- Writers are owners and media buyers; client_viewer is read-only.
CREATE OR REPLACE FUNCTION can_write_org(target_org UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE AS $$
    SELECT has_org_role(target_org, ARRAY['owner', 'media_buyer']);
$$;

CREATE OR REPLACE FUNCTION portfolio_org(p UUID)
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT org_id FROM portfolios WHERE id = p;
$$;

-- --- organizations ---------------------------------------------------
DROP POLICY IF EXISTS org_select ON organizations;
CREATE POLICY org_select ON organizations FOR SELECT
    USING (id IN (SELECT current_org_ids()));

DROP POLICY IF EXISTS org_update ON organizations;
CREATE POLICY org_update ON organizations FOR UPDATE
    USING (has_org_role(id, ARRAY['owner']))
    WITH CHECK (has_org_role(id, ARRAY['owner']));

-- --- organization_members --------------------------------------------
DROP POLICY IF EXISTS members_select ON organization_members;
CREATE POLICY members_select ON organization_members FOR SELECT
    USING (org_id IN (SELECT current_org_ids()));

DROP POLICY IF EXISTS members_write ON organization_members;
CREATE POLICY members_write ON organization_members FOR ALL
    USING (has_org_role(org_id, ARRAY['owner']))
    WITH CHECK (has_org_role(org_id, ARRAY['owner']));

-- --- portfolios ------------------------------------------------------
DROP POLICY IF EXISTS portfolios_select ON portfolios;
CREATE POLICY portfolios_select ON portfolios FOR SELECT
    USING (org_id IN (SELECT current_org_ids()));

DROP POLICY IF EXISTS portfolios_write ON portfolios;
CREATE POLICY portfolios_write ON portfolios FOR ALL
    USING (can_write_org(org_id))
    WITH CHECK (can_write_org(org_id));

-- --- ad_accounts -----------------------------------------------------
DROP POLICY IF EXISTS ad_accounts_select ON ad_accounts;
CREATE POLICY ad_accounts_select ON ad_accounts FOR SELECT
    USING (portfolio_org(portfolio_id) IN (SELECT current_org_ids()));

DROP POLICY IF EXISTS ad_accounts_write ON ad_accounts;
CREATE POLICY ad_accounts_write ON ad_accounts FOR ALL
    USING (can_write_org(portfolio_org(portfolio_id)))
    WITH CHECK (can_write_org(portfolio_org(portfolio_id)));

-- --- campaigns -------------------------------------------------------
DROP POLICY IF EXISTS campaigns_select ON campaigns;
CREATE POLICY campaigns_select ON campaigns FOR SELECT
    USING (portfolio_org(portfolio_id) IN (SELECT current_org_ids()));

DROP POLICY IF EXISTS campaigns_write ON campaigns;
CREATE POLICY campaigns_write ON campaigns FOR ALL
    USING (can_write_org(portfolio_org(portfolio_id)))
    WITH CHECK (can_write_org(portfolio_org(portfolio_id)));

-- --- leads -----------------------------------------------------------
DROP POLICY IF EXISTS leads_select ON leads;
CREATE POLICY leads_select ON leads FOR SELECT
    USING (portfolio_org(portfolio_id) IN (SELECT current_org_ids()));

DROP POLICY IF EXISTS leads_write ON leads;
CREATE POLICY leads_write ON leads FOR ALL
    USING (can_write_org(portfolio_org(portfolio_id)))
    WITH CHECK (can_write_org(portfolio_org(portfolio_id)));

-- --- audit_logs ------------------------------------------------------
-- Readable by the org, insertable by the org, never updatable or deletable
-- (no UPDATE/DELETE policy + the immutability trigger above).
DROP POLICY IF EXISTS audit_select ON audit_logs;
CREATE POLICY audit_select ON audit_logs FOR SELECT
    USING (org_id IN (SELECT current_org_ids()));

DROP POLICY IF EXISTS audit_insert ON audit_logs;
CREATE POLICY audit_insert ON audit_logs FOR INSERT
    WITH CHECK (org_id IN (SELECT current_org_ids()));
