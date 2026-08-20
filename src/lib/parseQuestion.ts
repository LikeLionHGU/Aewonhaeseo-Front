import type { Bucket, Metric } from '../api'

/**
 * 질문 한 줄에서 분석 조건을 읽어낸다.
 *
 * 서버에 자연어를 해석하는 엔드포인트가 없어서 프론트에서 규칙으로 푼다.
 * 브라우저에서 LLM 을 부르지 않는 이유는 두 가지다 — 키를 프론트에 두면 그대로
 * 노출되고, 이 도구의 값은 "숫자의 근거를 되짚을 수 있다"는 데 있어서 조건을
 * 어떻게 정했는지도 보여줄 수 있어야 한다. 규칙은 틀려도 어디가 틀렸는지 보인다.
 *
 * 지점·항목은 서버가 실제로 갖고 있는 목록(/analyses/options)에만 붙인다. 사전에
 * 없는 이름을 지어내면 결과가 빈 화면으로 나올 뿐이다. 읽어내지 못한 조건은
 * found 에서 빠지고, 화면이 "이건 직접 골라주세요"로 안내한다.
 */

/** 조건 화면·질문 화면이 같은 말을 쓰도록 라벨을 한곳에 둔다. */
export const BUCKET_LABEL: Record<Bucket, string> = {
  month: '월별',
  quarter: '분기별',
  year: '연도별',
  none: '기간 전체',
}

export const METRIC_LABEL: Record<Metric, string> = {
  avg: '평균',
  max: '최대',
  min: '최소',
  count: '건수',
}

/** 질문에서 읽어낼 수 있는 조건의 종류. */
export type ParsedField = 'site' | 'item' | 'period' | 'bucket' | 'metric'

export const FIELD_LABEL: Record<ParsedField, string> = {
  site: '지점',
  item: '항목',
  period: '기간',
  bucket: '집계 단위',
  metric: '집계 방식',
}

/** 서버에 실제로 데이터가 있는 지점·항목. 이 밖의 이름에는 붙이지 않는다. */
export interface QuestionVocabulary {
  sites: string[]
  items: { code: string; name: string }[]
}

export interface ParsedPeriod {
  /** YYYY-MM-DD */
  from: string
  to: string
  /** 사람 말로 되돌린 기간 — '2025년', '최근 3개월'. 화면에 그대로 보여준다. */
  label: string
  /** 조건 화면의 기간 프리셋 칩과 정확히 겹칠 때 그 칩 이름. */
  preset?: string
}

export interface ParsedQuestion {
  site?: string
  itemCode?: string
  period?: ParsedPeriod
  bucket?: Bucket
  metric?: Metric
  /** 질문에서 실제로 읽어낸 것들. 화면이 출처를 표시할 때 쓴다. */
  found: ParsedField[]
}

// ── 날짜 ──────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')
const isoDay = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const firstDay = (year: number, month: number) => `${year}-${pad(month)}-01`
/** 0 일은 그 전 달의 마지막 날이다 — 월말을 따로 세지 않아도 된다. */
const lastDay = (year: number, month: number) => isoDay(new Date(year, month, 0))

function monthSpan(year: number, from: number, to: number, label: string): ParsedPeriod {
  return { from: firstDay(year, from), to: lastDay(year, to), label }
}

/** 오늘부터 months 개월 전까지. 조건 화면의 기간 프리셋과 같은 셈이다. */
function recentMonths(months: number, now: Date, label: string, preset?: string): ParsedPeriod {
  const from = new Date(now)
  from.setMonth(from.getMonth() - months)
  return { from: isoDay(from), to: isoDay(now), label, preset }
}

// ── 기간 ──────────────────────────────────────────────────────────────

type Match = { index: number; length: number }
type PeriodRule = {
  pattern: RegExp
  build: (hit: RegExpMatchArray, now: Date) => ParsedPeriod | null
}

/** '작년' 처럼 오늘을 기준으로 세는 말. 값은 올해와의 차이다. */
const RELATIVE_YEAR: Record<string, number> = {
  재작년: -2,
  작년: -1,
  지난해: -1,
  전년: -1,
  올해: 0,
  금년: 0,
  당해: 0,
  이번해: 0,
}

