<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import wordmark from '../assets/wordmark.svg'
import profileIcon from '../assets/profile.svg'
import { useDesignScale } from '../composables/useDesignScale'
import {
  ApiError,
  getAnalysis,
  getAnalysisMeasurements,
  getFilePreview,
  getMapping,
  listReviews,
  parseConditions,
} from '../api'
import type {
  AnalysisDetail,
  AnalysisMeasurement,
  AnalysisRequest,
  FilePreview,
  MappedColumn,
  ReviewItem,
} from '../api'
import { useTermNames } from '../composables/useTermNames'

const DESIGN_WIDTH = 1920
const BASE_HEIGHT = 2940

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
const columns = ref<MappedColumn[]>([])
const preview = ref<FilePreview | null>(null)
const reviews = ref<ReviewItem[]>([])

const executionId = computed(() => String(route.query.executionId ?? ''))
const measurementId = computed(() => Number(route.query.measurementId))

/** 이 화면이 설명하는 측정값 한 건. */
const target = computed(
  () => measurements.value.find((m) => m.measurement_id === measurementId.value) ?? null,
)

async function load() {
  loading.value = true
  loadError.value = ''
  void loadTerms()
  try {
    if (!executionId.value || !Number.isInteger(measurementId.value)) {
      loadError.value = '어떤 측정값의 근거인지 알 수 없어요. 근거 화면에서 행을 눌러 들어와 주세요.'
      return
    }
    const [analysis, page] = await Promise.all([
      getAnalysis(executionId.value),
      // 앞뒤 행까지 보여줘야 해서 한 번에 넉넉히 받는다.
      getAnalysisMeasurements(executionId.value, { size: 500 }),
    ])
    detail.value = analysis
    conditions.value = parseConditions(analysis)
    measurements.value = page.items

    const fileId = target.value?.file_id
    if (fileId) {
      // 매핑·검수는 이 측정값이 나온 파일 것만 있으면 된다.
      const [mapping, reviewPage, filePreview] = await Promise.all([
        getMapping(fileId).catch(() => null),
        listReviews({ file_id: fileId, status: 'all', size: 200 }).catch(() => null),
        // 원본 행은 파일 미리보기에서 가져온다. 측정값 API 는 분석 조건에 걸린
        // 컬럼만 주기 때문에 그것만으로는 원본 한 줄을 복원할 수 없다.
        getFilePreview(fileId).catch(() => null),
      ])
      columns.value = mapping?.columns ?? []
      reviews.value = reviewPage?.items ?? []
      preview.value = filePreview
    }
    if (!target.value) {
      loadError.value = '이 분석에서 해당 측정값을 찾지 못했어요.'
    }
  } catch (error) {
    loadError.value =
      error instanceof ApiError && error.code !== 'HTTP_ERROR' && error.code !== 'NETWORK_ERROR'
        ? error.message
        : '근거를 불러오지 못했어요. 잠시 후 다시 시도해 주세요'
  } finally {
    loading.value = false
  }
}

// --- 원본 데이터 행 ---
//
// 파일 미리보기가 준 원본 줄을 그대로 쓴다. 대상 행과 그 앞뒤 한 줄씩 보여준다.

const targetRowIndex = computed(() => {
  const rows = preview.value?.rows ?? []
  const at = target.value?.source_row ?? -1
  if (at < 0 || at >= rows.length) return -1
  return at
})

const shownRows = computed(() => {
  const rows = preview.value?.rows ?? []
  const at = targetRowIndex.value
  if (at === -1) return []
  const from = Math.max(0, at - 1)
  return rows.slice(from, at + 2).map((cells, i) => ({ index: from + i, cells }))
})

/** 표에 세울 컬럼. 자리가 다섯 칸이라 대상 컬럼이 보이도록 창을 민다. */
const valueColumns = computed(() => {
  const all = preview.value?.columns ?? []
  const at = all.indexOf(target.value?.source_column ?? '')
  const start = Math.max(
    0,
    Math.min(Math.max(0, at - 3), Math.max(0, all.length - VALUE_LEFTS.length)),
  )
  return all.slice(start, start + VALUE_LEFTS.length).map((name, i) => ({ name, index: start + i }))
})

