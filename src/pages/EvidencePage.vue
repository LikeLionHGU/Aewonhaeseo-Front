<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import wordmark from '../assets/wordmark.svg'
import AccountMenu from '../components/AccountMenu.vue'
import { useDesignScale } from '../composables/useDesignScale'
import { useTermNames } from '../composables/useTermNames'
import {
  ApiError,
  getAnalysis,
  getAnalysisMeasurements,
  getMapping,
  listFiles,
  parseConditions,
} from '../api'
import type { AnalysisDetail, AnalysisMeasurement, AnalysisRequest } from '../api'

const DESIGN_WIDTH = 1920
const BASE_HEIGHT = 3951

const { scale, offsetX } = useDesignScale(DESIGN_WIDTH)
const router = useRouter()
const route = useRoute()
const { loadTerms, termName } = useTermNames()

// --- 불러오기 ---

const loading = ref(true)
const loadError = ref('')
const detail = ref<AnalysisDetail | null>(null)
const conditions = ref<AnalysisRequest | null>(null)
const measurements = ref<AnalysisMeasurement[]>([])
const measurementTotal = ref(0)

/** 분석에 쓰인 항목 코드가 원본 파일의 어느 컬럼에서 왔는지. */
type ColumnOrigin = { code: string; raw: string; auto: boolean; file: string }
const origins = ref<ColumnOrigin[]>([])

// 앞 화면에서 넘어온 질문. 서버가 질문 문장을 저장하지 않아 주소로만 전달된다.
const question = computed(() => String(route.query.q ?? '').trim())

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const executionId = String(route.query.executionId ?? '')
    if (!executionId) {
      loadError.value = '어떤 분석의 근거인지 알 수 없어요. 결과 화면에서 다시 들어와 주세요.'
      return
    }
    void loadTerms()
    const loaded = await getAnalysis(executionId)
    detail.value = loaded
    conditions.value = parseConditions(loaded)

    await Promise.all([loadMeasurements(executionId), loadOrigins()])
  } catch (error) {
    loadError.value =
      error instanceof ApiError && error.code !== 'HTTP_ERROR' && error.code !== 'NETWORK_ERROR'
        ? error.message
        : '근거를 불러오지 못했어요. 잠시 후 다시 시도해 주세요'
  } finally {
    loading.value = false
  }
}

/** 이 분석이 실제로 집계한 원본 측정 행. 원본 파일·행·컬럼까지 알려준다. */
async function loadMeasurements(executionId: string) {
  try {
    const page = await getAnalysisMeasurements(executionId, { size: 12 })
    measurements.value = page.items
    measurementTotal.value = page.total
  } catch {
    measurements.value = []
    measurementTotal.value = 0
  }
}

/**
 * 항목 코드 ↔ 원본 컬럼.
 *
 * 분석은 특정 파일에 묶이지 않아서 올라온 파일들의 매핑을 모아 코드로 찾는다.
 * 목록 응답이 매핑까지 실어주면 이 왕복은 사라진다.
 */
async function loadOrigins() {
  try {
    // 매핑을 돌리지 않은 파일은 부를 필요가 없다 — 404 만 돌아온다.
    const page = await listFiles({ size: 30 })
    const mapped = page.items.filter((f) => f.auto_mapped_rate !== undefined)
    const results = await Promise.allSettled(mapped.map((f) => getMapping(f.id)))
    const wanted = conditions.value?.item_codes ?? []
    const found: ColumnOrigin[] = []
    const seen = new Set<string>()

    results.forEach((result, i) => {
      if (result.status !== 'fulfilled') return
      for (const column of result.value.columns) {
        if (!column.code || column.dict_type !== '측정항목') continue
        if (wanted.length && !wanted.includes(column.code)) continue
        const key = `${column.code}|${column.raw}`
        if (seen.has(key)) continue
        seen.add(key)
        found.push({
          code: column.code,
          raw: column.raw,
          auto: column.status === 'exact' || column.status === 'fuzzy_auto',
          file: mapped[i].filename,
        })
      }
    })
    origins.value = found.sort((a, b) => a.code.localeCompare(b.code))
  } catch {
    origins.value = []
  }
}

// --- 라벨 ---

const BUCKET_LABEL: Record<string, string> = {
  month: '월별', quarter: '분기별', year: '연도별', none: '기간 전체',
}
const METRIC_LABEL: Record<string, string> = {
  avg: '평균', max: '최대', min: '최소', count: '건수',
}
const bucketLabel = computed(() => BUCKET_LABEL[conditions.value?.bucket ?? 'none'] ?? '')
const metricLabel = computed(() => METRIC_LABEL[conditions.value?.metric ?? 'avg'] ?? '')

const interpretChips = computed(() => {
  const c = conditions.value
  if (!c) return []
  return [
    `측정 지점: ${c.site_names?.length ? c.site_names.join(', ') : '전체'}`,
    `측정 항목: ${c.item_codes?.length ? c.item_codes.map(termName).join(', ') : '전체'}`,
    `기간: ${c.from && c.to ? `${c.from} ~ ${c.to}` : '전체'}`,
    `집계 단위: ${bucketLabel.value} ${metricLabel.value}`,
    c.standard_set ? `${c.standard_set} · ${c.region_grade ?? '-'}` : '기준치 없음',
  ]
})

