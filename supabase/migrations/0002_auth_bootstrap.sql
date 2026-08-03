-- =====================================================================
-- Signup bootstrap
--
-- Run this AFTER schema.sql.
--
-- Why this is required: every RLS policy resolves through
-- organization_members. A user who signs up but belongs to no organisation
-- passes authentication and still sees nothing at all — every table returns
-- an empty array, which looks exactly like a broken sync. This trigger gives
-- each new user an organisation and an owner membership so their account
-- works the moment it is created.
-- =====================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    new_org_id UUID;
    base_slug  TEXT;
    final_slug TEXT;
    suffix     INT := 0;
BEGIN
    -- Slug from the email local part, de-accented to something URL-safe.
    base_slug := regexp_replace(lower(split_part(NEW.email, '@', 1)), '[^a-z0-9]+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    IF base_slug = '' THEN base_slug := 'org'; END IF;

    -- organizations.slug is UNIQUE; two users named info@... would collide.
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = final_slug) LOOP
        suffix := suffix + 1;
        final_slug := base_slug || '-' || suffix;
    END LOOP;

    INSERT INTO organizations (name, slug)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'org_name', base_slug), final_slug)
    RETURNING id INTO new_org_id;

    INSERT INTO organization_members (org_id, user_id, role)
    VALUES (new_org_id, NEW.id, 'owner');

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---------------------------------------------------------------------
-- Backfill: any user who signed up before this trigger existed.
-- ---------------------------------------------------------------------
DO $$
DECLARE
    u RECORD;
    new_org_id UUID;
    s TEXT;
    n INT;
BEGIN
    FOR u IN
        SELECT au.id, au.email
        FROM auth.users au
        LEFT JOIN organization_members m ON m.user_id = au.id
        WHERE m.id IS NULL
    LOOP
        s := trim(both '-' from regexp_replace(lower(split_part(u.email, '@', 1)), '[^a-z0-9]+', '-', 'g'));
        IF s = '' THEN s := 'org'; END IF;
        n := 0;
        WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = s) LOOP
            n := n + 1;
            s := s || '-' || n;
        END LOOP;

        INSERT INTO organizations (name, slug) VALUES (s, s) RETURNING id INTO new_org_id;
        INSERT INTO organization_members (org_id, user_id, role) VALUES (new_org_id, u.id, 'owner');
    END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- Convenience view: the caller's own organisation.
-- Saves the client a round trip on every page load.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW my_organization
WITH (security_invoker = true) AS
    SELECT o.id, o.name, o.slug, m.role
    FROM organizations o
    JOIN organization_members m ON m.org_id = o.id
    WHERE m.user_id = auth.uid();

GRANT SELECT ON my_organization TO authenticated;