// --- 판정 ---

const limit = computed(
  () => detail.value?.limits.find((l) => l.item_code === target.value?.item_code) ?? null,
)

const verdict = computed(() => {
  const value = target.value?.value_num
  const l = limit.value
  if (value === undefined || !l) return { text: '기준 없음', danger: false, note: '적용할 기준치가 없어요' }
  if (l.limit_min !== undefined && value < l.limit_min) {
    const rate = Math.round(((l.limit_min - value) / l.limit_min) * 100)
    return { text: `하한 미달 -${rate}%`, danger: true, note: `${value} < ${l.limit_min}` }
  }
  if (value > l.limit_max) {
    const rate = Math.round(((value - l.limit_max) / l.limit_max) * 100)
    return { text: `상한 초과 +${rate}%`, danger: true, note: `${value} ÷ ${l.limit_max} = ${(value / l.limit_max).toFixed(2)}` }
  }
  return { text: '기준 이내', danger: false, note: `${value} ≤ ${l.limit_max}` }
})

const limitText = computed(() => {
  const l = limit.value
  if (!l) return '-'
  return l.limit_min !== undefined ? `${l.limit_min}~${l.limit_max}` : String(l.limit_max)
})

/** 상자 안쪽에 한 줄로 들어가는 길이. 넘으면 글자를 줄여 설명과 겹치지 않게 한다. */
const STEP_ONE_LINE = 8

const verdictSteps = computed(() => [
  {
    left: 93, width: 295, label: '원본 값', danger: false,
    value: target.value?.value_text ?? '-',
    note: target.value ? `${target.value.source_row + 1}행 · ${target.value.source_column} 열` : '',
  },
  {
    left: 471, width: 295, label: '표준 용어', danger: false,
    value: termName(target.value?.item_code) || '-',
    note: target.value?.item_code ?? '',
  },
  {
    left: 849, width: 295, label: '기준치', danger: false,
    value: limitText.value,
    note: conditions.value?.region_grade
      ? `${conditions.value.standard_set ?? ''} ${conditions.value.region_grade}`.trim()
      : '지역 구분 미지정',
  },
  {
    left: 1227, width: 334, label: '판정', danger: verdict.value.danger,
    value: verdict.value.text,
    note: verdict.value.note,
  },
])
const arrowLeft = [411, 789, 1167]

// --- 이 판정에 쓰인 컬럼 ---

function decidedReview(raw: string) {
  return reviews.value
    .filter((r) => r.raw === raw && r.verdict)
    .sort((a, b) => (b.reviewed_at ?? '').localeCompare(a.reviewed_at ?? ''))[0]
}

/** 이 행에 실제로 등장한 컬럼만. 파일 전체 매핑을 다 보여주면 관계없는 줄이 섞인다. */
const mappingRows = computed(() => {
  const used = new Set(valueColumns.value.map((c) => c.name))
  return columns.value
    .filter((c) => used.has(c.raw) || c.raw === target.value?.source_column)
    .map((c) => {
      const decided = decidedReview(c.raw)
      return {
        origCol: c.raw,
        stdTerm: c.code ? termName(c.code) : '매칭 없음',
        byHuman: Boolean(decided),
        badge: decided ? '사람 확인' : '자동 매핑',
        confirm: decided
          ? `${decided.reviewed_by ?? '미상'} ${formatMoment(decided.reviewed_at)}`
          : '-',
      }
    })
})

// --- 표시용 ---

