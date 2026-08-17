<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import wordmark from '../assets/wordmark.svg'
import profileIcon from '../assets/profile.svg'
import caretDownIcon from '../assets/caret-down.svg'
import { useDesignScale } from '../composables/useDesignScale'
import { useTermNames } from '../composables/useTermNames'
import { ApiError, getAnalysis, parseConditions, runAnalysis } from '../api'
import type { AnalysisRequest, AnalysisResult, Bucket } from '../api'

const DESIGN_WIDTH = 1920
const BASE_HEIGHT = 2683

const { scale, offsetX } = useDesignScale(DESIGN_WIDTH)
const router = useRouter()
const route = useRoute()
const { loadTerms, termName } = useTermNames()

// --- 결과 가져오기 ---
//
// GET /analyses/{id} 가 집계 결과까지 준다. 조건 화면에서 바로 넘어온 경우에는
// 방금 받은 값이 history state 에 실려 있어 왕복을 한 번 아낀다.
const result = ref<AnalysisResult | null>(null)
const conditions = ref<AnalysisRequest | null>(null)
const loading = ref(true)
const loadError = ref('')
const rerunning = ref(false)

function describe(error: unknown, fallback: string) {
  return error instanceof ApiError &&
    error.code !== 'HTTP_ERROR' &&
    error.code !== 'NETWORK_ERROR'
    ? error.message
    : fallback
}

async function load() {
  loading.value = true
  loadError.value = ''
  void loadTerms()
  try {
    const carried = window.history.state?.analysis as AnalysisResult | undefined
    if (carried?.series) {
      result.value = carried
      conditions.value = (window.history.state?.conditions as AnalysisRequest) ?? null
      selectFirstItem()
      return
    }
    const executionId = String(route.query.executionId ?? '')
    if (!executionId) {
      loadError.value = '볼 분석 결과가 없어요. 분석 조건을 먼저 골라주세요.'
      return
    }
    const detail = await getAnalysis(executionId)
    result.value = {
      execution_id: detail.execution_id,
      assumptions: detail.assumptions ?? [],
      series: detail.series ?? [],
      limits: detail.limits ?? [],
      exceeded_count: detail.exceeded_count,
      meta: {
        execution_id: detail.execution_id,
        dictionary_version: detail.dictionary_version,
        ruleset_version: detail.ruleset_version,
        row_count: detail.row_count,
        elapsed_ms: detail.elapsed_ms,
        truncated: detail.truncated,
        generated_sql: detail.generated_sql,
      },
    }
    conditions.value = parseConditions(detail)
    selectFirstItem()
  } catch (error) {
    loadError.value = describe(error, '분석 결과를 불러오지 못했어요. 잠시 후 다시 시도해 주세요')
  } finally {
    loading.value = false
  }
}

/** 조건을 바꿔 다시 돌린다. 새 분석이라 이력에 한 줄 더 남는다. */
async function rerun(overrides: Partial<AnalysisRequest> = {}) {
  if (!conditions.value || rerunning.value) return
  rerunning.value = true
  loadError.value = ''
  try {
    const next = { ...conditions.value, ...overrides }
    const fresh = await runAnalysis(next)
    result.value = fresh
    conditions.value = next
    selectFirstItem()
  } catch (error) {
    loadError.value = describe(error, '다시 분석하지 못했어요. 잠시 후 다시 시도해 주세요')
  } finally {
    rerunning.value = false
  }
}

// --- 라벨 ---

const BUCKET_LABEL: Record<string, string> = {
  month: '월별', quarter: '분기별', year: '연도별', none: '기간 전체',
}
const METRIC_LABEL: Record<string, string> = {
  avg: '평균', max: '최대', min: '최소', count: '건수',
}
const metricLabel = computed(() => METRIC_LABEL[conditions.value?.metric ?? 'avg'] ?? '')
const bucketLabel = computed(() => BUCKET_LABEL[conditions.value?.bucket ?? 'none'] ?? '')

// --- 항목 선택 ---
// series 에 여러 항목이 섞여 올 수 있다. 그래프는 기준선이 항목마다 달라서
// 한 번에 한 항목만 그린다.

const itemCodes = computed(() => [...new Set((result.value?.series ?? []).map((p) => p.item_code))])
const selectedItem = ref('')

/** 결과를 받으면 첫 항목을 골라둔다. 비워두면 select 가 빈 칸으로 보인다. */
function selectFirstItem() {
  if (!selectedItem.value || !itemCodes.value.includes(selectedItem.value)) {
    selectedItem.value = itemCodes.value[0] ?? ''
  }
}
const activeItem = computed(() => selectedItem.value || itemCodes.value[0] || '')

const itemSeries = computed(() =>
  (result.value?.series ?? []).filter((p) => p.item_code === activeItem.value),
)
const itemLimit = computed(
  () => result.value?.limits.find((l) => l.item_code === activeItem.value) ?? null,
)
const valueUnit = computed(() => itemSeries.value[0]?.unit ?? itemLimit.value?.unit ?? '')

// --- 차트 ---
// 원본은 12개월 x 좌표와 0~4 눈금을 박아뒀다. 구간 수와 값 범위가 데이터마다
// 달라서 축을 계산으로 바꾼다. 그리는 영역은 디자인 좌표 그대로 유지한다.

const PLOT_LEFT = 221
const PLOT_RIGHT = 1743
const AXIS_ZERO_Y = 1835
const PLOT_HEIGHT = 440.5
const GRID_STEPS = 4
const MONTH_LABEL_WIDTH = 90