const relativeYear = (word: string, now: Date) =>
  now.getFullYear() + (RELATIVE_YEAR[word.replace(/\s+/g, '')] ?? 0)

const RELATIVE_WORD = '재작년|작년|지난\\s*해|전년|올해|금년|당해|이번\\s*해'

/**
 * 먼저 맞는 규칙 하나만 쓴다. 좁은 표현이 먼저 와야 한다 — '2025년 3월' 이
 * '2025년' 으로 먹히면 달을 잃는다.
 */
const PERIOD_RULES: PeriodRule[] = [
  // 2025-01 ~ 2025-12 · 2025.1 ~ 2025.3
  {
    pattern: /(\d{4})\s*[.\-/]\s*(\d{1,2})\s*(?:~|–|-|부터|에서)\s*(\d{4})\s*[.\-/]\s*(\d{1,2})/,
    build: (hit) => ({
      from: firstDay(+hit[1], +hit[2]),
      to: lastDay(+hit[3], +hit[4]),
      label: `${hit[1]}-${pad(+hit[2])} ~ ${hit[3]}-${pad(+hit[4])}`,
    }),
  },
  // 2025년 1월 ~ 2026년 3월
  {
    pattern:
      /(\d{4})\s*년\s*(\d{1,2})\s*월\s*(?:~|–|-|부터|에서)\s*(\d{4})\s*년\s*(\d{1,2})\s*월/,
    build: (hit) => ({
      from: firstDay(+hit[1], +hit[2]),
      to: lastDay(+hit[3], +hit[4]),
      label: `${hit[1]}년 ${+hit[2]}월 ~ ${hit[3]}년 ${+hit[4]}월`,
    }),
  },
  // 2025년 1월 ~ 3월
  {
    pattern: /(\d{4})\s*년\s*(\d{1,2})\s*월\s*(?:~|–|-|부터|에서)\s*(\d{1,2})\s*월/,
    build: (hit) =>
      monthSpan(+hit[1], +hit[2], +hit[3], `${hit[1]}년 ${+hit[2]}월 ~ ${+hit[3]}월`),
  },
  // 작년 1분기 · 올해 3분기
  {
    pattern: new RegExp(`(${RELATIVE_WORD})\\s*([1-4])\\s*분기`),
    build: (hit, now) => {
      const year = relativeYear(hit[1], now)
      const quarter = +hit[2]
      return monthSpan(year, quarter * 3 - 2, quarter * 3, `${year}년 ${quarter}분기`)
    },
  },
  // 작년 상반기 · 올해 하반기
  {
    pattern: new RegExp(`(${RELATIVE_WORD})\\s*(상|하)\\s*반기`),
    build: (hit, now) => {
      const year = relativeYear(hit[1], now)
      const second = hit[2] === '하'
      return monthSpan(year, second ? 7 : 1, second ? 12 : 6, `${year}년 ${hit[2]}반기`)
    },
  },
  // 2025년 1분기
  {
    pattern: /(\d{4})\s*년\s*([1-4])\s*분기/,
    build: (hit) => {
      const quarter = +hit[2]
      return monthSpan(+hit[1], quarter * 3 - 2, quarter * 3, `${hit[1]}년 ${quarter}분기`)
    },
  },
  // 2025년 상반기
  {
    pattern: /(\d{4})\s*년\s*(상|하)\s*반기/,
    build: (hit) => {
      const second = hit[2] === '하'
      return monthSpan(+hit[1], second ? 7 : 1, second ? 12 : 6, `${hit[1]}년 ${hit[2]}반기`)
    },
  },
  // 2025년 3월
  {
    pattern: /(\d{4})\s*년\s*(\d{1,2})\s*월/,
    build: (hit) => monthSpan(+hit[1], +hit[2], +hit[2], `${hit[1]}년 ${+hit[2]}월`),
  },
  // 최근 3개월 · 지난 6달
  {
    pattern: /(?:최근|지난)\s*(\d{1,3})\s*(?:개월|달)\s*(?:간|치|동안)?/,
    build: (hit, now) => {
      const months = +hit[1]
      if (!months) return null
      const label = `최근 ${months}개월`
      // 조건 화면에 같은 칩이 있으면 칩을 켜서 계산을 한 곳에만 둔다.
      const preset = months === 1 || months === 3 ? label : undefined
      return recentMonths(months, now, label, preset)
    },
  },
  // 최근 1년 · 지난 3년간
  {
    pattern: /(?:최근|지난)\s*(\d{1,2})\s*년\s*(?:간|치|동안)?/,
    build: (hit, now) => {
      const years = +hit[1]
      if (!years) return null
      const label = `최근 ${years}년`
      const preset = years === 1 || years === 3 ? label : undefined
      return recentMonths(years * 12, now, label, preset)
    },
  },
  // 지난달 · 저번 달 · 전월
  {
    pattern: /지난\s*달|저번\s*달|전\s*달|전월/,
    build: (_hit, now) => {
      const at = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const year = at.getFullYear()
      const month = at.getMonth() + 1
      return monthSpan(year, month, month, `${year}년 ${month}월`)
    },
  },
  // 이번 달 · 금월 · 이달
  {
    pattern: /이번\s*달|금월|당월|이\s*달/,
    build: (_hit, now) => ({
      from: firstDay(now.getFullYear(), now.getMonth() + 1),
      to: isoDay(now),
      label: `${now.getFullYear()}년 ${now.getMonth() + 1}월`,
    }),
  },
  // 작년 · 올해 — 연도만 가리키는 말
  {
    pattern: new RegExp(`(${RELATIVE_WORD})`),
    build: (hit, now) => {
      const year = relativeYear(hit[1], now)
      // 올해는 아직 끝나지 않았으니 오늘까지만 본다.
      const to = year === now.getFullYear() ? isoDay(now) : lastDay(year, 12)
      return { from: firstDay(year, 1), to, label: `${year}년` }
    },
  },
  // 1분기 — 연도를 안 쓰면 올해로 본다
  {
    pattern: /([1-4])\s*분기/,
    build: (hit, now) => {
      const quarter = +hit[1]
      const year = now.getFullYear()
      return monthSpan(year, quarter * 3 - 2, quarter * 3, `${year}년 ${quarter}분기`)
    },
  },
  // 상반기 · 하반기
  {
    pattern: /(상|하)\s*반기/,
    build: (hit, now) => {
      const year = now.getFullYear()
      const second = hit[1] === '하'
      return monthSpan(year, second ? 7 : 1, second ? 12 : 6, `${year}년 ${hit[1]}반기`)
    },
  },
  // 2025년 — 위에서 다 걸러진 뒤에야 연도만 남는다
  {
    pattern: /(\d{4})\s*년/,
    build: (hit) => {
      const year = +hit[1]
      // 사전에 없는 연도를 만들지 않는다. 1900 년대 수질 데이터는 없다.
      if (year < 1990 || year > 2100) return null
      return monthSpan(year, 1, 12, `${year}년`)
    },
  },
]