function formatDay(iso?: string) {
  if (!iso) return '-'
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return iso.slice(0, 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
}

function formatMoment(iso?: string) {
  if (!iso) return ''
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(at.getMonth() + 1)}-${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())}`
}

const headline = computed(() => {
  if (loading.value) return '근거를 불러오는 중이에요'
  if (loadError.value || !target.value) return '근거를 볼 수 없어요'
  const unit = limit.value?.unit ?? ''
  return `${formatDay(target.value.measured_on)} · ${target.value.value_text}${unit}의 근거`
})

const sourceNote = computed(() => {
  const t = target.value
  if (!t) return ''
  return `원본 데이터 행 — ${t.filename} · ${t.source_row + 1}행 · ${t.source_column} 열 · ${t.site_name} 방류구 ${t.outlet} · ${formatDay(t.measured_on)}`
})

/** 이 값이 어떤 집계에 들어갔는지. */
const rollupNote = computed(() => {
  const t = target.value
  if (!t || !detail.value) return ''
  const same = measurements.value.filter(
    (m) => m.item_code === t.item_code && m.measured_on.slice(0, 7) === t.measured_on.slice(0, 7),
  )
  const month = t.measured_on.slice(0, 7)
  return `이 값은 ${month} ${termName(t.item_code)} 집계에 포함됐어요 (같은 달 ${same.length}건 중 1건)`
})

const plainText = computed(() => {
  const c = conditions.value
  if (!c) return ''
  const site = c.site_names?.length ? c.site_names.join(', ') : '모든 지점'
  const item = c.item_codes?.length ? c.item_codes.map(termName).join(', ') : '모든 측정 항목'
  const period = c.from && c.to ? `${c.from}부터 ${c.to}까지` : '전체 기간'
  return `${site}의 ${item} 측정값을 ${period} 가져온 결과 ${detail.value?.row_count ?? 0}개 구간이 나왔고, 이 행은 그중 하나에 들어갑니다.`
})

// --- 배치 ---
// 원본 행 표는 세 줄, 판정에 쓰인 컬럼 표는 줄 수가 달라진다.

 /* 행 번호 한 칸 + 파일 컬럼 일곱 칸. 측정일·지점은 파일 컬럼에 이미 들어 있어
   따로 두면 중복이고, 이웃 행에는 대상 행 값이 잘못 박힌다. */
const RAW_COL = { no: 105 }
const VALUE_LEFTS = [262, 531, 761, 974, 1204, 1430, 1690]
const RAW_ROW_TOP = 715
const RAW_ROW_STEP = 82
const rawRowTop = (i: number) => RAW_ROW_TOP + i * RAW_ROW_STEP
const rawDividers = computed(() => [
  588,
  ...shownRows.value.slice(1).map((_, i) => RAW_ROW_TOP - 33 + (i + 1) * RAW_ROW_STEP),
])

const MAPPING_TOP = 2229
const MAPPING_STEP = 73
const BASE_MAPPING_ROWS = 4
const mappingTop = (i: number) => MAPPING_TOP + i * MAPPING_STEP
const mappingShift = computed(
  () => (Math.max(1, mappingRows.value.length) - BASE_MAPPING_ROWS) * MAPPING_STEP,
)
const designHeight = computed(() => BASE_HEIGHT + mappingShift.value)
const cardDividers = computed(() => {
  const fixed = [1788, 2022, 2125]
  const rows = mappingRows.value.slice(1).map((_, i) => 2288 + i * MAPPING_STEP)
  return [...fixed, ...rows]
})

const viewMode = ref<'쉬운 말' | 'SQL' | '둘 다'>('쉬운 말')
const VIEW_SEGMENT = {
  '쉬운 말': { left: 1475, width: 116, radius: '20px 0px 0px 20px' },
  SQL: { left: 1591, width: 117, radius: '0px' },
  '둘 다': { left: 1708, width: 112, radius: '0px 20px 20px 0px' },
} as const
const showPlain = computed(() => viewMode.value !== 'SQL')
const showSql = computed(() => viewMode.value !== '쉬운 말')

function backToEvidence() {
  router.push({
    name: 'evidence',
    query: executionId.value ? { executionId: executionId.value } : {},
  })
}

onMounted(load)
</script>

<template>
  <div :class="$style.viewport" :style="{ height: `${designHeight * scale}px` }">
  <div :class="$style.div"
       :style="{ transform: `translateX(${offsetX}px) scale(${scale})`, height: `${designHeight}px` }">
    <b :class="[$style.b, 'link']" @click="router.push('/data')">내 데이터</b>
    <div :class="[$style.div2, 'link']" @click="router.push('/ask')">분석하기</div>
    <div :class="$style.div3">문의하기</div>
    <b :class="$style.mgl">{{ headline }}</b>
    <img :class="[$style.wordmark, 'link']" :src="wordmark" alt="물어볼래" @click="router.push('/')" />
    <img :class="$style.profile" :src="profileIcon" alt="내 프로필" />
    <b :class="[$style.b35, loadError && $style.noticeError]">
      {{ loadError || '이 한 건이 어디서 왔고, 어떻게 판정됐는지 보여드려요' }}
    </b>

    <template v-if="target">
      <!-- 원본 데이터 행 — 측정값을 원본 행 단위로 되묶어 보여준다 -->
      <div :class="$style.item" />
      <div :class="$style.inner" />
      <b :class="$style.xlsx">{{ sourceNote }}</b>
      <div v-for="top in rawDividers" :key="top" :class="$style.divider" :style="{ top: `${top}px` }" />
      <b :class="$style.rawHead" :style="{ left: `${RAW_COL.no}px` }">원본 행</b>
      <b v-for="(col, c) in valueColumns" :key="col.name" :class="$style.rawHead"
         :style="{ left: `${VALUE_LEFTS[c]}px` }">{{ col.name }}</b>

      <template v-for="(row, i) in shownRows" :key="row.index">
        <b :class="[$style.rawCell, row.index === targetRowIndex && $style.rawCellTarget]"
           :style="{ top: `${rawRowTop(i)}px`, left: `${RAW_COL.no}px` }">{{ row.index + 1 }}행</b>
        <b v-for="(col, c) in valueColumns" :key="col.name"
           :class="[$style.rawCell,
                    row.index === targetRowIndex && $style.rawCellTarget,
                    row.index === targetRowIndex && col.name === target.source_column && $style.rawCellPicked]"
           :style="{ top: `${rawRowTop(i)}px`, left: `${VALUE_LEFTS[c]}px` }">
          {{ row.cells[col.index] ?? '-' }}
        </b>
      </template>

      <!-- 판정 과정 -->
      <div :class="$style.child17" />
      <b :class="$style.b61">이 값이 어떻게 판정됐는지</b>
      <template v-for="step in verdictSteps" :key="step.label">
        <div :class="$style.stepBox" :style="{ left: `${step.left}px`, width: `${step.width}px` }">
          <div :class="step.danger ? $style.stepBoxBgDanger : $style.stepBoxBg" />
          <b :class="$style.stepLabel">{{ step.label }}</b>
          <b :class="[$style.stepValue,
                      step.danger && $style.stepValueDanger,
                      step.value.length > STEP_ONE_LINE && $style.stepValueLong]">{{ step.value }}</b>
          <div :class="$style.stepNote">{{ step.note }}</div>
        </div>
      </template>
      <div v-for="left in arrowLeft" :key="left" :class="$style.stepArrow" :style="{ left: `${left}px` }">→</div>
      <div :class="$style.divider" :style="{ top: '1386px' }" />
      <b :class="$style.mgl3">{{ rollupNote }}</b>

      <!-- 이 행을 가져온 조건 -->
      <div :class="$style.rectangleDiv" />
      <b :class="$style.b36">이 행을 가져온 조건</b>
      <div :class="$style.child9" />
      <div :class="$style.child10" />
      <div :class="$style.child11" :style="{
        left: `${VIEW_SEGMENT[viewMode].left}px`,
        width: `${VIEW_SEGMENT[viewMode].width}px`,
        borderRadius: VIEW_SEGMENT[viewMode].radius,
      }" />
      <b :class="[$style.b48, viewMode === '쉬운 말' ? $style.viewOn : $style.viewOff, 'link']"
         @click="viewMode = '쉬운 말'">쉬운 말</b>
      <b :class="[$style.sql2, viewMode === 'SQL' ? $style.viewOn : $style.viewOff, 'link']"
         @click="viewMode = 'SQL'">SQL</b>
      <b :class="[$style.b49, viewMode === '둘 다' ? $style.viewOn : $style.viewOff, 'link']"
         @click="viewMode = '둘 다'">둘 다</b>

      <template v-if="showPlain">
        <div :class="$style.child12" />
        <b :class="$style.b50">쉬운 말로</b>
        <div :class="$style.bod3">{{ plainText }}</div>
      </template>
      <div v-if="showSql" :class="$style.sqlBlock">{{ detail?.generated_sql }}</div>

      <!-- 이 판정에 쓰인 컬럼 -->
      <div :class="$style.child2" />
      <div v-for="top in cardDividers" :key="top" :class="$style.divider" :style="{ top: `${top}px` }" />
      <b :class="$style.b37">이 판정에 쓰인 컬럼</b>
      <b :class="$style.mapHead" :style="{ left: '105px' }">원본 컬럼</b>
      <b :class="$style.mapHead" :style="{ left: '424px' }">표준 용어</b>
      <b :class="$style.mapHead" :style="{ left: '766px' }">매핑 방식</b>
      <b :class="[$style.mapHead, $style.mapHeadCenter]" :style="{ left: '1136px' }">확인자</b>
      <div :class="$style.child19" />
      <div v-if="!mappingRows.length" :class="$style.mapEmpty" :style="{ top: `${mappingTop(0)}px` }">
        이 행에 쓰인 컬럼 정보를 찾지 못했어요.
      </div>
      <template v-for="(row, i) in mappingRows" :key="row.origCol">
        <b :class="$style.mapSqlCol" :style="{ top: `${mappingTop(i)}px` }">{{ row.origCol }}</b>
        <b :class="$style.mapOrigCol" :style="{ top: `${mappingTop(i)}px` }">{{ row.stdTerm }}</b>
        <div :class="$style.mapBadge" :style="{ top: `${mappingTop(i)}px` }">
          <div :class="row.byHuman ? $style.mapBadgeHuman : $style.mapBadgeAuto" />
          <b :class="[$style.mapBadgeText, row.byHuman && $style.mapBadgeTextHuman]">{{ row.badge }}</b>
        </div>
        <div :class="$style.mapConfirm" :style="{ top: `${mappingTop(i)}px` }">{{ row.confirm }}</div>
      </template>
    </template>

    <div v-else-if="!loading" :class="$style.emptyNotice">
      {{ loadError || '보여줄 측정값이 없어요.' }}
    </div>

    <div :class="$style.child8" :style="{ top: `${2696 + mappingShift}px` }" />
    <div :class="[$style.div4, 'link']" @click="backToEvidence">←</div>
  </div>
  </div>
</template>

<style module>
/* 서비스 워드로고. 원래는 물방울 아이콘 위에 '물 / 볼래 / ㅓ' 글자를 겹쳐 만들었는데,
   Ria Sans 가 설치되지 않은 환경에서는 글자 폭이 달라져 어긋난다. 한 장으로 바꾼다. */
.wordmark {
  position: absolute;
  top: 82px;
  left: 50px;
  width: 144px;
  height: 35px;
}
/* 대상 행과 그 안의 대상 값을 눈에 띄게 */
.rawCellTarget {
  color: #0053e3;
}
.rawCellPicked {
  color: #0053e3;
  text-decoration: underline;
  text-underline-offset: 6px;
  text-decoration-thickness: 2px;
}
/* SQL 원문 — 근거 화면과 같은 모양 */
.sqlBlock {
  position: absolute;
  top: 1900px;
  left: 121px;
  width: 1500px;
  box-sizing: border-box;
  margin: 0;
  padding: 28px 32px;
  border-radius: 12px;
  background-color: #fafafa;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: var(--font-code);
  line-height: 32px;
  color: #374151;
  white-space: pre;
  overflow-x: auto;
}
.mapEmpty {
  position: absolute;
  left: 105px;
  line-height: 45px;
  font-weight: 500;
}
.emptyNotice {
  position: absolute;
  top: 560px;
  left: 105px;
  line-height: 45px;
  font-weight: 500;
}
.noticeError {
  color: #d92d20;
}
.viewport {
  width: 100%;
  overflow: hidden;
  position: relative;
}
.div {
  width: 1920px;
  height: 2940px;
  position: relative;
  background-color: #f8f9fc;
  text-align: left;
  font-size: var(--font-body-03);
  color: #6b7280;
  font-family: Pretendard;
  transform-origin: top left;
}
/* 근거 상세도 분석 흐름에 속하므로 현재 섹션은 "분석하기" 다.
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
.mgl {
  position: absolute;
  top: 299px;
  left: calc(50% - 866px);
  font-size: var(--font-title-02);
  color: #0053e3;
}
.b3 {
  position: absolute;
  top: 0px;
  left: 81px;
  line-height: 35px;
}
.b4 {
  position: absolute;
  top: 0px;
  left: 51px;
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
.b35 {
  position: absolute;
  top: 364px;
  left: calc(50% - 866px);
  font-size: var(--font-body-03);
  line-height: 45px;
}
.div4 {
  position: absolute;
  top: 210px;
  left: 50px;
  font-size: var(--font-title-02);
  font-weight: 600;
  color: #00559e;
  text-align: center;
}
/* 카드 내부 가로 구분선 (원본은 빈 img) */
.divider {
  position: absolute;
  left: 50px;
  width: 1820px;
  height: 1px;
  background-color: #d1d5db;
}
/* ── 원본 데이터 행 ─────────────────────────── */
.item {
  position: absolute;
  top: 451px;
  left: 50px;
  border-radius: 20px;
  background-color: #fbfbfb;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1820px;
  height: 491px;
}
.inner {
  position: absolute;
  top: 453px;
  left: 52px;
  border-radius: 18px 18px 0px 0px;
  background-color: #f4f4f4;
  width: 1816px;
  height: 228px;
}
.xlsx {
  position: absolute;
  top: 494px;
  left: 105px;
  font-size: var(--font-body-02);
  line-height: 45px;
  display: inline-block;
  width: 864px;
}
.rawHead {
  position: absolute;
  line-height: 30px;
  top: 617px;
}
.rawCell {
  position: absolute;
  line-height: 30px;
}
/* ── 초과 판정 과정 ─────────────────────────── */
.child17 {
  position: absolute;
  top: 973px;
  left: 50px;
  border-radius: 20px;
  background-color: #fbfbfb;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1820px;
  height: 560px;
}
.b61 {
  position: absolute;
  top: 1020px;
  left: 105px;
  font-size: var(--font-body-02);
  line-height: 45px;
  display: inline-block;
  width: 864px;
}
.stepBox {
  position: absolute;
  top: 1119px;
  height: 196px;
  font-size: var(--font-body-03);
  color: #00559e;
}
.stepBoxBg {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 20px;
  background-color: rgba(214, 232, 250, 0.3);
  border: 2px solid #d6e8fb;
  box-sizing: border-box;
  width: 295px;
  height: 196px;
}
.stepBoxBgDanger {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 20px;
  background-color: rgba(255, 0, 0, 0.06);
  border: 2px solid #ff0000;
  box-sizing: border-box;
  width: 295px;
  height: 196px;
}
 .stepLabel {
  position: absolute;
  top: 19px;
  left: 47px;
  line-height: 45px;
}
 /* 원본 값·판정은 짧지만 표준 용어는 '생물화학적산소요구량' 처럼 길다.
   상자 안쪽 폭에 맞춰 두 줄까지 접고, 넘치면 자른다. */
.stepValue {
  position: absolute;
  top: 72px;
  left: 47px;
  right: 24px;
  font-size: var(--font-title-02);
  line-height: 1.15;
  color: #000;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
/* 표준 용어처럼 긴 값은 상자 안쪽 폭(224px)에 한 줄로 못 들어간다.
   글자를 줄이고 시작점을 올려 두 줄이 아래 설명을 덮지 않게 한다. */
.stepValueLong {
  top: 62px;
  font-size: var(--font-body-02);
  line-height: 1.2;
}
.stepValueDanger {
  color: #ff0000;
}
.stepNote {
  position: absolute;
  top: 132px;
  left: 47px;
  line-height: 45px;
  font-weight: 500;
  color: #6b7280;
  white-space: nowrap;
}
.stepArrow {
  position: absolute;
  top: 1195px;
  font-size: var(--font-title-02);
  line-height: 45px;
  font-weight: 500;
  color: #d9d9d9;
  display: inline-block;
  width: 37px;
}
.mgl3 {
  position: absolute;
  top: 1435px;
  left: 105px;
  font-size: var(--font-body-03);
  line-height: 45px;
  display: inline-block;
  width: 864px;
}
/* ── 이 행을 가져온 조건 ────────────────────── */
.rectangleDiv {
  position: absolute;
  top: 1663px;
  left: 50px;
  border-radius: 20px;
  background-color: #f4f4f4;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1820px;
  height: 845px;
}
.b36 {
  position: absolute;
  top: 1702px;
  left: 105px;
  font-size: var(--font-body-02);
  line-height: 45px;
  display: inline-block;
  width: 398px;
}
.child9 {
  position: absolute;
  top: 1694px;
  left: 1475px;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 345px;
  height: 62px;
}
.child10 {
  position: absolute;
  top: 1694px;
  left: 1475px;
  border-radius: 20px 0px 0px 20px;
  background-color: #f8f9fc;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 233px;
  height: 62px;
}
.child11 {
  position: absolute;
  top: 1694px;
  left: 1475px;
  border-radius: 20px 0px 0px 20px;
  background-color: #6b7280;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 116px;
  height: 62px;
}
.b48 {
  position: absolute;
  top: 1702px;
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
.sql2 {
  position: absolute;
  top: 1702px;
  left: 1628px;
  font-size: var(--font-body-03);
  line-height: 45px;
}
.b49 {
  position: absolute;
  top: 1702px;
  left: 1742px;
  font-size: var(--font-body-03);
  line-height: 45px;
}
.child12 {
  position: absolute;
  top: 1789px;
  left: 52px;
  background-color: #eff5fe;
  width: 1816px;
  height: 230px;
}
.b50 {
  position: absolute;
  top: 1822px;
  left: 105px;
  line-height: 45px;
  color: #42a8ff;
}
.bod3 {
  position: absolute;
  top: 1884px;
  left: 105px;
  font-size: var(--font-body-03);
  line-height: 45px;
  color: #000;
}
.child2 {
  position: absolute;
  top: 2213px;
  left: 52px;
  border-radius: 0px 0px 18px 18px;
  background-color: #fbfbfb;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1816px;
  height: 294px;
}
.b37 {
  position: absolute;
  top: 2053px;
  left: 105px;
  font-size: var(--font-body-02);
  line-height: 45px;
  display: inline-block;
  width: 607px;
}
.mapHead {
  position: absolute;
  top: 2142px;
  font-size: var(--font-body-03);
  line-height: 45px;
  display: inline-block;
  width: 126px;
}
.mapHeadCenter {
  text-align: center;
}
/* 마지막 매핑 행(사람 확인)만 배경 강조 */
.child19 {
  position: absolute;
  top: 2435px;
  left: 52px;
  border-radius: 0px 0px 18px 18px;
  background-color: #eff5fe;
  width: 1816px;
  height: 71px;
}
.mapSqlCol {
  position: absolute;
  left: 105px;
  font-size: var(--font-body-03);
  line-height: 45px;
  display: inline-block;
  color: #000;
  width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mapOrigCol {
  position: absolute;
  left: 424px;
  font-size: var(--font-body-03);
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
/* 확인자가 없을 때의 "-" 와 이름·시각이 같은 중심에 오도록 넓게 잡는다 */
.mapConfirm {
  position: absolute;
  left: 1057px;
  font-size: var(--font-body-03);
  line-height: 45px;
  color: #000;
  text-align: center;
  display: inline-block;
  width: 284px;
}
.child8 {
  position: absolute;
  top: 2696px;
  left: -100px;
  background-color: #f3f3f3;
  width: 2120px;
  height: 244px;
}
</style>