/**
 * 눈금 간격을 고른다.
 *
 * 후보가 성기면 축이 데이터보다 훨씬 커진다 — 1·2·2.5·5 만 쓰면 최대 95.4 인
 * 데이터에 0~200 축이 잡혀 그래프가 아래쪽에만 눌린다. 사이 값을 더 둔다.
 */
const STEP_FACTORS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 8, 10]

function niceStep(raw: number) {
  if (raw <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  for (const factor of STEP_FACTORS) {
    if (factor * magnitude >= raw) return factor * magnitude
  }
  return 10 * magnitude
}

const axisMax = computed(() => {
  const values = itemSeries.value.map((p) => p.value)
  const limit = Math.max(itemLimit.value?.limit_max ?? 0, itemLimit.value?.limit_min ?? 0)
  const peak = Math.max(...values, limit, 0)
  // 가장 높은 점이 천장에 붙지 않도록 10% 여유를 둔다.
  return niceStep((peak * 1.1) / GRID_STEPS) * GRID_STEPS
})

const toY = (value: number) => AXIS_ZERO_Y - (value / axisMax.value) * PLOT_HEIGHT
const toX = (i: number, total: number) =>
  total <= 1 ? (PLOT_LEFT + PLOT_RIGHT) / 2 : PLOT_LEFT + (i * (PLOT_RIGHT - PLOT_LEFT)) / (total - 1)

/**
 * 기준 위반 판정.
 *
 * pH 처럼 범위로 규정된 항목은 하한(limit_min)도 있다. 상한만 보면 pH 5.0 같은
 * 값을 정상으로 표시하게 되는데 서버는 '하한 미달' 로 센다(2026-08-17 확인).
 */
function violationOf(value: number) {
  const limit = itemLimit.value
  if (!limit) return null
  if (limit.limit_min !== undefined && value < limit.limit_min) {
    return { kind: 'under' as const, rate: Math.round(((limit.limit_min - value) / limit.limit_min) * 100) }
  }
  if (value > limit.limit_max) {
    return { kind: 'over' as const, rate: Math.round(((value - limit.limit_max) / limit.limit_max) * 100) }
  }
  return null
}

const points = computed(() =>
  itemSeries.value.map((p, i) => {
    const violation = violationOf(p.value)
    return {
      x: toX(i, itemSeries.value.length),
      y: toY(p.value),
      over: violation !== null,
      violation,
      label: p.bucket,
      value: p.value,
      n: p.n,
      missing: p.missing,
    }
  }),
)
const linePath = computed(() => points.value.map((p) => `${p.x},${p.y}`).join(' '))
const gridValues = computed(() =>
  Array.from({ length: GRID_STEPS + 1 }, (_, i) => (axisMax.value / GRID_STEPS) * i),
)
const thresholdY = computed(() => (itemLimit.value ? toY(itemLimit.value.limit_max) : null))
const thresholdMinY = computed(() =>
  itemLimit.value?.limit_min !== undefined ? toY(itemLimit.value.limit_min) : null,
)

/** 눈금 라벨 — 정수면 그대로, 아니면 소수 한 자리. */
const axisText = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1))

// --- 요약 ---

const overPoints = computed(() => points.value.filter((p) => p.over))
const summaryHead = computed(() => {
  if (!result.value) return ''
  const site = conditions.value?.site_names?.length ? conditions.value.site_names.join(', ') : '전체 지점'
  const limit = itemLimit.value
  const head = `${site} ${termName(activeItem.value)} ${bucketLabel.value} ${metricLabel.value}`
  if (!limit) return `${head} · 기준선 없음`
  const range =
    limit.limit_min !== undefined
      ? `${limit.limit_min}~${limit.limit_max}${limit.unit ?? ''}`
      : `${limit.limit_max}${limit.unit ?? ''}`
  return `${head}, 기준 ${range} 벗어남 ${overPoints.value.length}구간`
})
const summaryNote = computed(() => {
  if (!result.value) return ''
  const parts: string[] = []
  if (overPoints.value.length) {
    const worst = overPoints.value.reduce((a, b) => ((a.violation?.rate ?? 0) > (b.violation?.rate ?? 0) ? a : b))
    const how = worst.violation?.kind === 'under' ? '하한 미달' : '상한 초과'
    parts.push(`${worst.label} ${worst.value}${valueUnit.value} ${how} ${worst.violation?.rate}%`)
  }
  if (result.value.assumptions.length) parts.push(...result.value.assumptions)
  return parts.join(' · ') || '기준을 넘은 구간이 없어요'
})

// --- 조건 칩 ---

const conditionChips = computed(() => {
  const c = conditions.value
  if (!c) return []
  return [
    { label: '지점', value: c.site_names?.length ? c.site_names.join(', ') : '전체' },
    { label: '항목', value: termName(activeItem.value) || '전체' },
    { label: '기간', value: c.from && c.to ? `${c.from} ~ ${c.to}` : '전체' },
    { label: '집계', value: `${bucketLabel.value} ${metricLabel.value}` },
    { label: '기준치', value: c.standard_set ? `${c.standard_set} · ${c.region_grade ?? '-'}` : '없음' },
  ]
})

// --- 집계 단위 세그먼트 ---
// 단위를 바꾸면 조건이 달라진 것이므로 실제로 다시 돌린다.

const UNIT_SEGMENT = {
  month: { left: 156, width: 82, radius: '20px 0px 0px 20px', label: '월' },
  quarter: { left: 238, width: 100, radius: '0px', label: '분기' },
  year: { left: 338, width: 78, radius: '0px 20px 20px 0px', label: '연' },
} as const
const UNIT_KEYS = ['month', 'quarter', 'year'] as const
const unit = computed<Bucket>(() => (conditions.value?.bucket ?? 'month') as Bucket)
const segment = computed(() => UNIT_SEGMENT[(unit.value in UNIT_SEGMENT ? unit.value : 'month') as keyof typeof UNIT_SEGMENT])

