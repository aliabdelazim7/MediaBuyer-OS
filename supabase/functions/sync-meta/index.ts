/**
 * sync-meta — pulls campaign insights from the Meta Marketing API into the
 * database, provisioning portfolios and ad accounts on first run.
 *
 * WHY THIS RUNS ON THE SERVER
 * The Meta access token grants read access to every connected ad account. It
 * is read from an Edge Function secret and never leaves this process.
 * Nothing token-shaped is returned to the browser, and the token must never
 * live in a VITE_-prefixed variable — those are compiled into the public
 * bundle that every visitor downloads.
 *
 * WHY IT IS READ-ONLY AGAINST META
 * This never writes to Meta. Budget and status changes happen in Ads
 * Manager. A local "apply" would show a change Meta never received, and the
 * next sync would silently revert it — the dashboard would report a
 * scale-up that never happened.
 *
 * Deploy:  supabase functions deploy sync-meta
 * Secret:  supabase secrets set META_ACCESS_TOKEN=...
 */

const META_API_VERSION = 'v21.0';
const GRAPH = `https://graph.facebook.com/${META_API_VERSION}`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

type Action = { action_type: string; value: string };

interface MetaInsight {
  campaign_id: string;
  campaign_name: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: Action[];
  action_values?: Action[];
  video_3_sec_watched_actions?: Action[];
  video_p50_watched_actions?: Action[];
}

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

const num = (v: string | undefined): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const sumActions = (actions: Action[] | undefined, match: (t: string) => boolean): number =>
  (actions ?? []).filter((a) => match(a.action_type)).reduce((t, a) => t + num(a.value), 0);

// Purchases drive ROAS/CPA; leads are counted separately because a lead-gen
// campaign has no purchase events and would otherwise read as zero.
const isPurchase = (t: string) => t === 'purchase' || t === 'offsite_conversion.fb_pixel_purchase';
const isLead = (t: string) => t === 'lead' || t === 'onsite_conversion.lead_grouped';

/** Meta reports budgets in minor units (piasters/cents). */
const fromMinorUnits = (v: string | undefined): number => num(v) / 100;

const META_STATUS: Record<string, string> = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  ARCHIVED: 'paused',
  DELETED: 'paused',
};

/**
 * The client-side key for this project.
 *
 * SUPABASE_ANON_KEY is marked deprecated in favour of
 * SUPABASE_PUBLISHABLE_KEYS, a JSON dictionary. Both are read so the
 * function keeps working on projects issued either way, rather than failing
 * at runtime once the legacy variable is withdrawn.
 *
 * Note this key grants nothing on its own — the caller's JWT is what
 * authorises the reads and writes below, and RLS still applies.
 */
function publishableKey(): string {
  const legacy = Deno.env.get('SUPABASE_ANON_KEY');
  if (legacy) return legacy;

  const raw = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const first = Array.isArray(parsed)
        ? parsed.find((v) => typeof v === 'string')
        : Object.values(parsed).find((v) => typeof v === 'string');
      if (typeof first === 'string') return first;
    } catch {
      // Not JSON — some projects expose it as a bare string.
      return raw;
    }
  }

  throw new Error(
    'No publishable key available (checked SUPABASE_ANON_KEY and SUPABASE_PUBLISHABLE_KEYS)',
  );
}