function matchPeriod(text: string, now: Date): (Match & { period: ParsedPeriod }) | null {
  for (const rule of PERIOD_RULES) {
    const hit = text.match(rule.pattern)
    if (!hit || hit.index === undefined) continue
    const period = rule.build(hit, now)
    if (period) return { period, index: hit.index, length: hit[0].length }
  }
  return null
}

// ── 집계 단위·방식 ────────────────────────────────────────────────────

type ValueRule<T> = { value: T; pattern: RegExp }

/**
 * '월평균' 처럼 단위와 방식이 한 낱말로 붙는 경우가 있다. 이때 단위 쪽은
 * 뒤를 내다보기(lookahead)만 하고 '월' 한 글자만 먹어야 '평균' 이 남아
 * 집계 방식까지 읽힌다.
 */
const AGGREGATE_SUFFIX = '평균|최대|최소|최고|최저|합계|총합'

const BUCKET_RULES: ValueRule<Bucket>[] = [
  {
    value: 'quarter',
    pattern: new RegExp(`분기\\s*(?:별|당|마다|로|씩)|사분기|분기(?=\\s*(?:${AGGREGATE_SUFFIX}))`),
  },
  {
    value: 'month',
    pattern: new RegExp(
      `월\\s*별|달\\s*별|월간|매\\s*월|매\\s*달|월\\s*단위|달\\s*단위|월(?=\\s*(?:${AGGREGATE_SUFFIX}))`,
    ),
  },
  {
    value: 'year',
    pattern: new RegExp(
      `연도\\s*별|년도\\s*별|연\\s*별|년\\s*별|해\\s*마다|매\\s*년|매\\s*해|연간|연\\s*단위|년\\s*단위|연(?=\\s*(?:${AGGREGATE_SUFFIX}))`,
    ),
  },
  { value: 'none', pattern: /기간\s*전체|전체\s*기간|전\s*기간|통틀어|합쳐서|누적/ },
]