function changeBucket(next: Bucket) {
  if (next === unit.value || rerunning.value || !result.value) return
  rerun({ bucket: next })
}

// --- 탭 ---

const caret = { backgroundImage: `url("${caretDownIcon}")` }
const activeTab = ref<'graph' | 'table' | 'exceed'>('graph')
const TAB_UNDERLINE = {
  graph: { left: 50, width: 137 },
  table: { left: 226, width: 137 },
  exceed: { left: 396, width: 180 },
} as const

const EXCEED_OFFSET = 298
const tabOffset = computed(() => (activeTab.value === 'exceed' ? EXCEED_OFFSET : 0))

// --- 기준 초과 KPI ---

const kpiCards = computed(() => {
  const total = points.value.length
  const over = overPoints.value
  const limit = itemLimit.value
  const worst = over.length
    ? over.reduce((a, b) => ((a.violation?.rate ?? 0) > (b.violation?.rate ?? 0) ? a : b))
    : null
  const measured = points.value.reduce((sum, p) => sum + p.n, 0)
  const missing = points.value.reduce((sum, p) => sum + p.missing, 0)
  const bound = limit?.limit_min !== undefined ? `${limit.limit_min}~${limit.limit_max}` : limit?.limit_max

  return [
    {
      label: '기준 벗어남', value: String(over.length), suffix: `/${total}`,
      accent: over.length > 0,
      note: over.length ? over.map((p) => p.label).join(' · ') : '기준을 벗어난 구간이 없어요',
      cardLeft: 50, cardWidth: 565, textLeft: 101,
    },
    {
      label: '최대 이탈률',
      value: worst ? `${worst.violation?.kind === 'under' ? '-' : '+'}${worst.violation?.rate}%` : '-',
      suffix: '',
      accent: over.length > 0,
      note: worst && limit ? `${worst.label} ${worst.value}${limit.unit ?? ''} (기준 ${bound})` : '해당 없음',
      cardLeft: 677, cardWidth: 566, textLeft: 729,
    },
    {
      label: '측정 건수', value: String(measured), suffix: '',
      accent: false,
      note: `${total}개 구간 합계 · 결측 ${missing}건`,
      cardLeft: 1305, cardWidth: 566, textLeft: 1357,
    },
  ]
})

// --- 표 ---

const TABLE_ROW_TOP = 1290
const TABLE_ROW_STEP = 104
const BASE_ROWS = 7
const TABLE_COL = { bucket: 120, value: 500, count: 850, missing: 1150, vsLimit: 1453 } as const

const tableRows = computed(() =>
  points.value.map((p) => {
    const limit = itemLimit.value
    let vsLimit = '이내'
    if (!limit) vsLimit = '기준 없음'
    else if (p.violation?.kind === 'over') vsLimit = `상한 초과 +${p.violation.rate}%`
    else if (p.violation?.kind === 'under') vsLimit = `하한 미달 -${p.violation.rate}%`
    return {
      bucket: p.label,
      value: String(p.value),
      count: String(p.n),
      missing: String(p.missing),
      vsLimit,
      over: p.over,
    }
  }),
)

const rowTop = (i: number) => TABLE_ROW_TOP + i * TABLE_ROW_STEP + tabOffset.value
const rowDividerTop = computed(() => tableRows.value.slice(0, -1).map((_, i) => rowTop(i) + 70))
// 초과 행이 이어져 있을 때만 하이라이트로 묶는다.
const overHighlight = computed(() => {
  const first = tableRows.value.findIndex((r) => r.over)
  if (first === -1) return null
  const last = tableRows.value.map((r) => r.over).lastIndexOf(true)
  return { top: rowTop(first) - 33, height: (last - first + 1) * TABLE_ROW_STEP }
})

// 표가 길어지거나 짧아진 만큼 아래가 밀린다.
const tableShift = computed(() =>
  activeTab.value === 'graph' ? 0 : (Math.max(1, tableRows.value.length) - BASE_ROWS) * TABLE_ROW_STEP,
)
const designHeight = computed(() => BASE_HEIGHT + tabOffset.value + tableShift.value)

function goToEvidence() {
  if (!result.value) return
  const q = String(route.query.q ?? '')
  router.push({
    name: 'evidence',
    query: { executionId: result.value.execution_id, ...(q ? { q } : {}) },
  })
}

onMounted(load)
</script>

