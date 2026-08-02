-- MediaBuyer OS - Production Database Schema (Supabase Postgres)

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANIZATIONS (Multi-Tenancy)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ORGANIZATION MEMBERS (RBAC: Owner, Media Buyer, Client Viewer)
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'media_buyer', 'client_viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(org_id, user_id)
);

-- 3. PORTFOLIOS
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    target_roas NUMERIC(5, 2) DEFAULT 3.0,
    target_cpa NUMERIC(10, 2) DEFAULT 25.0,
    target_cpl NUMERIC(10, 2) DEFAULT 10.0,
    target_hook_rate NUMERIC(5, 2) DEFAULT 30.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. AD ACCOUNTS
CREATE TABLE IF NOT EXISTS ad_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    external_account_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('meta', 'tiktok', 'google')),
    currency VARCHAR(10) DEFAULT 'USD',
    access_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'active'
);

-- 5. CAMPAIGNS
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    ad_account_id UUID REFERENCES ad_accounts(id) ON DELETE CASCADE,
    external_campaign_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    daily_budget NUMERIC(12, 2) NOT NULL,
    spend NUMERIC(12, 2) DEFAULT 0,
    revenue NUMERIC(12, 2) DEFAULT 0,
    cogs NUMERIC(12, 2) DEFAULT 0,
    net_profit NUMERIC(12, 2) DEFAULT 0,
    roas NUMERIC(8, 2) DEFAULT 0,
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    conversions INT DEFAULT 0,
    cpa NUMERIC(10, 2) DEFAULT 0,
    leads_count INT DEFAULT 0,
    cpl NUMERIC(10, 2) DEFAULT 0,
    video_3s_views BIGINT DEFAULT 0,
    video_15s_views BIGINT DEFAULT 0,
    hook_rate NUMERIC(5, 2) DEFAULT 0,
    hold_rate NUMERIC(5, 2) DEFAULT 0,
    fatigue_score INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. LEADS (CRM Pipeline)
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(100),
    source_platform VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'registered' CHECK (status IN ('registered', 'qualified', 'closed')),
    estimated_value NUMERIC(12, 2) DEFAULT 0,
    closed_value NUMERIC(12, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. AUDIT LOGS (Immutable Financial Action Ledger)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    target_entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view data belonging to their organization
CREATE POLICY "Portfolios visible to org members" ON portfolios
    FOR SELECT USING (
        org_id IN (
            SELECT org_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Campaigns visible to org members" ON campaigns
    FOR SELECT USING (
        portfolio_id IN (
            SELECT id FROM portfolios WHERE org_id IN (
                SELECT org_id FROM organization_members WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Leads visible to org members" ON leads
    FOR SELECT USING (
        portfolio_id IN (
            SELECT id FROM portfolios WHERE org_id IN (
                SELECT org_id FROM organization_members WHERE user_id = auth.uid()
            )
        )
    );