const dataNote = computed(() => {
  const d = detail.value
  if (!d) return ''
  const ran = new Date(d.ran_at)
  const stamp = Number.isNaN(ran.getTime())
    ? d.ran_at
    : `${ran.getFullYear()}-${String(ran.getMonth() + 1).padStart(2, '0')}-${String(ran.getDate()).padStart(2, '0')} ${String(ran.getHours()).padStart(2, '0')}:${String(ran.getMinutes()).padStart(2, '0')}`
  return `집계 결과 ${d.row_count}행 · 기준 초과 ${d.exceeded_count}건 · ${d.elapsed_ms}ms · ${stamp} 실행`
})

/** 쉬운 말 설명 — 조건에서 그대로 만든다. */
const plainText = computed(() => {
  const c = conditions.value
  if (!c) return []
  const site = c.site_names?.length ? c.site_names.join(', ') : '모든 지점'
  const item = c.item_codes?.length ? c.item_codes.map(termName).join(', ') : '모든 측정 항목'
  const period = c.from && c.to ? `${c.from}부터 ${c.to}까지` : '전체 기간'
  const lines = [
    `${site}의 ${item} 측정값을 ${period} 가져와, ${bucketLabel.value} ${metricLabel.value}을 냈어요.`,
  ]
  if (c.standard_set) {
    lines.push(`그리고 각 구간이 ${c.standard_set}(${c.region_grade ?? '-'})을 넘는지 표시했어요.`)
  }
  lines.push('측정일이 없는 행은 집계에서 제외했습니다.')
  return lines
})

// --- SQL 표시 ---

const viewMode = ref<'쉬운 말' | 'SQL' | '둘 다'>('둘 다')
const VIEW_SEGMENT = {
  '쉬운 말': { left: 1475, width: 116, radius: '20px 0px 0px 20px' },
  SQL: { left: 1591, width: 117, radius: '0px' },
  '둘 다': { left: 1708, width: 112, radius: '0px 20px 20px 0px' },
} as const

const showPlain = computed(() => viewMode.value !== 'SQL')
const showSql = computed(() => viewMode.value !== '쉬운 말')

const SQL_KEYWORDS =
  /\b(SELECT|FROM|WHERE|AND|OR|GROUP BY|ORDER BY|LIMIT|AS|IS NOT NULL|IS NULL|CASE|WHEN|THEN|ELSE|END|ROUND|AVG|SUM|COUNT|MAX|MIN|DATE_FORMAT|CAST|CHAR|ON|JOIN|IN)\b/g

type Token = { text: string; kind: 'kw' | 'str' | 'comment' | 'plain' }

/** 서버가 준 SQL 을 줄 단위로 쪼개고 키워드·문자열·주석만 구분해 색을 준다. */
const sqlLines = computed<Token[][]>(() => {
  const text = detail.value?.generated_sql ?? ''
  return text.split('\n').map((line) => {
    if (!line.trim()) return [{ text: ' ', kind: 'plain' as const }]
    if (line.trim().startsWith('--')) return [{ text: line, kind: 'comment' as const }]

    const tokens: Token[] = []
    // 문자열 먼저 떼어내야 그 안의 단어가 키워드로 물들지 않는다.
    const parts = line.split(/('[^']*')/g)
    for (const part of parts) {
      if (!part) continue
      if (part.startsWith("'")) {
        tokens.push({ text: part, kind: 'str' })
        continue
      }
      let last = 0
      SQL_KEYWORDS.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = SQL_KEYWORDS.exec(part)) !== null) {
        if (match.index > last) tokens.push({ text: part.slice(last, match.index), kind: 'plain' })
        tokens.push({ text: match[0], kind: 'kw' })
        last = match.index + match[0].length
      }
      if (last < part.length) tokens.push({ text: part.slice(last), kind: 'plain' })
    }
    return tokens
  })
})

// --- 배치 ---
// 쉬운 말 띠(230px)와 SQL 블록(디자인 532px)이 켜지고 꺼지면서 아래가 밀린다.

const SQL_LINE_H = 38
const SQL_PADDING = 72
const PLAIN_BAND_H = 230
const BASE_SQL_TOP = 1486
const BASE_SQL_H = 532

const plainBandH = computed(() => (showPlain.value ? PLAIN_BAND_H : 0))
const sqlTop = computed(() => BASE_SQL_TOP + (plainBandH.value - PLAIN_BAND_H))
const sqlHeight = computed(() =>
  showSql.value ? SQL_PADDING + sqlLines.value.length * SQL_LINE_H : 0,
)
/** SQL 카드 안쪽 내용이 디자인보다 얼마나 늘거나 줄었는지. */
const sqlShift = computed(() => sqlTop.value + sqlHeight.value - (BASE_SQL_TOP + BASE_SQL_H))

const MAPPING_TOP = 2291
const MAPPING_STEP = 73
const MAPPING_BASE_ROWS = 4
const mappingTop = (i: number) => MAPPING_TOP + sqlShift.value + i * MAPPING_STEP
const mappingShift = computed(
  () => (Math.max(1, origins.value.length) - MAPPING_BASE_ROWS) * MAPPING_STEP,
)
const mappingDividers = computed(() =>
  origins.value.slice(1).map((_, i) => mappingTop(i) + 59),
)