<template>
  <div :class="$style.viewport" :style="{ height: `${designHeight * scale}px` }">
  <div :class="$style.div" :style="{ transform: `translateX(${offsetX}px) scale(${scale})`, height: `${designHeight}px` }">
    <b :class="[$style.b, 'link']" @click="router.push('/data')">내 데이터</b>
    <div :class="[$style.div2, 'link']" @click="router.push('/ask')">분석하기</div>
    <div :class="$style.div3">문의하기</div>
    <b :class="$style.bod">분석 결과</b>
    <img :class="[$style.wordmark, 'link']" :src="wordmark" alt="물어볼래" @click="router.push('/')" />
    <img :class="$style.profile" :src="profileIcon" alt="내 프로필" />

    <!-- 요약 -->
    <div :class="$style.item" />
    <b :class="$style.bod25">
      {{ loading ? '결과를 불러오는 중이에요…' : loadError ? '결과를 볼 수 없어요' : summaryHead }}
    </b>
    <div :class="[$style.mgl, loadError && $style.noticeError]">
      {{ loadError || summaryNote }}
    </div>
    <template v-if="result">
      <div :class="$style.div4">기준 벗어남</div>
      <b :class="$style.b5">{{ overPoints.length }}/{{ points.length }}</b>
    </template>

    <div :class="$style.inner" :style="{ top: `${2439 + tabOffset + tableShift}px` }" />

    <!-- 조건 칩 — 원본은 칩마다 폭과 글자 위치를 박아뒀다. 실제 값(긴 용어명,
         'YYYY-MM-DD ~ YYYY-MM-DD' 기간)이 상자를 넘쳐서 내용에 맞춰 늘어나게 둔다. -->
    <div v-if="conditions" :class="$style.chipRow">
      <div v-for="chip in conditionChips" :key="chip.label" :class="$style.conditionChip">
        <span :class="$style.chipLabel">{{ chip.label }}</span>
        <b :class="$style.chipValue">{{ chip.value }}</b>
      </div>
    </div>

    <!-- 탭 -->
    <b :class="[$style.b6, activeTab === 'graph' ? $style.tabActive : $style.tabIdle, 'link']"
       @click="activeTab = 'graph'">추이 그래프</b>
    <b :class="[$style.b7, activeTab === 'table' ? $style.tabActive : $style.tabIdle, 'link']"
       @click="activeTab = 'table'">표 결과</b>
    <b :class="[$style.b8, activeTab === 'exceed' ? $style.tabActive : $style.tabIdle, 'link']"
       @click="activeTab = 'exceed'">기준 초과 분석</b>
    <div :class="$style.child2" />
    <div :class="$style.child3"
         :style="{ left: `${TAB_UNDERLINE[activeTab].left}px`, width: `${TAB_UNDERLINE[activeTab].width}px` }" />

    <!-- 집계 단위 — 바꾸면 조건이 달라진 것이라 실제로 다시 돌린다 -->
    <b :class="$style.b9">집계단위</b>
    <div :class="$style.child4" />
    <div :class="$style.child8" />
    <div :class="$style.child9" :style="{
      left: `${segment.left}px`, width: `${segment.width}px`, borderRadius: segment.radius,
    }" />
    <b v-for="(key, ui) in UNIT_KEYS" :key="key"
       :class="[[$style.b11, $style.b12, $style.b13][ui], result ? 'link' : $style.unitOff]"
       @click="changeBucket(key)">{{ UNIT_SEGMENT[key].label }}</b>

    <!-- 원본의 '비교' 자리 — 서버에 비교 기능이 없다. series 에 여러 항목이 섞여
         오므로 그래프에 그릴 항목을 고르는 자리로 쓴다. -->
    <b :class="$style.b10">항목</b>
    <select v-model="selectedItem" :class="[$style.tabSelect, $style.compareSelect]"
            :style="caret" aria-label="표시할 측정 항목">
      <option v-for="code in itemCodes" :key="code" :value="code">{{ termName(code) }}</option>
      <option v-if="!itemCodes.length" value="">항목 없음</option>
    </select>

    <b :class="$style.sql" :style="{ top: `${2209 + tabOffset + tableShift}px` }">이 숫자가 어떻게 나왔는지 확인할 수 있어요 - 생성된 SQL과 원본 데이터 행</b>

    <!-- 결과가 없으면 탭 내용 대신 한 줄로 알린다 -->
    <template v-if="!result">
      <div :class="$style.child10" />
      <div :class="[$style.emptyNotice, loadError && $style.noticeError]">
        {{ loading ? '결과를 불러오는 중이에요…' : loadError || '집계된 구간이 없어요.' }}
      </div>
    </template>

    <template v-else-if="activeTab === 'graph'">
      <div :class="$style.child10" />
      <!-- 조건은 멀쩡한데 걸린 값이 없을 때. 대개 기간이 데이터 밖이다. -->
      <div v-if="!points.length" :class="$style.emptyNotice">
        이 조건에 맞는 측정값이 없어요.
        <template v-if="conditions?.from && conditions?.to">
          기간을 {{ conditions.from }} ~ {{ conditions.to }} 로 두었는데 그 사이 데이터가 없습니다.
        </template>
      </div>
      <b :class="$style.bod4">{{ conditionChips[0].value }} {{ termName(activeItem) }} {{ bucketLabel }} {{ metricLabel }}</b>
      <div :class="$style.mgl2">
        단위 {{ valueUnit || '-' }}
        <template v-if="itemLimit">
          · 기준
          <template v-if="itemLimit.limit_min !== undefined">{{ itemLimit.limit_min }}~</template>{{ itemLimit.limit_max }}
          ({{ conditions?.standard_set }} {{ conditions?.region_grade }})
        </template>
        <template v-else> · 기준선 없음</template>
      </div>
      <b v-if="overPoints.length" :class="$style.b19">기준 벗어남 {{ overPoints.length }}구간</b>
      <b v-if="itemLimit && thresholdY !== null" :class="$style.b20"
         :style="{ top: `${thresholdY - 52}px` }">상한 {{ itemLimit.limit_max }}</b>
      <b v-if="itemLimit && thresholdMinY !== null" :class="$style.b20"
         :style="{ top: `${thresholdMinY - 52}px` }">하한 {{ itemLimit.limit_min }}</b>

      <svg :class="$style.chart" viewBox="200 1370 1560 490" role="img"
           :aria-label="`${termName(activeItem)} ${bucketLabel} ${metricLabel} 추이, 기준 벗어남 ${overPoints.length}구간`">
        <g :class="$style.grid">
          <line v-for="v in gridValues" :key="v" :x1="221" :x2="1743" :y1="toY(v)" :y2="toY(v)" />
        </g>
        <line v-if="thresholdY !== null" :class="$style.thresholdLine"
              :x1="221" :x2="1743" :y1="thresholdY" :y2="thresholdY" />
        <line v-if="thresholdMinY !== null" :class="$style.thresholdLine"
              :x1="221" :x2="1743" :y1="thresholdMinY" :y2="thresholdMinY" />
        <polyline v-if="points.length > 1" :class="$style.trendLine" :points="linePath" />
        <circle v-for="(p, i) in points" :key="i" :cx="p.x" :cy="p.y" r="12.5"
                :class="p.over ? $style.dotOver : $style.dot" />
        <text v-for="(p, i) in points.filter((q) => q.over)" :key="`t${i}`"
              :x="p.x" :y="p.y - 24" :class="$style.dotValue" text-anchor="middle">{{ p.value }}</text>
      </svg>

      <div v-for="(p, i) in points" :key="`m${i}`" :class="$style.monthLabel"
           :style="{ left: `${p.x - MONTH_LABEL_WIDTH / 2}px`, width: `${MONTH_LABEL_WIDTH}px` }">{{ p.label }}</div>
      <div v-for="v in gridValues" :key="`y${v}`" :class="$style.axisLabel"
           :style="{ top: `${toY(v) - 22}px` }">{{ axisText(v) }}</div>

      <div :class="$style.child38" />
      <b :class="$style.bod5">{{ termName(activeItem) }} {{ metricLabel }}</b>
      <template v-if="itemLimit">
        <div :class="$style.child39" />
        <b :class="$style.mgl3">
          기준치
          <template v-if="itemLimit.limit_min !== undefined">{{ itemLimit.limit_min }}~</template>{{ itemLimit.limit_max }}
          {{ itemLimit.unit ?? '' }}
        </b>
        <div :class="$style.child37" />
        <b :class="$style.b22">기준 벗어남 (값 직접 표기)</b>
      </template>
      <b :class="$style.b23">{{ result.meta.row_count }}행 · {{ result.meta.elapsed_ms }}ms · 사전 {{ result.meta.dictionary_version }}</b>
    </template>

    <!-- 표 결과 / 기준 초과 분석 -->
    <template v-else>
      <template v-if="activeTab === 'exceed'">
        <template v-for="card in kpiCards" :key="card.label">
          <div :class="$style.kpiCard" :style="{ left: `${card.cardLeft}px`, width: `${card.cardWidth}px` }" />
          <b :class="$style.kpiLabel" :style="{ left: `${card.textLeft}px` }">{{ card.label }}</b>
          <b :class="[$style.kpiValue, card.accent && $style.kpiValueAccent]" :style="{ left: `${card.textLeft}px` }">
            <span>{{ card.value }}</span><span v-if="card.suffix" :class="$style.kpiSuffix">{{ card.suffix }}</span>
          </b>
          <div :class="$style.kpiNote" :style="{ left: `${card.textLeft}px` }">{{ card.note }}</div>
        </template>
      </template>

      <div :class="$style.tableCard"
           :style="{ top: `${1150 + tabOffset}px`, height: `${99 + Math.max(1, tableRows.length) * 104 + 10}px` }" />
      <div :class="$style.tableHeaderBg" :style="{ top: `${1150 + tabOffset}px` }" />
      <div v-if="overHighlight" :class="$style.tableOverHighlight"
           :style="{ top: `${overHighlight.top}px`, height: `${overHighlight.height}px` }" />
      <div v-for="top in rowDividerTop" :key="top" :class="$style.tableDivider" :style="{ top: `${top}px` }" />

      <b :class="$style.tableHead" :style="{ top: `${1185 + tabOffset}px`, left: `${TABLE_COL.bucket}px` }">구간</b>
      <b :class="$style.tableHead" :style="{ top: `${1170 + tabOffset}px`, left: `${TABLE_COL.value}px` }">{{ metricLabel }}<br/>({{ valueUnit || '-' }})</b>
      <b :class="$style.tableHead" :style="{ top: `${1185 + tabOffset}px`, left: `${TABLE_COL.count}px` }">측정 건수</b>
      <b :class="$style.tableHead" :style="{ top: `${1185 + tabOffset}px`, left: `${TABLE_COL.missing}px` }">결측</b>
      <b :class="$style.tableHead" :style="{ top: `${1185 + tabOffset}px`, left: `${TABLE_COL.vsLimit}px` }">기준 대비</b>

      <div v-if="!tableRows.length" :class="$style.emptyRow" :style="{ top: `${rowTop(0)}px` }">
        집계된 구간이 없어요.
      </div>
      <template v-for="(row, i) in tableRows" :key="i">
        <b :class="$style.tableMonth" :style="{ top: `${rowTop(i)}px`, left: `${TABLE_COL.bucket}px` }">{{ row.bucket }}</b>
        <div :class="$style.tableCell" :style="{ top: `${rowTop(i)}px`, left: `${TABLE_COL.value}px` }">{{ row.value }}</div>
        <div :class="$style.tableCell" :style="{ top: `${rowTop(i)}px`, left: `${TABLE_COL.count}px` }">{{ row.count }}</div>
        <div :class="$style.tableCell" :style="{ top: `${rowTop(i)}px`, left: `${TABLE_COL.missing}px` }">{{ row.missing }}</div>
        <component :is="row.over ? 'b' : 'div'"
                   :class="row.over ? $style.tableCellOver : $style.tableCell"
                   :style="{ top: `${rowTop(i)}px`, left: `${TABLE_COL.vsLimit}px` }">{{ row.vsLimit }}</component>
      </template>
    </template>

    <div :class="$style.child40" :style="{ top: `${2132 + tabOffset + tableShift}px` }" />
    <div :class="[$style.rectangleParent3, result ? 'btn' : $style.rerunOff]" role="button"
         :style="{ top: `${2201 + tabOffset + tableShift}px` }" @click="result && goToEvidence()">
      <div :class="[$style.groupChild3, result && 'btn-fill']" />
      <b :class="$style.b24">근거 상세 보기 →</b>
    </div>
    <div :class="[$style.div26, 'link']" @click="router.push('/conditions')">←</div>
  </div>
  </div>
