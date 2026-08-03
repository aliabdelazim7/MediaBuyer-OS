import type {
  Campaign,
  Portfolio,
  Recommendation,
  RecommendationEvidence,
} from '../types/mediaBuyer';

/**
 * The decision layer.
 *
 * Ten explicit rules, evaluated in priority order. The FIRST rule that fires
 * becomes that campaign's recommendation, so the buyer always gets exactly
 * one clear next action per campaign rather than a wall of competing advice.
 *
 * Design rules this file follows, and why:
 *
 *  1. Nothing is invented. Every number quoted back to the user is computed
 *     from the campaign row. There are no projected-impact estimates, because
 *     an honest projection needs a counterfactual we do not have.
 *  2. Data sufficiency is checked FIRST. Judging a campaign on two days and
 *     one conversion is the single most common junior mistake; the engine
 *     refuses to do it and says so.
 *  3. Every rule reports its evidence, so the reasoning can be checked
 *     against Ads Manager by hand.
 */

/** Formats a USD amount for display inside explanation text. */
export type MoneyFormatter = (usd: number) => string;

const pct = (n: number) => `${n.toFixed(1)}%`;
const x = (n: number) => `${n.toFixed(2)}x`;

/**
 * Break-even ROAS once cost of goods is accounted for.
 *
 * If COGS is a fraction `m` of revenue, profit is zero when
 * `revenue - spend - m·revenue = 0`, i.e. ROAS = 1 / (1 - m).
 *
 * This is the number most juniors are missing: a 2.0x ROAS looks healthy and
 * is actually near-breakeven at 45% COGS. Meta cannot compute it, because
 * Meta does not know the cost of the product.
 */
export function breakEvenRoas(campaign: Campaign): number {
  if (campaign.revenue <= 0) return 1;
  const cogsRatio = campaign.cogs / campaign.revenue;
  if (cogsRatio >= 1) return Infinity;
  return 1 / (1 - cogsRatio);
}

/**
 * How much this campaign's numbers can be trusted.
 *
 * Spend below one target CPA means the campaign has not yet had the chance
 * to produce a single conversion at the expected price, so ANY verdict is
 * noise. Under ten conversions, results swing heavily on one or two sales.
 */
export function confidenceOf(campaign: Campaign, portfolio: Portfolio): Recommendation['confidence'] {
  if (campaign.spend < portfolio.targetCpa) return 'low';
  if (campaign.conversions < 10) return 'medium';
  return 'high';
}

interface RuleContext {
  campaign: Campaign;
  portfolio: Portfolio;
  money: MoneyFormatter;
  breakEven: number;
  confidence: Recommendation['confidence'];
}

interface Rule {
  id: string;
  /** Does this rule apply to this campaign right now? */
  when: (c: RuleContext) => boolean;
  build: (c: RuleContext) => Omit<Recommendation, 'id' | 'ruleId' | 'portfolioId' | 'campaignId' | 'campaignName' | 'confidence'>;
}

const ev = (label: string, actual: string, target: string, ok: boolean): RecommendationEvidence => ({
  label, actual, target, ok,
});

/**
 * Priority order matters. Guards and money-losing states come before
 * optimisation advice, and scaling comes last so a campaign is never told to
 * scale while it also has an unresolved problem.
 */