const RAW_TOP = 2869
const RAW_STEP = 104
const RAW_BASE_ROWS = 7
const rawShownRows = computed(() => measurements.value)
const afterMapping = computed(() => sqlShift.value + mappingShift.value)
const rawTop = (i: number) => RAW_TOP + afterMapping.value + i * RAW_STEP
const rawShift = computed(
  () => (Math.max(1, rawShownRows.value.length) - RAW_BASE_ROWS) * RAW_STEP,
)
const rawDividers = computed(() => [
  2737 + afterMapping.value,
  ...rawShownRows.value.slice(0, -1).map((_, i) => rawTop(i) + 70),
])

const footerTop = computed(() => 3707 + afterMapping.value + rawShift.value)
const designHeight = computed(() => BASE_HEIGHT + afterMapping.value + rawShift.value)

/*
 * 원본 행 표의 칸 좌표와 폭.
 *
 * 원본은 '원본 행' 칸이 178px 뿐이라 파일명(`…수질측정자료_최종본_v3.xlsx #15`)이
 * 측정일·지점·원본 컬럼 세 칸을 통째로 덮었다. 표 안쪽(120~1830)을 내용 길이에
 * 맞게 다시 나누고, 칸마다 폭을 줘서 넘치면 잘리게 한다.
 *
 * 키 이름은 원본 그대로다 — outlet 칸에 원본 컬럼, value 칸에 표준 용어,
 * limit 칸에 측정값이 들어간다.
 */
const RAW_COL = { no: 120, date: 470, site: 640, outlet: 960, value: 1230, limit: 1490, vsOver: 1660 }
const RAW_W = { no: 330, date: 150, site: 300, outlet: 250, value: 240, limit: 150, vsOver: 175 }

const dividers = computed(() => [634, 832, 1176, 2084 + sqlShift.value, 2187 + sqlShift.value])

/** 이 측정값 한 건이 어떻게 판정됐는지 보여주는 화면으로. */
function openRow(row: AnalysisMeasurement) {
  router.push({
    name: 'row-detail',
    query: {
      executionId: String(route.query.executionId ?? detail.value?.execution_id ?? ''),
      measurementId: String(row.measurement_id),
    },
  })
}

function formatDay(iso: string) {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
}

/**
 * 이 측정값이 기준을 벗어났는지.
 *
 * 분석 응답의 limits 를 항목별로 찾아 상·하한과 비교한다. pH 처럼 하한이 있는
 * 항목은 미달도 위반이다.
 */
function judge(row: AnalysisMeasurement) {
  const limit = detail.value?.limits.find((l) => l.item_code === row.item_code)
  if (!limit) return { text: '기준 없음', over: false }
  if (limit.limit_min !== undefined && row.value_num < limit.limit_min) {
    return { text: `하한 미달 -${Math.round(((limit.limit_min - row.value_num) / limit.limit_min) * 100)}%`, over: true }
  }
  if (row.value_num > limit.limit_max) {
    return { text: `상한 초과 +${Math.round(((row.value_num - limit.limit_max) / limit.limit_max) * 100)}%`, over: true }
  }
  return { text: '이내', over: false }
}

onMounted(load)
</script>