</template>

<style module>
/* y축 눈금 라벨 — 값 범위가 데이터마다 달라 좌표를 계산해 붙인다. */
.axisLabel {
  position: absolute;
  left: 140px;
  width: 62px;
  text-align: right;
  line-height: 45px;
  font-weight: 500;
}
/* 기준을 넘은 점 위에 값 직접 표기 */
.dotValue {
  fill: #ff0000;
  font-size: 24px;
  font-weight: 700;
  font-family: Pretendard;
}
/* 결과가 아직 없을 때 그래프 카드 안에 뜨는 한 줄 */
.emptyNotice {
  position: absolute;
  top: 1560px;
  left: 0px;
  width: 1920px;
  text-align: center;
  line-height: 45px;
  font-weight: 500;
}
.emptyRow {
  position: absolute;
  left: 120px;
  line-height: 45px;
  font-weight: 500;
}
.noticeError {
  color: #d92d20;
}
.rerunOff {
  cursor: not-allowed;
  opacity: 0.45;
}
/* 결과가 없으면 집계 단위를 바꿔봐야 돌릴 게 없다. */
.unitOff {
  cursor: not-allowed;
  opacity: 0.5;
}
/* 조건 칩 줄 — 원본 첫 칩 위치(93, 373)에서 시작해 내용만큼 늘어난다. */
.chipRow {
  position: absolute;
  top: 373px;
  left: 93px;
  width: 1740px;
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: var(--font-body-03);
  color: #455772;
}
.conditionChip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 54px;
  padding: 0 28px;
  box-sizing: border-box;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d0d0d0;
  white-space: nowrap;
  max-width: 100%;
}
.chipLabel {
  color: #9ca3af;
  flex-shrink: 0;
}
.chipValue {
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
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
  height: 2683px;
  position: relative;
  background-color: #f8f9fc;
  text-align: left;
  font-size: var(--font-body-03);
  color: #6b7280;
  font-family: Pretendard;
  transform-origin: top left;
}
/* 결과 화면은 분석 흐름에 속하므로 현재 섹션은 "분석하기" 다.
   <b> 태그의 기본 굵기를 눌러 비활성으로 되돌린다. */