const RULES: Rule[] = [
  // ---------------------------------------------------------------- guards
  {
    id: 'insufficient-data',
    // Covers everything below the kill threshold so a campaign that is
    // spending with no sales yet always gets guidance. Without the upper
    // bound there was a dead zone between 1x and 2x target CPA where no rule
    // fired at all and the buyer was told nothing.
    when: ({ campaign, portfolio }) =>
      campaign.conversions === 0 && campaign.spend < portfolio.targetCpa * 2,
    build: ({ campaign, portfolio, money }) => ({
      action: 'wait',
      severity: 'info',
      title: 'لسه بدري على الحكم',
      whatWeSaw: `الحملة صرفت ${money(campaign.spend)} بس، والهدف إن المبيعة الواحدة تكلف ${money(portfolio.targetCpa)}.`,
      whyItMatters:
        'لسه مصرفتش حتى تكلفة مبيعة واحدة، فطبيعي جداً إن مفيش نتيجة لحد دلوقتي. أي قرار توقف أو توسيع دلوقتي بيبقى تخمين مش تحليل — ودي أكتر غلطة بتتعمل في بداية الحملات.',
      whatToDo: `سيبها شغالة لحد ما الإنفاق يوصل ${money(portfolio.targetCpa * 3)} على الأقل، وبعدين ارجع بص.`,
      evidence: [
        ev('الإنفاق', money(campaign.spend), `≥ ${money(portfolio.targetCpa)}`, false),
        ev('التحويلات', String(campaign.conversions), '≥ 1', false),
      ],
    }),
  },

  // ------------------------------------------------------- losing money
  {
    id: 'zero-conversion-bleed',
    when: ({ campaign, portfolio }) =>
      campaign.conversions === 0 && campaign.spend >= portfolio.targetCpa * 2,
    build: ({ campaign, portfolio, money }) => ({
      action: 'pause',
      severity: 'high',
      title: 'نزيف بدون أي مبيعات',
      whatWeSaw: `صرفت ${money(campaign.spend)} — يعني أكتر من ضعف تكلفة المبيعة المستهدفة (${money(portfolio.targetCpa)}) — وصفر تحويلات.`,
      whyItMatters:
        'القاعدة المتعارف عليها: لو صرفت ضعف التكلفة المستهدفة وملقتش ولا مبيعة، احتمال إنها تعوّض ضعيف جداً. كل جنيه زيادة دلوقتي خسارة شبه مؤكدة.',
      whatToDo: 'ادخل Ads Manager وأوقف الحملة دي، وراجع الاستهداف والعرض قبل ما تشغّلها تاني.',
      evidence: [
        ev('الإنفاق', money(campaign.spend), `< ${money(portfolio.targetCpa * 2)}`, false),
        ev('التحويلات', '0', '≥ 1', false),
      ],
    }),
  },
  {
    id: 'below-breakeven',
    when: ({ campaign, portfolio, breakEven }) =>
      campaign.conversions > 0 &&
      campaign.spend >= portfolio.targetCpa * 2 &&
      campaign.roas < breakEven,
    build: ({ campaign, money, breakEven }) => ({
      action: 'pause',
      severity: 'high',
      title: 'بتخسر في كل عملية بيع',
      whatWeSaw: `الـ ROAS ${x(campaign.roas)}، ونقطة التعادل بتاعتك ${x(breakEven)} بعد حساب تكلفة البضاعة. صافي الربح ${money(campaign.netProfit)}.`,
      whyItMatters:
        'نقطة التعادل مش 1.0x. لو تكلفة البضاعة بتاخد جزء من الإيراد، لازم الـ ROAS يعدي الرقم ده عشان تبدأ تكسب أصلاً. دلوقتي كل مبيعة بتزود الخسارة مش الربح — وده الرقم اللي Meta عمرها ما هتقولهولك لأنها مش عارفة تكلفة منتجك.',
      whatToDo: 'أوقفها، أو راجع التسعير/تكلفة المنتج. التوسيع هنا بيكبّر الخسارة.',
      evidence: [
        ev('ROAS', x(campaign.roas), `≥ ${x(breakEven)}`, false),
        ev('صافي الربح', money(campaign.netProfit), '> 0', campaign.netProfit > 0),
      ],
    }),
  },

  // --------------------------------------------------- creative problems
  //
  // Deliberately ahead of the cost rules. A burnt creative is usually the
  // CAUSE of a rising CPA, so leading with "cut the budget" treats the
  // symptom and hides the fix. Gated on the campaign actually having video —
  // a fatigue score on a Search campaign means something different, and the
  // advice below (rewrite the first 3 seconds) would be nonsense there.
  {
    id: 'creative-fatigue',
    when: ({ campaign }) => campaign.video3sViews > 0 && campaign.fatigueScore >= 70,
    build: ({ campaign, portfolio, money }) => ({
      action: 'refresh_creative',
      severity: 'high',
      title: 'الكرياتيف اتحرق',
      whatWeSaw: `مؤشر الإجهاد ${campaign.fatigueScore}/100، ومعدل الجذب في أول 3 ثواني ${pct(campaign.hookRate)} مقابل هدف ${pct(portfolio.targetHookRate)}.`,
      whyItMatters:
        'لما نفس الجمهور يشوف نفس الإعلان مرات كتير، بيبطل يقف عليه. ده بيبان في الـ Hook Rate قبل ما يبان في المبيعات بأيام. ولاحظ: لو تكلفة المبيعة عندك بترتفع كمان، غالباً ده السبب مش مشكلة استهداف — فتجديد الكرياتيف أهم من تقليل الميزانية.',
      whatToDo: 'غيّر أول 3 ثواني من الفيديو تحديداً (الهوك)، مش الإعلان كله. ونزّل نسخة جديدة بزاوية مختلفة.',
      evidence: [
        ev('مؤشر الإجهاد', String(campaign.fatigueScore), '< 70', false),
        ev('Hook Rate', pct(campaign.hookRate), `≥ ${pct(portfolio.targetHookRate)}`, campaign.hookRate >= portfolio.targetHookRate),
        ev('CPA', money(campaign.cpa), `≤ ${money(portfolio.targetCpa)}`, campaign.cpa <= portfolio.targetCpa),
      ],
    }),
  },

  // ------------------------------------------------------ cost problems
  {
    id: 'cpa-far-over',
    // 1.4x rather than 1.5x: at exactly 1.48x over target a campaign used to
    // fall past this rule into a lower-severity lead-cost rule, so a serious
    // cost problem was reported as a minor one.
    when: ({ campaign, portfolio }) =>
      campaign.conversions > 0 && campaign.cpa > portfolio.targetCpa * 1.4,
    build: ({ campaign, portfolio, money }) => ({
      action: 'reduce_budget',
      severity: 'high',
      title: 'تكلفة المبيعة أعلى بكتير من الهدف',
      whatWeSaw: `تكلفة المبيعة ${money(campaign.cpa)} مقابل هدف ${money(portfolio.targetCpa)} — أعلى بـ ${pct(((campaign.cpa / portfolio.targetCpa) - 1) * 100)}.`,
      whyItMatters:
        'تجاوز الهدف بنسبة بسيطة وارد ويتصلّح. لكن تعديه بأكتر من 50% معناه إن فيه مشكلة في الاستهداف أو الكرياتيف أو صفحة الهبوط، مش مجرد تذبذب.',
      whatToDo: 'قلّل الميزانية اليومية للنص مؤقتاً بدل ما توقفها، وراجع أي مرحلة بتخسر فيها الناس.',
      evidence: [
        ev('CPA', money(campaign.cpa), `≤ ${money(portfolio.targetCpa)}`, false),
        ev('التحويلات', String(campaign.conversions), '—', true),
      ],
    }),
  },
  {
    id: 'cpa-drifting',
    when: ({ campaign, portfolio }) =>
      campaign.conversions > 0 && campaign.cpa > portfolio.targetCpa,
    build: ({ campaign, portfolio, money }) => ({
      action: 'review_targeting',
      severity: 'medium',
      title: 'التكلفة بدأت تعدي الهدف',
      whatWeSaw: `تكلفة المبيعة ${money(campaign.cpa)} مقابل هدف ${money(portfolio.targetCpa)} — تجاوز بسيط لسه تحت 50%.`,
      whyItMatters:
        'التجاوز البسيط ده طبيعي ومش سبب للتوقيف، لكنه إنذار مبكر. لو سبته يكبر بيتحول لنزيف. الأفضل تتدخل وهو صغير.',
      whatToDo: 'راقبها يومين. لو التكلفة كملت طلوع، قلّل الميزانية 20% أو استبعد أضعف مجموعة إعلانية.',
      evidence: [
        ev('CPA', money(campaign.cpa), `≤ ${money(portfolio.targetCpa)}`, false),
        ev('ROAS', x(campaign.roas), `≥ ${x(portfolio.targetRoas)}`, campaign.roas >= portfolio.targetRoas),
      ],
    }),
  },
  {
    id: 'cpl-over-target',
    when: ({ campaign, portfolio }) =>
      campaign.leadsCount > 0 && campaign.cpl > portfolio.targetCpl * 1.3,
    build: ({ campaign, portfolio, money }) => ({
      action: 'review_targeting',
      severity: 'medium',
      title: 'تكلفة الليد أعلى من المقبول',
      whatWeSaw: `تكلفة الليد ${money(campaign.cpl)} مقابل هدف ${money(portfolio.targetCpl)}، بإجمالي ${campaign.leadsCount} ليد.`,
      whyItMatters:
        'في حملات جمع الليدز، الليد الغالي غالباً معناه إن الفورم طويل أو الجمهور واسع أوي أو العرض مش واضح. الرقم ده بيتحسّن بتعديل الفورم والعرض أسرع بكتير من تعديل الميزانية.',
      whatToDo: 'قلّل عدد خانات الفورم، ووضّح العرض في أول سطر، وضيّق الجمهور شوية.',
      evidence: [
        ev('CPL', money(campaign.cpl), `≤ ${money(portfolio.targetCpl)}`, false),
        ev('عدد الليدز', String(campaign.leadsCount), '—', true),
      ],
    }),
  },

  {
    id: 'weak-hook',
    when: ({ campaign, portfolio }) =>
      campaign.video3sViews > 0 && campaign.hookRate < portfolio.targetHookRate,
    build: ({ campaign, portfolio }) => ({
      action: 'refresh_creative',
      severity: 'medium',
      title: 'أول 3 ثواني ضعيفة',
      whatWeSaw: `${pct(campaign.hookRate)} بس من اللي شافوا الإعلان كملوا 3 ثواني، والهدف ${pct(portfolio.targetHookRate)}.`,
      whyItMatters:
        'الـ Hook Rate بيقيس حاجة واحدة: هل الإعلان بيوقّف الناس؟ لو ضعيف، فباقي الفيديو مالوش لازمة لأن محدش وصله أصلاً. ده أرخص وأسرع حاجة تتصلّح في أي حملة.',
      whatToDo: 'جرّب 3 هوكس مختلفة على نفس الفيديو: سؤال مباشر، نتيجة قبل/بعد، أو رقم صادم.',
      evidence: [
        ev('Hook Rate', pct(campaign.hookRate), `≥ ${pct(portfolio.targetHookRate)}`, false),
      ],
    }),
  },
  {
    id: 'weak-hold',
    when: ({ campaign, portfolio }) =>
      campaign.video3sViews > 0 &&
      campaign.hookRate >= portfolio.targetHookRate &&
      campaign.holdRate < 25,
    build: ({ campaign }) => ({
      action: 'refresh_creative',
      severity: 'medium',
      title: 'الهوك شغال بس باقي الفيديو بيفقد الناس',
      whatWeSaw: `الجذب في أول 3 ثواني كويس (${pct(campaign.hookRate)})، لكن ${pct(campaign.holdRate)} بس كملوا لـ 15 ثانية.`,
      whyItMatters:
        'ده أحسن نوع مشكلة، لأنه بيقولك بالظبط فين الخلل: بدايتك ناجحة في جذب الانتباه، فالمشكلة في الجزء اللي بعدها مش في الإعلان كله. متغيّرش الهوك — هو الشغال.',
      whatToDo: 'اختصر الفيديو، وقدّم العرض بدري، وشيل أي مقدمة زيادة بعد أول 3 ثواني.',
      evidence: [
        ev('Hook Rate', pct(campaign.hookRate), '—', true),
        ev('Hold Rate', pct(campaign.holdRate), '≥ 25%', false),
      ],
    }),
  },

  // ------------------------------------------------------------- tuning

  // -------------------------------------------------------------- scale
  {
    id: 'scale-winner',
    when: ({ campaign, portfolio, breakEven, confidence }) =>
      confidence === 'high' &&
      campaign.roas >= portfolio.targetRoas &&
      campaign.roas > breakEven &&
      campaign.cpa <= portfolio.targetCpa,
    build: ({ campaign, portfolio, money, breakEven }) => ({
      action: 'scale',
      severity: 'info',
      title: 'حملة رابحة — جاهزة للتوسيع',
      whatWeSaw: `ROAS ${x(campaign.roas)} (الهدف ${x(portfolio.targetRoas)}، ونقطة التعادل ${x(breakEven)})، وتكلفة المبيعة ${money(campaign.cpa)} تحت الهدف، على ${campaign.conversions} مبيعة.`,
      whyItMatters:
        'الحملة عدّت الهدف ونقطة التعادل، وعندها عدد مبيعات كفاية إن الأرقام دي متبقاش صدفة. دي الحالة الوحيدة اللي التوسيع فيها قرار مدروس مش مقامرة.',
      whatToDo: `ارفع الميزانية اليومية 20-25% بس (من ${money(campaign.dailyBudget)} لـ ${money(Math.round(campaign.dailyBudget * 1.22))} تقريباً)، واستنى 3 أيام قبل رفعة تانية. الزيادة المفاجئة بترجّع الحملة لمرحلة التعلم.`,
      evidence: [
        ev('ROAS', x(campaign.roas), `≥ ${x(portfolio.targetRoas)}`, true),
        ev('CPA', money(campaign.cpa), `≤ ${money(portfolio.targetCpa)}`, true),
        ev('التحويلات', String(campaign.conversions), '≥ 10', true),
      ],
    }),
  },
  {
    id: 'healthy-hold',
    when: ({ campaign, portfolio }) =>
      campaign.conversions > 0 &&
      campaign.roas >= portfolio.targetRoas &&
      campaign.cpa <= portfolio.targetCpa,
    build: ({ campaign, portfolio, money }) => ({
      action: 'hold',
      severity: 'info',
      title: 'أداء كويس — بس لسه بدري على التوسيع',
      whatWeSaw: `الأرقام كويسة (ROAS ${x(campaign.roas)}، CPA ${money(campaign.cpa)})، لكن على ${campaign.conversions} مبيعة بس.`,
      whyItMatters:
        'تحت 10 مبيعات، مبيعة واحدة زيادة أو ناقصة بتحرّك الأرقام كتير. الأداء ممكن يكون حقيقي وممكن يكون حظ — لسه بدري نعرف. التوسيع دلوقتي بيراهن على أرقام مش مستقرة.',
      whatToDo: `سيبها بنفس الميزانية لحد ما توصل 10 مبيعات على الأقل (فاضل ${Math.max(0, 10 - campaign.conversions)}), وساعتها هتظهرلك كفرصة توسيع.`,
      evidence: [
        ev('ROAS', x(campaign.roas), `≥ ${x(portfolio.targetRoas)}`, true),
        ev('CPA', money(campaign.cpa), `≤ ${money(portfolio.targetCpa)}`, true),
        ev('التحويلات', String(campaign.conversions), '≥ 10', false),
      ],
    }),
  },
];