<template>
  <div :class="$style.viewport" :style="{ height: `${designHeight * scale}px` }">
  <div :class="$style.div"
       :style="{ transform: `translateX(${offsetX}px) scale(${scale})`, height: `${designHeight}px` }">
    <b :class="[$style.b, 'link']" @click="router.push('/data')">내 데이터</b>
    <div :class="[$style.div2, 'link']" @click="router.push('/ask')">분석하기</div>
    <div :class="[$style.div3, 'link']" @click="router.push('/open-api')">오픈 API 신청</div>
    <b :class="$style.b2">이 결과가 나온 근거</b>
    <img :class="[$style.wordmark, 'link']" :src="wordmark" alt="물어볼래" @click="router.push('/')" />
    <AccountMenu />
    <b :class="$style.b17">질문이 어떻게 해석되고, 어떤 데이터에서 어떻게 계산됐는지 전부 볼 수 있어요.</b>

    <!-- ① 질문 → ② 해석 → ③ 데이터 -->
    <div :class="$style.inner" />
    <div v-for="top in dividers" :key="top" :class="$style.divider" :style="{ top: `${top}px` }" />
    <div :class="$style.ellipseParent">
      <div :class="$style.ellipseDiv" />
      <b :class="$style.b31">1</b>
    </div>
    <b :class="$style.b34">사용자 질문</b>
    <b :class="$style.bod3">
      {{ question ? `“${question}”` : '질문 없이 조건을 직접 골라 실행한 분석이에요' }}
    </b>

    <div :class="$style.ellipseGroup">
      <div :class="$style.ellipseDiv" />
      <b :class="$style.b32">2</b>
    </div>
    <b :class="$style.b35">시스템 해석</b>
    <div :class="$style.interpretRow">
      <div v-for="chip in interpretChips" :key="chip" :class="$style.interpretChip" :title="chip">{{ chip }}</div>
      <div v-if="!interpretChips.length" :class="$style.interpretChip">
        {{ loading ? '불러오는 중이에요…' : '조건을 알 수 없어요' }}
      </div>
    </div>

    <div :class="$style.ellipseContainer">
      <div :class="$style.ellipseDiv" />
      <b :class="$style.b32">3</b>
    </div>
    <b :class="$style.b36">사용한 데이터</b>
    <b :class="[$style.xlsx, loadError && $style.noticeError]">
      {{ loadError || dataNote || '—' }}
      <template v-if="detail && !loadError">
        <br />사전 {{ detail.dictionary_version }} · 규칙 {{ detail.ruleset_version }}
      </template>
    </b>

    <!-- 생성된 SQL -->
    <div :class="$style.rectangleDiv" :style="{ height: `${1518 + sqlShift + mappingShift}px` }" />
    <b :class="$style.sql">생성된 SQL</b>
    <div :class="$style.child19" />
    <div :class="$style.child20" />
    <div :class="$style.child21" :style="{
      left: `${VIEW_SEGMENT[viewMode].left}px`,
      width: `${VIEW_SEGMENT[viewMode].width}px`,
      borderRadius: VIEW_SEGMENT[viewMode].radius,
    }" />
    <b :class="[$style.b37, viewMode === '쉬운 말' ? $style.viewOn : $style.viewOff, 'link']"
       @click="viewMode = '쉬운 말'">쉬운 말</b>
    <b :class="[$style.sql4, viewMode === 'SQL' ? $style.viewOn : $style.viewOff, 'link']"
       @click="viewMode = 'SQL'">SQL</b>
    <b :class="[$style.b38, viewMode === '둘 다' ? $style.viewOn : $style.viewOff, 'link']"
       @click="viewMode = '둘 다'">둘 다</b>

    <template v-if="showPlain">
      <div :class="$style.child22" />
      <b :class="$style.b39">쉬운 말로</b>
      <div :class="$style.bodContainer">
        <template v-for="(line, i) in plainText" :key="i"><br v-if="i" />{{ line }}</template>
      </div>
    </template>

    <div v-if="showSql" :class="$style.sqlBlock"
         :style="{ top: `${sqlTop}px`, height: `${sqlHeight}px` }">
      <div v-for="(tokens, i) in sqlLines" :key="i" :class="$style.sqlLine"><span
        v-for="(token, j) in tokens" :key="j"
        :class="{
          [$style.sqlKeyword]: token.kind === 'kw',
          [$style.sqlString]: token.kind === 'str',
          [$style.sqlComment]: token.kind === 'comment',
        }">{{ token.text }}</span></div>
      <div v-if="!sqlLines.length" :class="$style.sqlLine">
        <span :class="$style.sqlComment">-- 실행된 SQL 을 받지 못했어요</span>
      </div>
    </div>

    <!-- 항목 코드 ↔ 원본 컬럼 -->
    <div :class="$style.child2"
         :style="{ top: `${2275 + sqlShift}px`, height: `${Math.max(1, origins.length) * 73 + 2}px` }" />
    <b :class="$style.sql2" :style="{ top: `${2115 + sqlShift}px` }">이 분석이 쓴 항목이 원본 파일의 어느 컬럼에서 왔는지</b>
    <b :class="$style.sql3" :style="{ top: `${2204 + sqlShift}px` }">표준 용어</b>
    <b :class="$style.b28" :style="{ top: `${2204 + sqlShift}px` }">원본 컬럼</b>
    <b :class="$style.b29" :style="{ top: `${2204 + sqlShift}px` }">매핑 방식</b>
    <b :class="$style.b30" :style="{ top: `${2204 + sqlShift}px` }">파일</b>
    <div v-for="top in mappingDividers" :key="top" :class="$style.divider" :style="{ top: `${top}px` }" />

    <div v-if="!origins.length" :class="$style.mapEmpty" :style="{ top: `${mappingTop(0)}px` }">
      {{ loading ? '불러오는 중이에요…' : '이 분석이 쓴 항목의 원본 컬럼을 찾지 못했어요.' }}
    </div>
    <template v-for="(row, i) in origins" :key="`${row.code}-${row.raw}`">
      <b :class="$style.mapSqlCol" :style="{ top: `${mappingTop(i)}px` }"
         :title="termName(row.code)">{{ termName(row.code) }}</b>
      <b :class="$style.mapOrigCol" :style="{ top: `${mappingTop(i)}px` }" :title="row.raw">{{ row.raw }}</b>
      <div :class="$style.mapBadge" :style="{ top: `${mappingTop(i)}px` }">
        <div :class="row.auto ? $style.mapBadgeAuto : $style.mapBadgeHuman" />
        <b :class="[$style.mapBadgeText, !row.auto && $style.mapBadgeTextHuman]">
          {{ row.auto ? '자동 매핑' : '사람 확인' }}
        </b>
      </div>
      <div :class="$style.mapConfirm" :style="{ top: `${mappingTop(i)}px` }" :title="row.file">{{ row.file }}</div>
    </template>

    <!-- 기준을 넘은 측정값 -->
    <!-- 배경(띠·카드)을 먼저 깔고 제목을 올린다. 둘 다 absolute 라 나중에 그린 쪽이
         위로 올라오는데, 띠가 제목 뒤에 오면 글자를 덮어 버린다. -->
    <div :class="$style.child10" :style="{ top: `${2626 + afterMapping}px` }" />
    <div :class="$style.item"
         :style="{ top: `${2729 + afterMapping}px`, height: `${109 + Math.max(1, rawShownRows.length) * 104}px` }" />
    <b :class="$style.b18" :style="{ top: `${2660 + afterMapping}px` }">
      이 분석이 집계한 원본 행 · {{ measurementTotal }}건{{ measurementTotal > rawShownRows.length ? ` 중 앞 ${rawShownRows.length}건` : '' }}
    </b>
    <div v-for="top in rawDividers" :key="top" :class="$style.rawDivider" :style="{ top: `${top}px` }" />

    <b :class="$style.rawHead" :style="{ top: `${2767 + afterMapping}px`, left: `${RAW_COL.no}px` }">원본 행</b>
    <b :class="$style.rawHead" :style="{ top: `${2767 + afterMapping}px`, left: `${RAW_COL.date}px` }">측정일</b>
    <b :class="$style.rawHead" :style="{ top: `${2767 + afterMapping}px`, left: `${RAW_COL.site}px` }">지점 · 방류구</b>
    <b :class="$style.rawHead" :style="{ top: `${2767 + afterMapping}px`, left: `${RAW_COL.outlet}px` }">원본 컬럼</b>
    <b :class="$style.rawHead" :style="{ top: `${2767 + afterMapping}px`, left: `${RAW_COL.value}px` }">표준 용어</b>
    <b :class="$style.rawHead" :style="{ top: `${2767 + afterMapping}px`, left: `${RAW_COL.limit}px` }">측정값</b>
    <b :class="$style.rawHead" :style="{ top: `${2767 + afterMapping}px`, left: `${RAW_COL.vsOver}px` }">기준 대비</b>

    <div v-if="!rawShownRows.length" :class="$style.mapEmpty" :style="{ top: `${rawTop(0)}px` }">
      {{ loading ? '불러오는 중이에요…' : '집계에 쓰인 행이 없어요.' }}
    </div>
    <template v-for="(row, i) in rawShownRows" :key="row.measurement_id">
      <b :class="[$style.rawNo, $style.rawClip]"
         :style="{ top: `${rawTop(i)}px`, left: `${RAW_COL.no}px`, width: `${RAW_W.no}px` }"
         :title="`${row.filename} #${row.source_row + 1}`">{{ row.filename }} #{{ row.source_row + 1 }}</b>
      <div :class="[$style.rawCell, $style.rawClip]" :style="{ top: `${rawTop(i)}px`, left: `${RAW_COL.date}px`, width: `${RAW_W.date}px` }">{{ formatDay(row.measured_on) }}</div>
      <div :class="[$style.rawCell, $style.rawClip]" :style="{ top: `${rawTop(i)}px`, left: `${RAW_COL.site}px`, width: `${RAW_W.site}px` }"
           :title="`${row.site_name} · ${row.outlet}`">{{ row.site_name }} · {{ row.outlet }}</div>
      <div :class="[$style.rawCell, $style.rawClip]" :style="{ top: `${rawTop(i)}px`, left: `${RAW_COL.outlet}px`, width: `${RAW_W.outlet}px` }"
           :title="row.source_column">{{ row.source_column }}</div>
      <div :class="[$style.rawCell, $style.rawClip]" :style="{ top: `${rawTop(i)}px`, left: `${RAW_COL.value}px`, width: `${RAW_W.value}px` }"
           :title="termName(row.item_code)">{{ termName(row.item_code) }}</div>
      <component :is="judge(row).over ? 'b' : 'div'"
                 :class="[judge(row).over ? $style.rawCellOver : $style.rawCell, $style.rawClip]"
                 :style="{ top: `${rawTop(i)}px`, left: `${RAW_COL.limit}px`, width: `${RAW_W.limit}px` }">{{ row.value_text }}</component>
      <component :is="judge(row).over ? 'b' : 'div'"
                 :class="[judge(row).over ? $style.rawVsOver : $style.rawCell, $style.rawClip]"
                 :style="{ top: `${rawTop(i) + (judge(row).over ? 3 : 0)}px`, left: `${RAW_COL.vsOver}px`, width: `${RAW_W.vsOver}px` }">{{ judge(row).text }}</component>
      <!-- 행 전체를 눌러 이 한 건이 어떻게 판정됐는지로 들어간다 -->
      <div :class="[$style.rawRowHit, 'row-hit']" role="button"
           :style="{ top: `${rawTop(i) - 34}px` }" @click="openRow(row)" />
    </template>

    <div :class="$style.child18" :style="{ top: `${footerTop}px` }" />
    <div :class="[$style.div37, 'link']" @click="router.back()">←</div>
  </div>
  </div>