.b {
  position: absolute;
  font-size: var(--font-body-02);
  top: 85px;
  left: calc(50% - 676px);
  font-weight: 500;
  color: #00559e;
  text-align: center;
}
.div2 {
  position: absolute;
  font-size: var(--font-body-02);
  top: 85px;
  left: calc(50% - 528px);
  font-weight: 700;
  text-decoration: underline;
  color: #00559e;
  text-align: center;
}
.div3 {
  position: absolute;
  font-size: var(--font-body-02);
  top: 85px;
  left: calc(50% - 386px);
  font-weight: 500;
  color: #00559e;
}
.bod {
  position: absolute;
  top: 299px;
  left: calc(50% - 866px);
  font-size: var(--font-title-02);
  color: #0053e3;
}
.b2 {
  position: absolute;
  top: 0px;
  left: 0px;
  line-height: 35px;
}
/* 프로필 자리 — 헤더 세로중심 100, 오른쪽 여백 50px */
.profile {
  position: absolute;
  top: 76px;
  left: 1822px;
  border-radius: 50%;
  width: 48px;
  height: 48px;
}
.item {
  position: absolute;
  top: 592px;
  left: 50px;
  box-shadow: 3px 3px 20px 3px rgba(0, 83, 227, 0.1);
  border-radius: 30px;
  background-color: #f9fcff;
  width: 1820px;
  height: 199px;
}
.bod25 {
  position: absolute;
  top: 647px;
  left: 103px;
  font-size: var(--font-title-03);
  line-height: 45px;
  color: #000;
}
.mgl {
  position: absolute;
  top: 694px;
  left: 103px;
  line-height: 45px;
  font-weight: 500;
}
.div4 {
  position: absolute;
  top: 694px;
  left: 1713px;
  line-height: 45px;
  font-weight: 500;
}
.inner {
  position: absolute;
  top: 2439px;
  left: -100px;
  background-color: #f3f3f3;
  width: 2120px;
  height: 244px;
}
.b5 {
  position: absolute;
  top: 645px;
  left: calc(50% + 762px);
  font-size: var(--font-title-02);
  color: #0053e3;
}
.b6 {
  position: absolute;
  top: 931px;
  left: 50px;
  font-size: var(--font-body-02);
  line-height: 45px;
}
.b7 {
  position: absolute;
  top: 931px;
  left: 251px;
  font-size: var(--font-body-02);
  line-height: 45px;
}
.b8 {
  position: absolute;
  top: 931px;
  left: 402px;
  font-size: var(--font-body-02);
  line-height: 45px;
}
/* 선택된 비교 옵션 */
.chipOn {
  background-color: #d6e8fa;
  border-color: #0053e3;
}
.tabActive {
  color: #0053e3;
}
.tabIdle {
  color: #9ca3af;
}
.child2 {
  position: absolute;
  top: 993px;
  left: 50px;
  background-color: #d9d9d9;
  width: 1820px;
  height: 2px;
}
.child3 {
  position: absolute;
  top: 992px;
  left: 50px;
  background-color: #0053e3;
  width: 137px;
  height: 4px;
}
.b9 {
  position: absolute;
  top: 1039px;
  left: 50px;
  line-height: 45px;
}
.b10 {
  position: absolute;
  top: 1039px;
  left: 508px;
  line-height: 45px;
  text-align: center;
}
.child4 {
  position: absolute;
  top: 1031px;
  left: 156px;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 260px;
  height: 62px;
}
.child5 {
  position: absolute;
  top: 1031px;
  left: 593px;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 174px;
  height: 62px;
}
.child6 {
  position: absolute;
  top: 1031px;
  left: 779px;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 174px;
  height: 62px;
}
.child7 {
  position: absolute;
  top: 1031px;
  left: 965px;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 174px;
  height: 62px;
}
.child8 {
  position: absolute;
  top: 1031px;
  left: 156px;
  border-radius: 20px 0px 0px 20px;
  background-color: #f8f9fc;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 182px;
  height: 62px;
}
.child9 {
  position: absolute;
  top: 1031px;
  left: 156px;
  border-radius: 20px 0px 0px 20px;
  background-color: #d6e8fa;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 82px;
  height: 62px;
}
.b11 {
  position: absolute;
  top: 1039px;
  left: 186px;
  line-height: 45px;
}
.b12 {
  position: absolute;
  top: 1039px;
  left: 264px;
  line-height: 45px;
}
.b13 {
  position: absolute;
  top: 1039px;
  left: 364px;
  line-height: 45px;
}
.b14 {
  position: absolute;
  top: 1039px;
  left: 623px;
  line-height: 45px;
  text-align: center;
}
.b15 {
  position: absolute;
  top: 1039px;
  left: 812px;
  line-height: 45px;
  text-align: center;
}
.b16 {
  position: absolute;
  top: 1039px;
  left: 998px;
  line-height: 45px;
  text-align: center;
}
/* Figma 는 이 caret 을 상자 세로 중앙보다 8.5px 아래로 내보냈다.
   상자 1031~1093(62px), 아이콘 9px → 중앙은 1057.5 이다. */