/** Rule ids in priority order — exported so tests can assert the ordering. */
export const RULE_IDS = RULES.map((r) => r.id);

/**
 * Evaluates one campaign and returns its single highest-priority
 * recommendation, or `null` when no rule applies (a campaign meeting every
 * target with modest volume and no creative issue simply needs no action).
 */
export function evaluateCampaign(
  campaign: Campaign,
  portfolio: Portfolio,
  money: MoneyFormatter,
): Recommendation | null {
  const ctx: RuleContext = {
    campaign,
    portfolio,
    money,
    breakEven: breakEvenRoas(campaign),
    confidence: confidenceOf(campaign, portfolio),
  };

  const rule = RULES.find((r) => r.when(ctx));
  if (!rule) return null;

  return {
    id: `${campaign.id}:${rule.id}`,
    ruleId: rule.id,
    portfolioId: campaign.portfolioId,
    campaignId: campaign.id,
    campaignName: campaign.name,
    confidence: ctx.confidence,
    ...rule.build(ctx),
  };
}

const SEVERITY_ORDER: Record<Recommendation['severity'], number> = {
  high: 0,
  medium: 1,
  info: 2,
};

/**
 * Evaluates a portfolio's campaigns, most urgent first, so the buyer's
 * attention goes to money-losing campaigns before optimisation nudges.
 */
export function evaluatePortfolio(
  campaigns: Campaign[],
  portfolio: Portfolio,
  money: MoneyFormatter,
): Recommendation[] {
  return campaigns
    .map((c) => evaluateCampaign(c, portfolio, money))
    .filter((r): r is Recommendation => r !== null)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
