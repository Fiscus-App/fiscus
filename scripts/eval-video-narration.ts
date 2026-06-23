/**
 * Narration quality eval for the AI video feed.
 *
 * Runs the composer across a diverse sample of articles and checks the bar the
 * narration must clear: dense, figure-bearing analyst briefings that are NOT a
 * restated headline, caption or source line.
 *
 * Run:  npm run eval:video      (uses the real model when ANTHROPIC_API_KEY is
 *                                set; otherwise reports the deterministic
 *                                fallback so you can still see structure)
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { CompositionInput, VideoComposition } from '@/types'

// ── Load .env(.local) so `npm run eval:video` just works ──────────────────
function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    const p = join(process.cwd(), f)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      let val = m[2].trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[m[1]]) process.env[m[1]] = val
    }
  }
}

// ── Sample articles (diverse types, real-shaped bodies with figures) ──────
type Sample = Omit<CompositionInput, 'sectorColor'> & { type: string }

const SAMPLES: Sample[] = [
  {
    type: 'Earnings beat',
    articleId: 's1', ticker: 'CBA', company: 'Commonwealth Bank', sector: 'Financials', category: 'Earnings', source: 'AFR',
    headline: 'Commonwealth Bank lifts half-year cash profit to $5.1B',
    summary: 'CBA posted a half-year cash profit of $5.1 billion, up 4 per cent, and lifted its dividend.',
    bodyText: 'Commonwealth Bank reported a half-year cash profit of $5.1 billion, up 4 per cent on the prior corresponding period and ahead of consensus of $4.9 billion. Net interest margin held steady at 1.99 per cent despite intense mortgage competition. The board declared a $2.25 interim dividend, up 5 per cent. Management flagged a $350 million lift in loan-impairment provisions as arrears in the mortgage book edged up to 0.66 per cent. Operating expenses rose 3 per cent on wage inflation and technology spending. Shares rose 2.3 per cent to $114.32 in early trade, the highest in three weeks.',
    change: 2.3, price: 114.32, series: [109.8, 110.5, 112.1, 113.0, 114.32],
  },
  {
    type: 'M&A',
    articleId: 's2', ticker: 'ALU', company: 'Altium', sector: 'Technology', category: 'M&A', source: 'Bloomberg',
    headline: 'Renesas to acquire Altium for $9.1B in cash',
    summary: 'Japan’s Renesas agreed to buy ASX-listed Altium for $9.1 billion in an all-cash deal.',
    bodyText: 'Japan’s Renesas Electronics agreed to acquire Altium for $9.1 billion in cash, offering $68.50 a share — a 34 per cent premium to the last close. The deal values the design-software maker at roughly 16 times forward revenue. Altium’s board unanimously recommended the offer, which requires Foreign Investment Review Board approval and is expected to close in the second half. Altium shares surged 28 per cent to $65.80, while the stock had already gained 19 per cent this year. Renesas said the acquisition accelerates its push into cloud-based electronics design and recurring subscription revenue.',
    change: 28.4, price: 65.80, series: [49, 51, 50.2, 64, 65.8],
  },
  {
    type: 'Central bank',
    articleId: 's3', ticker: 'RBA', company: 'Reserve Bank of Australia', sector: 'Macroeconomics', category: 'Monetary Policy', source: 'Reuters',
    headline: 'RBA holds cash rate at 4.35%, flags sticky services inflation',
    summary: 'The RBA left the cash rate at 4.35 per cent and warned services inflation remains elevated.',
    bodyText: 'The Reserve Bank held the cash rate at 4.35 per cent for a fourth straight meeting, in line with expectations. Governor Michele Bullock said the board considered a hike, noting trimmed-mean inflation at 3.9 per cent remains above the 2–3 per cent target. The RBA pushed back its forecast for inflation returning to target to late 2025. Markets trimmed bets on a rate cut, now pricing the first reduction in February versus December previously. The Australian dollar rose 0.4 per cent to US66.2¢ and three-year bond yields climbed 7 basis points.',
    change: null, price: null, series: null,
  },
  {
    type: 'Commodity / guidance',
    articleId: 's4', ticker: 'BHP', company: 'BHP Group', sector: 'Materials', category: 'Production', source: 'AFR',
    headline: 'BHP cuts FY iron ore guidance as Pilbara rail works bite',
    summary: 'BHP trimmed full-year iron ore guidance after maintenance disrupted Pilbara rail operations.',
    bodyText: 'BHP lowered its full-year iron ore production guidance to between 282 and 294 million tonnes, from 297 million previously, after planned rail maintenance disrupted Pilbara haulage. Quarterly output fell 3 per cent to 71.5 million tonnes. The miner held copper guidance at 1.72 million tonnes, with Escondida grades improving. Realised iron ore prices averaged US$101 a tonne, down 9 per cent year on year. Unit costs crept to US$18.20 a tonne. BHP shares slipped 1.8 per cent to $43.10. Analysts at Macquarie said the cut was modest and largely anticipated.',
    change: -1.8, price: 43.10, series: [45.2, 44.6, 44.1, 43.5, 43.1],
  },
  {
    type: 'Profit warning',
    articleId: 's5', ticker: 'A2M', company: 'The a2 Milk Company', sector: 'Consumer Staples', category: 'Guidance', source: 'NZ Herald',
    headline: 'a2 Milk shares slump 12% on China infant-formula warning',
    summary: 'a2 Milk warned of weaker China demand, sending shares sharply lower.',
    bodyText: 'The a2 Milk Company warned full-year revenue growth would be in the low single digits, down from prior guidance of high single digits, citing a 13 per cent decline in China’s newborn rate and elevated channel inventory. English-label infant formula sales fell 8 per cent in the half. The company maintained its EBITDA margin target of 14 to 15 per cent through cost cuts. a2 shares tumbled 12 per cent to $5.42, wiping roughly $480 million from market value. It was the stock’s worst session in 18 months.',
    change: -12.0, price: 5.42, series: [6.3, 6.2, 6.15, 5.9, 5.42],
  },
  {
    type: 'Regulatory',
    articleId: 's6', ticker: 'WBC', company: 'Westpac', sector: 'Financials', category: 'Regulation', source: 'Guardian',
    headline: 'ASIC sues Westpac over $1.8B insider-trading allegation',
    summary: 'ASIC launched legal action against Westpac over an interest-rate swap transaction.',
    bodyText: 'The corporate regulator ASIC filed Federal Court proceedings against Westpac, alleging insider trading on a $12 billion interest-rate swap executed in 2016 tied to the AUSGRID privatisation. ASIC claims Westpac traders had advance knowledge of a $1.8 billion order and pre-positioned, costing the consortium an estimated $20 million. Westpac faces potential penalties of up to $1.1 million per breach. The bank said it would defend the claim. Shares were little changed, down 0.3 per cent. It is the third major regulatory action against the lender in five years.',
    change: -0.3, price: 26.85, series: [27.0, 26.95, 26.9, 26.88, 26.85],
  },
  {
    type: 'IPO',
    articleId: 's7', ticker: 'GYG', company: 'Guzman y Gomez', sector: 'Consumer Discretionary', category: 'IPO', source: 'AFR',
    headline: 'Guzman y Gomez jumps 36% in ASX debut',
    summary: 'The Mexican fast-food chain surged on its first day of trading on the ASX.',
    bodyText: 'Guzman y Gomez shares closed their first ASX session up 36 per cent at $30.00, versus the $22.00 issue price, valuing the burrito chain at $3 billion. The IPO raised $335.1 million and was multiple-times oversubscribed. The company operates 210 restaurants and targets 1,000 in Australia over 20 years. It posted network sales of $760 million but remains lossmaking, with a $54 million statutory net loss. Founder Steven Marks retained a 15 per cent stake now worth about $450 million. It was the largest Australian IPO in 18 months.',
    change: 36.0, price: 30.00, series: [22, 24.5, 27, 29, 30],
  },
  {
    type: 'Energy',
    articleId: 's8', ticker: 'WDS', company: 'Woodside Energy', sector: 'Energy', category: 'Projects', source: 'Reuters',
    headline: 'Woodside takes FID on $9B Louisiana LNG project',
    summary: 'Woodside approved a final investment decision on its US Gulf Coast LNG development.',
    bodyText: 'Woodside Energy approved a final investment decision on its $9 billion Louisiana LNG project, targeting first cargoes in 2029 at a capacity of 16.5 million tonnes a year. The company is seeking to sell down a further 50 per cent equity stake to reduce its outlay. Woodside expects an internal rate of return above 13 per cent and a payback under seven years. The project lifts the group’s portfolio to more than 30 million tonnes of LNG annually. Shares fell 4.1 per cent to $26.40 as investors questioned the capital commitment and timing.',
    change: -4.1, price: 26.40, series: [28.5, 27.9, 27.2, 26.8, 26.4],
  },
]

// ── Text metrics ──────────────────────────────────────────────────────────
const STOP = new Set('the a an of to in on for and or as at by is are was were with from that this it its has have had will would up down per cent percent on over under into out off more less than'.split(' '))
const tokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9%$.\s-]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w))
const contentTokens = (s: string) => new Set(tokens(s).filter((w) => !/^[\d.$%-]+$/.test(w)))
const jaccard = (a: Set<string>, b: Set<string>) => {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  a.forEach((x) => { if (b.has(x)) inter++ })
  return inter / (a.size + b.size - inter)
}
const numbers = (s: string) => (s.match(/\$?\d[\d,]*\.?\d*\s?(?:%|per cent|percent|bps|basis points|billion|million|trillion|tonnes?|cents?|¢)?/gi) ?? [])
  .map((n) => n.replace(/,/g, '').match(/\d+\.?\d*/)?.[0] ?? '').filter(Boolean)
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