.polygonIcon {
  position: absolute;
  top: 1057.5px;
  left: 728px;
  width: 9px;
  height: 9px;
}

/* ── 표 결과 탭 ─────────────────────────────── */
/* 비교 컨트롤 (단일 드롭다운) */
/* 표 · 기준초과 탭의 드롭다운 — 원본은 상자 + 라벨 + 화살표 이미지로 된 가짜
   드롭다운이었다. 화살표 위치는 원본 아이콘 좌표를 그대로 옮겼다. */
.tabSelect {
  position: absolute;
  top: 1031px;
  height: 62px;
  box-sizing: border-box;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 1px solid #d1d5db;
  background-repeat: no-repeat;
  background-size: 9px 9px;
  -webkit-appearance: none;
  appearance: none;
  outline: none;
  font-family: inherit;
  font-size: var(--font-body-03);
  color: #6b7280;
  cursor: pointer;
}
.tabSelect:focus {
  border-color: #0053e3;
}
.compareSelect {
  left: 593px;
  width: 252px;
  padding: 0 45px 0 27px;
  background-position: right 27px center;
}
.thresholdSelect {
  left: 613px;
  width: 299px;
  padding: 0 42px 0 23px;
  background-position: right 24px center;
}
/* 표 본체 */
.tableCard {
  position: absolute;
  left: 50px;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1820px;
  height: 837px;
}
.tableHeaderBg {
  position: absolute;
  left: 50px;
  border-radius: 20px 20px 0px 0px;
  background-color: #f1f7ff;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1820px;
  height: 99px;
}
.tableOverHighlight {
  position: absolute;
  left: 52px;
  border-radius: 0px 0px 18px 18px;
  background-color: rgba(255, 0, 0, 0.06);
  width: 1816px;
}
.tableDivider {
  position: absolute;
  left: 50px;
  width: 1820px;
  height: 1px;
  background-color: #d1d5db;
}
.tableHead {
  position: absolute;
  font-size: var(--font-body-03);
  line-height: 30px;
}
.tableMonth {
  position: absolute;
  font-size: var(--font-body-03);
  line-height: 36px;
  color: #000;
}
.tableCell {
  position: absolute;
  font-size: var(--font-body-03);
  line-height: 36px;
  font-weight: 500;
}
.tableCellOver {
  position: absolute;
  font-size: var(--font-body-03);
  line-height: 36px;
  color: #ff0000;
}
.tableDeltaUp {
  position: absolute;
  font-size: var(--font-body-03);
  line-height: 30px;
  color: #ff0000;
}
.tableDeltaDown {
  position: absolute;
  font-size: var(--font-body-03);
  line-height: 30px;
  color: #00a26a;
}

/* ── 기준 초과 분석 탭 ──────────────────────── */
/* 기준치 세트 드롭다운 */
.thresholdSetLabel {
  position: absolute;
  top: 1039px;
  left: 473px;
  font-size: var(--font-body-03);
  line-height: 45px;
  text-align: center;
}
/* KPI 카드 */
.kpiCard {
  position: absolute;
  top: 1147px;
  box-shadow: 3px 4px 10px 5px rgba(0, 0, 0, 0.2);
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  height: 240px;
  opacity: 0.2;
}
.kpiLabel {
  position: absolute;
  top: 1178px;
  font-size: var(--font-body-03);
  line-height: 45px;
}
.kpiValue {
  position: absolute;
  top: 1231px;
  font-size: var(--font-metric);
  color: #000;
}
.kpiValueAccent {
  color: #ff0000;
}
.kpiSuffix {
  font-size: var(--font-title-02);
  color: #6b7280;
}
.kpiNote {
  position: absolute;
  top: 1311px;
  font-size: var(--font-body-03);
  line-height: 45px;
  font-weight: 500;
}