async function metaFetch<T>(path: string, params: Record<string, string>, token: string): Promise<T> {
  const url = new URL(`${GRAPH}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('access_token', token);

  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) {
    const e = body?.error ?? {};
    // Surfaces Meta's message without ever echoing the token back.
    throw new Error(`Meta API ${res.status}: ${e.message ?? 'unknown'}${e.code ? ` (code ${e.code})` : ''}`);
  }
  return body as T;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const token = Deno.env.get('META_ACCESS_TOKEN');
    if (!token) {
      return json(
        {
          error: 'META_ACCESS_TOKEN غير مضبوط',
          hint: 'Supabase → Edge Functions → Secrets → أضف META_ACCESS_TOKEN',
        },
        500,
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    // The caller's own JWT is forwarded, so every write below stays subject
    // to the same RLS policies the browser is. The service_role key is
    // deliberately not used: a bug here must not be able to cross tenants.
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, publishableKey(), {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'Not authenticated' }, 401);

    const { data: org, error: orgErr } = await supabase
      .from('my_organization')
      .select('id')
      .maybeSingle();
    if (orgErr || !org) {
      return json({ error: 'المستخدم مش مرتبط بأي مؤسسة', detail: orgErr?.message }, 400);
    }

    const { datePreset = 'last_30d', dryRun = false } = await req
      .json()
      .catch(() => ({}) as Record<string, unknown>);

    // ---- 1. Ad accounts the token can actually reach -------------------
    const accounts = await metaFetch<{
      data: { id: string; account_id: string; name: string; currency: string }[];
    }>('me/adaccounts', { fields: 'id,account_id,name,currency', limit: '100' }, token);

    if (!accounts.data?.length) {
      return json(
        {
          error: 'التوكن مش واصل لأي حساب إعلاني',
          hint: 'Business settings → System Users → Add Assets → Ad Accounts',
        },
        400,
      );
    }

    const summary: {
      account: string;
      currency: string;
      campaigns: number;
      portfolioId?: string;
    }[] = [];
    const warnings: string[] = [];
    let totalCampaigns = 0;

    for (const account of accounts.data) {
      // ---- 2. Provision a portfolio per ad account --------------------
      // One portfolio per Meta account matches how buyers think: an account
      // is a client. They can be renamed and regrouped later.
      let portfolioId: string | undefined;

      const { data: existingAcc } = await supabase
        .from('ad_accounts')
        .select('id, portfolio_id')
        .eq('platform', 'meta')
        .eq('external_account_id', account.account_id)
        .maybeSingle();

      if (existingAcc) {
        portfolioId = existingAcc.portfolio_id;
      } else {
        const { data: newPortfolio, error: pErr } = await supabase
          .from('portfolios')
          .insert({ org_id: org.id, name: account.name, category: 'Meta', client_name: account.name })
          .select('id')
          .single();
        if (pErr) {
          warnings.push(`تعذر إنشاء محفظة لحساب ${account.name}: ${pErr.message}`);
          continue;
        }
        portfolioId = newPortfolio.id;
      }

      const { data: adAccount, error: aErr } = await supabase
        .from('ad_accounts')
        .upsert(
          {
            portfolio_id: portfolioId,
            external_account_id: account.account_id,
            name: account.name,
            platform: 'meta',
            currency: account.currency,
          },
          { onConflict: 'platform,external_account_id' },
        )
        .select('id')
        .single();
      if (aErr || !adAccount) {
        warnings.push(`تعذر حفظ الحساب ${account.name}: ${aErr?.message}`);
        continue;
      }

      // The dashboard's currency conversion treats stored amounts as USD.
      // Silently storing EGP as USD would overstate revenue ~48x, so this is
      // reported rather than guessed at.
      if (account.currency !== 'USD') {
        warnings.push(
          `حساب ${account.name} بعملة ${account.currency} — الأرقام متخزنة بعملتها الأصلية، والتحويل للدولار لسه مش مفعّل.`,
        );
      }

      // ---- 3. Budgets and status (insights do not carry them) ---------
      const campaignMeta = await metaFetch<{ data: MetaCampaign[] }>(
        `${account.id}/campaigns`,
        { fields: 'id,name,status,daily_budget,lifetime_budget', limit: '500' },
        token,
      );
      const byId = new Map(campaignMeta.data?.map((c) => [c.id, c]) ?? []);

      // ---- 4. Insights -------------------------------------------------
      const insights = await metaFetch<{ data: MetaInsight[] }>(
        `${account.id}/insights`,
        {
          level: 'campaign',
          date_preset: String(datePreset),
          limit: '500',
          fields: [
            'campaign_id',
            'campaign_name',
            'spend',
            'impressions',
            'clicks',
            'actions',
            'action_values',
            'video_3_sec_watched_actions',
            'video_p50_watched_actions',
          ].join(','),
        },
        token,
      );

      const rows = (insights.data ?? []).map((i) => {
        const meta = byId.get(i.campaign_id);
        // daily_budget is absent on campaigns using a lifetime budget or
        // ad-set-level budgets; the column is NOT NULL and CHECK > 0.
        const daily = fromMinorUnits(meta?.daily_budget) || fromMinorUnits(meta?.lifetime_budget) || 1;
        return {
          portfolio_id: portfolioId,
          ad_account_id: adAccount.id,
          external_campaign_id: i.campaign_id,
          name: i.campaign_name,
          platform: 'meta',
          status: META_STATUS[meta?.status ?? 'ACTIVE'] ?? 'active',
          daily_budget: daily,
          spend: num(i.spend),
          revenue: sumActions(i.action_values, isPurchase),
          impressions: num(i.impressions),
          clicks: num(i.clicks),
          conversions: sumActions(i.actions, isPurchase),
          leads_count: sumActions(i.actions, isLead),
          video_3s_views: sumActions(i.video_3_sec_watched_actions, () => true),
          video_15s_views: sumActions(i.video_p50_watched_actions, () => true),
          updated_at: new Date().toISOString(),
          // `cogs` is deliberately omitted from the upsert payload so a
          // hand-entered value survives every sync. Meta does not know what
          // the product costs, and that number is the only reason net profit
          // and break-even ROAS can be computed at all.
        };
      });

      if (rows.length && !dryRun) {
        const { error: cErr } = await supabase
          .from('campaigns')
          .upsert(rows, { onConflict: 'ad_account_id,external_campaign_id' });
        if (cErr) warnings.push(`تعذر حفظ حملات ${account.name}: ${cErr.message}`);
      }

      totalCampaigns += rows.length;
      summary.push({
        account: account.name,
        currency: account.currency,
        campaigns: rows.length,
        portfolioId,
      });
    }

    return json({
      ok: true,
      dryRun,
      accounts: summary,
      campaignsSynced: totalCampaigns,
      warnings,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'sync failed' }, 500);
  }
});