</template>

<style module>
/* 시스템 해석 칩 — 원본은 칩마다 좌표와 폭을 박아뒀다. 조건 개수와 글자 길이가
   데이터마다 달라서 flex 행으로 바꾸고 내용에 맞춰 늘어나게 둔다. */
.interpretRow {
  position: absolute;
  top: 736px;
  left: 169px;
  width: 1620px;
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: var(--font-body-03);
  color: #455772;
}
/* 지점·항목이 여럿이면 칩 하나가 줄 폭(1620)을 넘어 카드 밖으로 나간다.
   text-overflow 는 flex 컨테이너에 안 먹으므로 inline-block 으로 둔다. */
.interpretChip {
  display: inline-block;
  max-width: 100%;
  height: 54px;
  line-height: 50px;
  padding: 0 28px;
  box-sizing: border-box;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d0d0d0;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* 표에 보여줄 게 없을 때 첫 행 자리에 한 줄 */
.mapEmpty {
  position: absolute;
  left: 105px;
  line-height: 45px;
  font-weight: 500;
}
.noticeError {
  color: #d92d20;
}
/* 서비스 워드로고. 원래는 물방울 아이콘 위에 '물 / 볼래 / ㅓ' 글자를 겹쳐 만들었는데,
   Ria Sans 가 설치되지 않은 환경에서는 글자 폭이 달라져 어긋난다. 한 장으로 바꾼다. */
.wordmark {
  position: absolute;
  top: 82px;
  left: 50px;
  width: 144px;
  height: 35px;
}
.viewport {
  width: 100%;
  overflow: hidden;
  position: relative;
}
.div {
  width: 1920px;
  height: 4143px;
  position: relative;
  background-color: #f8f9fc;
  text-align: left;
  font-size: var(--font-body-03);
  color: #6b7280;
  font-family: Pretendard;
  transform-origin: top left;
}
/* 근거 화면은 분석 흐름에 속하므로 현재 섹션은 "분석하기" 다.
   <b> 태그의 기본 굵기를 눌러 비활성으로 되돌린다. */
.b {
  position: absolute;
  top: 85px;
  left: calc(50% - 676px);
  font-size: var(--font-body-02);
  font-weight: 500;
  color: #00559e;
  text-align: center;
}
.div2 {
  position: absolute;
  top: 85px;
  left: calc(50% - 528px);
  font-size: var(--font-body-02);
  font-weight: 700;
  text-decoration: underline;
  color: #00559e;
  text-align: center;
}
.div3 {
  position: absolute;
  top: 85px;
  left: calc(50% - 386px);
  font-size: var(--font-body-02);
  font-weight: 500;
  color: #00559e;
}
.b2 {
  position: absolute;
  top: 299px;
  left: calc(50% - 866px);
  font-size: var(--font-title-02);
  color: #0053e3;
}
.b3 {
  position: absolute;
  top: 0px;
  left: 0px;
  line-height: 35px;
}
.b17 {
  position: absolute;
  top: 364px;
  left: calc(50% - 866px);
  font-size: var(--font-body-03);
  line-height: 45px;
}
.inner {
  position: absolute;
  top: 451px;
  left: 50px;
  border-radius: 20px;
  background-color: #fbfbfb;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1820px;
  height: 560px;
}
/* 카드 내부 가로 구분선 (원본은 빈 img) */
.divider {
  position: absolute;
  left: 50px;
  width: 1820px;
  height: 1px;
  background-color: #d1d5db;
}
.ellipseParent {
  position: absolute;
  top: 498px;
  left: 94px;
  width: 45px;
  height: 45px;
  font-size: var(--font-body-02);
}
.ellipseDiv {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 50%;
  background-color: #e4e4e4;
  width: 45px;
  height: 45px;
}
.b31 {
  position: absolute;
  top: 0px;
  left: 16px;
  line-height: 45px;
}
.ellipseGroup {
  position: absolute;
  top: 674px;
  left: 94px;
  width: 45px;
  height: 45px;
  text-align: center;
  font-size: var(--font-body-02);
}
.b32 {
  position: absolute;
  top: 0px;
  left: 14px;
  line-height: 45px;
}
.ellipseContainer {
  position: absolute;
  top: 872px;
  left: 93px;
  width: 45px;
  height: 45px;
  text-align: center;
  font-size: var(--font-body-02);
}
.b34 {
  position: absolute;
  top: 498px;
  left: 169px;
  font-size: var(--font-body-02);
  line-height: 45px;
}
.b35 {
  position: absolute;
  top: 674px;
  left: 169px;
  font-size: var(--font-body-02);
  line-height: 45px;
}
.b36 {
  position: absolute;
  top: 872px;
  left: 168px;
  font-size: var(--font-body-02);
  line-height: 45px;
}
.bod3 {
  position: absolute;
  font-size: var(--font-body-02);
  top: 543px;
  left: 169px;
  line-height: 45px;
  color: #000;
}
.xlsx {
  position: absolute;
  top: 916px;
  left: 168px;
  line-height: 45px;
  color: #000;
}
.rectangleParent {
  position: absolute;
  top: 736px;
  left: 169px;
  width: 279px;
  height: 54px;
  font-size: var(--font-body-03);
  color: #455772;
}
.groupChild {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d0d0d0;
  box-sizing: border-box;
  width: 279px;
  height: 54px;
}
.div4 {
  position: absolute;
  top: 5px;
  left: 60px;
  line-height: 45px;
  font-weight: 600;
}
.rectangleGroup {
  position: absolute;
  top: 738px;
  left: 1404px;
  width: 259px;
  height: 54px;
  font-size: var(--font-body-03);
  color: #455772;
}
.groupItem {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d0d0d0;
  box-sizing: border-box;
  width: 259px;
  height: 54px;
}
.mgl {
  position: absolute;
  top: 5px;
  left: 51px;
  line-height: 45px;
  font-weight: 600;
}
.rectangleContainer {
  position: absolute;
  top: 736px;
  left: 461px;
  width: 251px;
  height: 54px;
  font-size: var(--font-body-03);
  color: #455772;
}
.groupInner {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d0d0d0;
  box-sizing: border-box;
  width: 251px;
  height: 54px;
}
.bod {
  position: absolute;
  top: 5px;
  left: 63px;
  line-height: 45px;
  font-weight: 600;
}
.groupDiv {
  position: absolute;
  top: 736px;
  left: 725px;
  width: 402px;
  height: 54px;
  font-size: var(--font-body-03);
  color: #455772;
}
.groupChild2 {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d0d0d0;
  box-sizing: border-box;
  width: 402px;
  height: 54px;
}
.div5 {
  position: absolute;
  top: 5px;
  left: 59px;
  line-height: 45px;
  font-weight: 600;
}
.rectangleParent2 {
  position: absolute;
  top: 737px;
  left: 1140px;
  width: 251px;
  height: 54px;
  font-size: var(--font-body-03);
  color: #455772;
}
.div6 {
  position: absolute;
  top: 5px;
  left: 46px;
  line-height: 45px;
  font-weight: 600;
}
.rectangleDiv {
  position: absolute;
  top: 1051px;
  left: 50px;
  border-radius: 20px;
  background-color: #f4f4f4;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1820px;
  height: 1518px;
}
.sql {
  position: absolute;
  font-size: var(--font-body-02);
  top: 1090px;
  left: 105px;
  line-height: 45px;
  display: inline-block;
  width: 143px;
}
.child19 {
  position: absolute;
  top: 1082px;
  left: 1475px;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 345px;
  height: 62px;
}
.child20 {
  position: absolute;
  top: 1082px;
  left: 1475px;
  border-radius: 20px 0px 0px 20px;
  background-color: #f8f9fc;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 233px;
  height: 62px;
}
.child21 {
  position: absolute;
  top: 1082px;
  left: 1475px;
  border-radius: 20px 0px 0px 20px;
  background-color: #6b7280;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 116px;
  height: 62px;
}
.b37 {
  position: absolute;
  top: 1090px;
  left: 1505px;
  font-size: var(--font-body-03);
  line-height: 45px;
}
/* 선택된 항목은 어두운 배경 위라 흰 글씨 */
.viewOn {
  color: #fff;
}
.viewOff {
  color: #6b7280;
}
.sql4 {
  position: absolute;
  top: 1090px;
  left: 1628px;
  font-size: var(--font-body-03);
  line-height: 45px;
}
.b38 {
  position: absolute;
  top: 1090px;
  left: 1742px;
  font-size: var(--font-body-03);
  line-height: 45px;
}
.child22 {
  position: absolute;
  top: 1177px;
  left: 52px;
  background-color: #eff5fe;
  width: 1816px;
  height: 230px;
}
.b39 {
  position: absolute;
  top: 1210px;
  left: 105px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #42a8ff;
}
.bodContainer {
  position: absolute;
  top: 1272px;
  left: 105px;
  line-height: 45px;
  color: #000;
}
.span {
  line-height: 45px;
}
/* 생성된 SQL — 원본은 스크린샷 이미지였으나 실제 텍스트로 렌더한다 */
.sqlBlock {
  position: absolute;
  top: 1486px;
  left: 121px;
  width: 1700px;
  height: 532px;
  box-sizing: border-box;
  margin: 0;
  padding: 36px 40px;
  border-radius: 12px;
  background-color: #fafafa;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'D2Coding', monospace;
  font-size: var(--font-code);
  line-height: 38px;
  color: #374151;
  /* 원본은 overflow: hidden 이라 카드보다 긴 SQL 줄이 통째로 잘려 안 보였다.
     세로는 스크립트가 줄 수만큼 높이를 잡아 주므로 가로만 밀어서 본다. */
  overflow-x: auto;
  overflow-y: hidden;
}
.sqlLine {
  white-space: pre;
}
/* 정렬은 전부 CSS로 잡는다 — Vue 템플릿 컴파일러가 연속 공백을 한 칸으로 접기 때문.
   ch 단위는 monospace 한 글자 폭이라 원본의 칸 수를 그대로 옮길 수 있다. */
/* AS 정렬 열 — 600px 는 28px 기준이라 크기가 바뀌면 어긋났다. 글자 폭에
   비례하는 ch 로 바꿔 어떤 크기에서도 같은 자리에 맞춘다. */
.sqlSelectRow {
  display: grid;
  grid-template-columns: 36ch 1fr;
  padding-left: 4ch;
}
.sqlClauseRow {
  display: grid;
  grid-template-columns: 8ch 1fr;
}
.sqlAndIndent {
  padding-left: 2ch;
}
.sqlTrailComment {
  padding-left: 8ch;
  color: #9ca3af;
}
.sqlKeyword {
  color: #4338ca;
  font-weight: 700;
}
.sqlString {
  color: #15803d;
}
.sqlComment {
  color: #9ca3af;
}
.child2 {
  position: absolute;
  top: 2275px;
  left: 52px;
  border-radius: 0px 0px 18px 18px;
  background-color: #fbfbfb;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1816px;
  height: 294px;
}
.sql2 {
  position: absolute;
  top: 2115px;
  left: 105px;
  line-height: 45px;
  display: inline-block;
  width: 607px;
}
.sql3 {
  position: absolute;
  top: 2204px;
  left: 105px;
  line-height: 45px;
  display: inline-block;
  width: 126px;
}
.b28 {
  position: absolute;
  top: 2204px;
  left: 424px;
  line-height: 45px;
  display: inline-block;
  width: 126px;
}
.b29 {
  position: absolute;
  top: 2204px;
  left: 766px;
  line-height: 45px;
  display: inline-block;
  width: 126px;
}
.b30 {
  position: absolute;
  top: 2204px;
  left: 1136px;
  line-height: 45px;
  display: inline-block;
  text-align: center;
  width: 126px;
}
 /* 원본은 196px 이라 '노말헥산추출물질(동식물유지류)' 같은 실제 용어가 두 줄이
   되며 다음 행을 침범했다. 원본 컬럼 열(424) 앞까지 쓰고 한 줄로 자른다. */
.mapSqlCol {
  position: absolute;
  left: 105px;
  line-height: 45px;
  display: inline-block;
  color: #000;
  width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
 /* 원본은 126px 이었지만 '생물화학적산소요구량' 같은 실제 용어가 줄바꿈되며
   다음 행을 침범한다. 매핑 방식 열(764) 앞까지 쓰고 한 줄로 자른다. */
.mapOrigCol {
  position: absolute;
  left: 424px;
  line-height: 45px;
  display: inline-block;
  color: #000;
  width: 320px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mapBadge {
  position: absolute;
  left: 764px;
  width: 131px;
  height: 45px;
  font-size: var(--font-body-03);
}
.mapBadgeAuto {
  position: absolute;
  top: 3px;
  left: 0px;
  border-radius: 20px;
  background-color: #d9d9d9;
  width: 131px;
  height: 39px;
}
.mapBadgeHuman {
  position: absolute;
  top: 3px;
  left: 0px;
  border-radius: 20px;
  background-color: #e2f8f0;
  width: 131px;
  height: 39px;
}
.mapBadgeText {
  position: absolute;
  top: 0px;
  left: 28px;
  line-height: 45px;
}
.mapBadgeTextHuman {
  color: #00a26a;
}
/* 확인자가 없을 때의 "-" 와 이름·시각이 같은 중심(1199px)에 오도록 넓게 잡는다 */
.mapConfirm {
  position: absolute;
  left: 1057px;
  line-height: 45px;
  color: #000;
  text-align: center;
  display: inline-block;
  width: 284px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.b18 {
  position: absolute;
  font-size: var(--font-body-02);
  top: 2660px;
  left: 105px;
  line-height: 45px;
  display: inline-block;
  width: 607px;
}
.child10 {
  position: absolute;
  top: 2626px;
  left: 50px;
  border-radius: 20px 20px 0px 0px;
  background-color: #f1f7ff;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1820px;
  height: 202px;
}
.item {
  position: absolute;
  top: 2729px;
  left: 50px;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1820px;
  height: 837px;
}
.child23 {
  position: absolute;
  left: 52px;
  border-radius: 0px 0px 18px 18px;
  background-color: rgba(255, 0, 0, 0.06);
  width: 1816px;
}
.rawDivider {
  position: absolute;
  left: 50px;
  width: 1820px;
  height: 1px;
  background-color: #d1d5db;
}
.rawHead {
  position: absolute;
  top: 2767px;
  font-size: var(--font-body-03);
}
.rawNo {
  position: absolute;
  line-height: 36px;
  color: #000;
}
.rawCell {
  position: absolute;
  line-height: 36px;
  font-weight: 500;
}
.rawCellOver {
  position: absolute;
  line-height: 36px;
  color: #ff0000;
}
.rawVsOver {
  position: absolute;
  font-size: var(--font-body-03);
  color: #ff0000;
}
/* 표 칸은 폭 안에서 한 줄로 자른다. 전체 값은 title 로 본다. */
.rawClip {
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* 초과 행 클릭 영역 — 셀들 위에 투명하게 덮는다 */
.rawRowHit {
  position: absolute;
  left: 52px;
  width: 1816px;
  height: 104px;
}
.child18 {
  position: absolute;
  top: 3707px;
  left: -100px;
  background-color: #f3f3f3;
  width: 2120px;
  height: 244px;
}
.div37 {
  position: absolute;
  top: 210px;
  left: 50px;
  font-size: var(--font-title-02);
  font-weight: 600;
  color: #00559e;
  text-align: center;
}
</style>