.child10 {
  position: absolute;
  top: 1148px;
  left: 50px;
  box-shadow: 3px 4px 10px 10px rgba(214, 232, 250, 0.2);
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 2px solid #d6e8fa;
  box-sizing: border-box;
  width: 1820px;
  height: 922px;
}
.bod4 {
  position: absolute;
  top: 1199px;
  left: 101px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #000;
}
.sql {
  position: absolute;
  top: 2209px;
  left: 103px;
  font-size: var(--font-body-03);
  line-height: 45px;
  color: #9ca3af;
}
.b17 {
  position: absolute;
  top: 1394px;
  left: 868px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #ff0000;
}
.b18 {
  position: absolute;
  top: 1420px;
  left: 1137px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #ff0000;
}
.b19 {
  position: absolute;
  top: 1291px;
  left: 959px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #ff0000;
}
.b20 {
  position: absolute;
  left: 1560px;
  line-height: 45px;
  color: #9ca3af;
}
.b21 {
  position: absolute;
  top: 1342px;
  left: 1001px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #ff0000;
}
.mgl2 {
  position: absolute;
  top: 1246px;
  left: 103px;
  line-height: 45px;
  font-weight: 500;
  white-space: pre-wrap;
}
.chart {
  position: absolute;
  top: 1370px;
  left: 200px;
  width: 1560px;
  height: 490px;
  overflow: visible;
  pointer-events: none;
}
.grid line {
  stroke: #e5e7eb;
  stroke-width: 2;
}
.thresholdLine {
  stroke: #9ca3af;
  stroke-width: 2;
  stroke-dasharray: 12 10;
}
.trendLine {
  fill: none;
  stroke: #00559e;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.dot {
  fill: #00559e;
}
.dotOver {
  fill: #ff0000;
}
/* 월 레이블 — 원본은 12개 좌표를 하나씩 박아 25px 기준으로 데이터 점 아래
   중앙을 맞췄다. 글자 크기가 바뀌면 어긋나므로 고정 폭 상자에 가운데 정렬해
   점 좌표에서 직접 계산한다. */
.monthLabel {
  position: absolute;
  top: 1843px;
  width: 60px;
  text-align: center;
  line-height: 45px;
  font-weight: 500;
}

.div10 {
  position: absolute;
  top: 1813px;
  left: 178px;
  line-height: 45px;
  font-weight: 500;
}
.div11 {
  position: absolute;
  top: 1706px;
  left: 182px;
  line-height: 45px;
  font-weight: 500;
}
.div12 {
  position: absolute;
  top: 1590px;
  left: 179px;
  line-height: 45px;
  font-weight: 500;
}
.div13 {
  position: absolute;
  top: 1483px;
  left: 179px;
  line-height: 45px;
  font-weight: 500;
}
.div14 {
  position: absolute;
  top: 1372px;
  left: 179px;
  line-height: 45px;
  font-weight: 500;
}
.child37 {
  position: absolute;
  top: 1966px;
  left: 563px;
  border-radius: 50%;
  background-color: #ff0000;
  width: 23px;
  height: 23px;
}
/* 범례 표식 — 실선(BOD 월평균) / 점선(기준치) */
.child38 {
  position: absolute;
  top: 1978px;
  left: 103px;
  width: 32.5px;
  height: 4px;
  background-color: #00559e;
}
.child39 {
  position: absolute;
  top: 1978px;
  left: 310px;
  width: 32.5px;
  height: 0;
  border-top: 4px dashed #9ca3af;
}
.bod5 {
  position: absolute;
  top: 1955px;
  left: 151px;
  line-height: 45px;
  color: #9ca3af;
}
.mgl3 {
  position: absolute;
  top: 1955px;
  left: 358px;
  line-height: 45px;
  color: #9ca3af;
}
.b22 {
  position: absolute;
  top: 1955px;
  left: 597px;
  line-height: 45px;
  color: #9ca3af;
}
.b23 {
  position: absolute;
  top: 1955px;
  left: 866px;
  line-height: 45px;
  color: #9ca3af;
}
.child40 {
  position: absolute;
  top: 2132px;
  left: 50px;
  filter: drop-shadow(3px 4px 10px rgba(214, 232, 250, 0.2));
  border-radius: 30px;
  border: 2px solid #d6e8fa;
  box-sizing: border-box;
  width: 1820px;
  height: 199px;
}
.rectangleParent3 {
  position: absolute;
  top: 2201px;
  left: calc(50% + 576px);
  width: 243.2px;
  height: 48px;
  text-align: center;
  font-size: var(--font-body-03);
  color: #fff;
}
.groupChild3 {
  position: absolute;
  top: 0px;
  left: calc(50% - 121.6px);
  border-radius: 10px;
  background-color: #004ec2;
  width: 243.2px;
  height: 48px;
}
.b24 {
  position: absolute;
  top: 0px;
  left: 49px;
  line-height: 48px;
  display: inline-block;
  width: 145px;
  height: 45px;
}
.div26 {
  position: absolute;
  top: 210px;
  left: 50px;
  font-size: var(--font-title-02);
  font-weight: 600;
  color: #00559e;
  text-align: center;
}
</style>