/**
 * 순서가 판정이다. '기준 초과 횟수' 는 초과(최대)보다 횟수(건수)가 먼저라
 * 건수로 읽는다 — 몇 번 넘었는지를 묻는 말이기 때문이다.
 */
const METRIC_RULES: ValueRule<Metric>[] = [
  { value: 'count', pattern: /건수|개수|횟수|몇\s*건|몇\s*번|몇\s*회|카운트/ },
  {
    value: 'max',
    pattern: /최대|최고|최댓값|가장\s*(?:높|많|큰)|피크|초과|넘(?:는|은|던|었)|상한|위반/,
  },
  { value: 'min', pattern: /최소|최저|최솟값|가장\s*(?:낮|적|작)|하한|미달/ },
  { value: 'avg', pattern: /평균|추세|추이|변화|경향/ },
]

function matchValue<T>(rules: ValueRule<T>[], text: string): (Match & { value: T }) | null {
  for (const rule of rules) {
    const hit = text.match(rule.pattern)
    if (!hit || hit.index === undefined) continue
    return { value: rule.value, index: hit.index, length: hit[0].length }
  }
  return null
}

// ── 측정 항목 ─────────────────────────────────────────────────────────

/**
 * 현장에서 쓰는 약칭. 사전 이름은 기관마다 조금씩 달라서 코드를 박지 않고
 * "이름이 이걸 담고 있으면 그 항목" 이라는 조건으로 둔다.
 */
const ITEM_ALIASES: { pattern: RegExp; wants: (name: string) => boolean }[] = [
  { pattern: /\bBOD\b|비오디/i, wants: (n) => n.includes('생물화학적산소요구량') },
  // 화학적산소요구량은 생물화학적산소요구량의 일부라 생물 쪽을 빼야 한다.
  {
    pattern: /\bCOD\b|씨오디/i,
    wants: (n) => n.includes('화학적산소요구량') && !n.includes('생물'),
  },
  { pattern: /\bTOC\b/i, wants: (n) => n.includes('총유기탄소') },
  { pattern: /\bSS\b|부유\s*물질/i, wants: (n) => n.includes('부유물질') },
  { pattern: /\bT-?N\b|총\s*질소/i, wants: (n) => n.includes('총질소') },
  { pattern: /\bT-?P\b|총\s*인(?![구체])/i, wants: (n) => n.includes('총인') },
  { pattern: /\bDO\b|용존\s*산소/i, wants: (n) => n.includes('용존산소') },
  { pattern: /\bpH\b|피에이치|수소\s*이온/i, wants: (n) => n.includes('수소이온') },
  { pattern: /대장균/, wants: (n) => n.includes('대장균') },
  { pattern: /노말\s*헥산|n-?헥산|유분/i, wants: (n) => n.includes('노말헥산') },
  { pattern: /\bEC\b|전기\s*전도도/i, wants: (n) => n.includes('전기전도도') },
  { pattern: /클로로필/, wants: (n) => n.includes('클로로필') },
  { pattern: /암모니아/, wants: (n) => n.includes('암모니아') },
  { pattern: /질산성/, wants: (n) => n.includes('질산성') },
  { pattern: /수온|온도/, wants: (n) => n.includes('수온') || n.includes('온도') },
]

