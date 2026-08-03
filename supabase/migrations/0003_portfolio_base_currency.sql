-- =====================================================================
-- Base currency per portfolio
--
-- Amounts are stored exactly as the ad platform reports them, in the ad
-- account's own currency. Converting at write time would bake a single
-- exchange rate permanently into historical rows, so the rate a figure was
-- recorded at could never be corrected.
--
-- The dashboard previously assumed every stored amount was USD and
-- converted outward from there. For an EGP ad account that overstates every
-- figure by roughly 48x — a campaign that spent 5,000 EGP would have been
-- displayed as $5,000 instead of about $103.
-- =====================================================================

ALTER TABLE portfolios
    ADD COLUMN IF NOT EXISTS base_currency CHAR(3) NOT NULL DEFAULT 'USD';

COMMENT ON COLUMN portfolios.base_currency IS
    'Currency the stored amounts are denominated in — taken from the ad account. Display conversion happens in the UI, not at write time.';