function main() {
  loadEnv()
  return run()
}

async function run() {
  const hasKey = !!process.env.ANTHROPIC_API_KEY
  let generate: (input: CompositionInput) => Promise<VideoComposition>
  if (hasKey) {
    generate = (await import('@/lib/ai/scenegen')).generateComposition
  } else {
    const { buildFallbackComposition } = await import('@/lib/video/composition')
    generate = async (i) => buildFallbackComposition(i)
  }

  console.log(`\nNarration eval — generator: ${hasKey ? 'REAL MODEL (Anthropic)' : 'FALLBACK (no API key)'}\n${'='.repeat(78)}`)

  const BANNED = [
    'according to the report', 'the article states', 'in today', 'here\'s what happened',
    'investors are watching', 'this comes as', 'that\'s the update',
  ]

  const narrations: { type: string; tone: string; text: string; tokens: Set<string> }[] = []
  const pass = { noIntroOutro: 0, noSource: 0, noHeadline: 0, diffCaption: 0, hasFigures: 0, inWordBand: 0, onePara: 0, noBanned: 0 }

  for (const s of SAMPLES) {
    const input: CompositionInput = { ...s, sectorColor: '#5b8af5' }
    const comp = await generate(input)
    const script = comp.script // the full flowing paragraph
    const kinds = comp.scenes.map((sc) => sc.visual.type)
    const lower = script.toLowerCase()

    const introOutro = kinds.some((k) => k === 'title' || k === 'outro')
    const sourceMention = new RegExp(`\\b(source|via fiscus|${s.source.split(/\s+/)[0]})\\b`, 'i').test(script)
    const headlineOverlap = jaccard(contentTokens(script), contentTokens(s.headline))
    const captionOverlap = jaccard(contentTokens(script), contentTokens(s.summary))
    const artNums = new Set(numbers(s.bodyText ?? ''))
    const narrNums = numbers(script)
    const numHits = narrNums.filter((n) => artNums.has(n)).length
    const wc = wordCount(script)
    const onePara = !/\n|•|^\s*[-*]\s/m.test(script)
    const bannedHit = BANNED.find((b) => lower.includes(b))

    if (!introOutro) pass.noIntroOutro++
    if (!sourceMention) pass.noSource++
    if (headlineOverlap < 0.5) pass.noHeadline++
    if (captionOverlap < 0.5) pass.diffCaption++
    if (numHits >= 2) pass.hasFigures++
    if (wc >= 50 && wc <= 80) pass.inWordBand++
    if (onePara) pass.onePara++
    if (!bannedHit) pass.noBanned++

    narrations.push({ type: s.type, tone: comp.tone, text: script, tokens: contentTokens(script) })

    console.log(`\n▸ ${s.type}  [${s.ticker}]  gen=${comp.generator}  tone=${comp.tone}  beats=${kinds.join('>')}`)
    console.log(`  words=${wc}  figs(narr/hits)=${narrNums.length}/${numHits}  vsCaption=${captionOverlap.toFixed(2)}  vsHeadline=${headlineOverlap.toFixed(2)}  src=${sourceMention ? 'YES' : 'no'}  1para=${onePara ? 'yes' : 'NO'}  banned=${bannedHit ?? 'none'}`)
    console.log(`  caption: ${s.summary}`)
    console.log(`  script : ${script}`)
  }

  // Cross-article distinctness (lower average overlap = more varied).
  let sum = 0, pairs = 0
  for (let i = 0; i < narrations.length; i++)
    for (let j = i + 1; j < narrations.length; j++) { sum += jaccard(narrations[i].tokens, narrations[j].tokens); pairs++ }
  const avgPairOverlap = pairs ? sum / pairs : 0
  const distinctTones = new Set(narrations.map((x) => x.tone)).size

  const n = SAMPLES.length
  const line = (label: string, got: number, of = n) => `  ${got === of ? 'PASS' : got >= of - 1 ? 'WARN' : 'FAIL'}  ${label}: ${got}/${of}`
  console.log(`\n${'='.repeat(78)}\nV2 verification summary (${n} articles)`)
  console.log(line('No intro/outro', pass.noIntroOutro))
  console.log(line('No source named', pass.noSource))
  console.log(line('Does not restate headline', pass.noHeadline))
  console.log(line('Different from caption', pass.diffCaption))
  console.log(line('Surfaces ≥2 real figures', pass.hasFigures))
  console.log(line('Script 50–80 words', pass.inWordBand))
  console.log(line('Single paragraph (no lists)', pass.onePara))
  console.log(line('No banned phrases', pass.noBanned))
  console.log(`  ${avgPairOverlap < 0.3 ? 'PASS' : 'WARN'}  Cross-article distinctness (avg overlap ${avgPairOverlap.toFixed(2)}, want <0.30)`)
  console.log(`  ${distinctTones >= 3 ? 'PASS' : 'INFO'}  Voice varies by type (${distinctTones} distinct tones; fallback is always 'neutral')`)
  console.log('')
}

main().catch((e) => { console.error(e); process.exit(1) })