/**
 * 사전 이름은 '량' · '함유량' · '농도' 같은 꼬리를 달고 있다(2026-08-20 실제 사전
 * 확인) — 총유기탄소'량', 부유물질'량', 용존산소'량', 크롬함유'량'. 사람은 그
 * 꼬리를 떼고 말하므로 뗀 형태도 후보로 둔다. 긴 꼬리를 먼저 떼야 '함유량' 이
 * '량' 만 떨어져 '…함유' 로 남지 않는다.
 */
const NAME_SUFFIXES = ['함유량', '농도', '량']

/**
 * 이름 하나에서 찾아볼 형태들.
 *
 *   '노말헥산추출물질(동식물유지류)' → 괄호 앞부분도 (구리(동)함유량 → 구리)
 *   '총유기탄소량'                  → 꼬리를 뗀 '총유기탄소' 도
 *
 * 한 글자로 줄어든 것은 버린다 — '납함유량' 의 '납', '유량' 의 '유' 는 아무
 * 문장에나 걸려서 엉뚱한 항목을 고르게 된다.
 */
function nameForms(name: string) {
  const full = name.trim()
  const seeds = new Set([full])
  const head = full.split('(')[0].trim()
  if (head) seeds.add(head)

  const forms = new Set<string>()
  for (const seed of seeds) {
    forms.add(seed)
    for (const suffix of NAME_SUFFIXES) {
      if (seed.length > suffix.length && seed.endsWith(suffix)) {
        forms.add(seed.slice(0, -suffix.length).trim())
        break
      }
    }
  }
  return [...forms].filter((form) => form.length >= 2)
}

function matchItem(
  text: string,
  items: QuestionVocabulary['items'],
): (Match & { code: string }) | null {
  if (!items.length) return null

  // 1) 코드를 그대로 적은 경우 — 'WQ-001'
  const code = text.match(/\b([A-Za-z]{2}-\d{3})\b/)
  if (code?.index !== undefined) {
    const found = items.find((item) => item.code.toUpperCase() === code[1].toUpperCase())
    if (found) return { code: found.code, index: code.index, length: code[0].length }
  }

  // 2) 사전 이름이 나온 경우. 긴 형태가 먼저다 — '용존총질소' 라고 썼으면
  //    그 안의 '총질소' 가 아니라 쓴 대로 골라야 한다.
  const named = items
    .flatMap((item) => nameForms(item.name).map((form) => ({ item, form })))
    .filter(({ form }) => text.includes(form))
    .sort((a, b) => b.form.length - a.form.length)[0]
  if (named) {
    return {
      code: named.item.code,
      index: text.indexOf(named.form),
      length: named.form.length,
    }
  }

  // 3) 약칭
  for (const alias of ITEM_ALIASES) {
    const hit = text.match(alias.pattern)
    if (!hit || hit.index === undefined) continue
    const found = shortestNamed(items, alias.wants)
    if (found) return { code: found.code, index: hit.index, length: hit[0].length }
  }
  return null
}

/**
 * 조건에 맞는 항목 중 이름이 가장 짧은 것.
 *
 * 약칭은 여러 항목에 걸린다 — 'T-N' 의 조건('총질소' 포함)에는 총질소와
 * 용존총질소가 둘 다 맞고, '대장균' 에는 총대장균군과 분원성대장균군이 맞는다
 * (2026-08-20 실제 사전 확인). 먼저 찾은 것을 쓰면 서버가 주는 목록 순서에
 * 답이 달린다. 짧은 이름이 기본형이므로 그걸 고른다 — 총질소 < 용존총질소.
 */
function shortestNamed(items: QuestionVocabulary['items'], wants: (name: string) => boolean) {
  return items
    .filter((item) => wants(item.name))
    .sort((a, b) => a.name.length - b.name.length)[0]
}

// ── 측정 지점 ─────────────────────────────────────────────────────────

/**
 * 지점 이름 안에 우연히 들어갈 수 있는 흔한 낱말. '○○수질측정소' 같은 이름에
 * '측정' 이 걸리면 아무 지점이나 골라 버린다.
 */
const STOP_TOKENS = new Set([
  '분석', '데이터', '수질', '측정', '측정값', '지점', '항목', '기준', '기준치',
  '초과', '위반', '미달', '평균', '최대', '최소', '최고', '최저', '건수', '개수',
  '횟수', '추세', '추이', '변화', '비교', '보여줘', '알려줘', '보여', '알려',
  '확인', '조회', '얼마', '어디', '언제', '무엇', '전체', '모든', '통계', '결과',
  '현황', '상태', '관련', '대비', '동기', '기간', '구간', '자료', '수치', '농도',
])

/**
 * 지점을 고른다.
 *
 * 이름을 통째로 적는 사람은 드물다. '중랑물재생센터', '인천' 처럼 조각만 나오니
 * 질문의 낱말이 지점 이름 안에 들어 있는지 본다. 긴 조각이 걸릴수록 확실하다.
 *
 * 같은 점수가 둘 이상이면 고르지 않는다 — '인천' 만 적었는데 인천 지점이 셋이면
 * 어느 쪽인지 알 방법이 없다. 찍어서 틀린 결과를 주는 것보다 사용자가 직접
 * 고르게 두는 편이 낫다.
 */
function matchSite(text: string, sites: string[]): string | null {
  const whole = sites
    .filter((name) => name && text.includes(name))
    .sort((a, b) => b.length - a.length)
  if (whole.length) return whole[0]

  const tokens = (text.match(/[가-힣A-Za-z0-9]{2,}/g) ?? []).filter(
    (token) => !STOP_TOKENS.has(token),
  )
  if (!tokens.length) return null

  const scored = sites
    .map((name) => ({
      name,
      score: tokens.reduce((sum, token) => (name.includes(token) ? sum + token.length : sum), 0),
    }))
    .sort((a, b) => b.score - a.score || a.name.length - b.name.length)

  const best = scored[0]
  if (!best || best.score < 2) return null
  if (scored[1] && scored[1].score === best.score) return null
  return best.name
}

// ── 본체 ──────────────────────────────────────────────────────────────

/** 읽어낸 표현은 지워 가며 본다. 남은 말에서만 지점을 찾아야 오인이 줄어든다. */
function consume(text: string, at: Match) {
  return `${text.slice(0, at.index)} ${text.slice(at.index + at.length)}`
}

export function parseQuestion(
  question: string,
  vocabulary: QuestionVocabulary,
  now: Date = new Date(),
): ParsedQuestion {
  const found: ParsedField[] = []
  let residue = question.trim()
  if (!residue) return { found }

  const period = matchPeriod(residue, now)
  if (period) {
    residue = consume(residue, period)
    found.push('period')
  }

  const bucket = matchValue(BUCKET_RULES, residue)
  if (bucket) {
    residue = consume(residue, bucket)
    found.push('bucket')
  }

  const metric = matchValue(METRIC_RULES, residue)
  if (metric) {
    residue = consume(residue, metric)
    found.push('metric')
  }

  const item = matchItem(residue, vocabulary.items)
  if (item) {
    residue = consume(residue, item)
    found.push('item')
  }

  const site = matchSite(residue, vocabulary.sites)
  if (site) found.push('site')

  return {
    site: site ?? undefined,
    itemCode: item?.code,
    period: period?.period,
    bucket: bucket?.value,
    metric: metric?.value,
    found,
  }
}

/**
 * 읽어낸 조건을 사람이 읽을 한 줄로. '지점: 중랑물재생센터 · 항목: BOD …'
 *
 * termName 은 코드를 우리말로 바꾸는 함수다(useTermNames). 사전을 아직 못 받은
 * 사이에는 코드가 그대로 나오지만 화면이 멈추지는 않는다.
 */
export function describeParsed(
  parsed: ParsedQuestion,
  termName: (code?: string) => string,
): string[] {
  const parts: string[] = []
  if (parsed.site) parts.push(`지점 ${parsed.site}`)
  if (parsed.itemCode) parts.push(`항목 ${termName(parsed.itemCode) || parsed.itemCode}`)
  if (parsed.period) parts.push(`기간 ${parsed.period.label}`)
  if (parsed.bucket || parsed.metric) {
    const unit = parsed.bucket ? BUCKET_LABEL[parsed.bucket] : ''
    const how = parsed.metric ? METRIC_LABEL[parsed.metric] : ''
    parts.push(`집계 ${[unit, how].filter(Boolean).join(' ')}`)
  }
  return parts
}
