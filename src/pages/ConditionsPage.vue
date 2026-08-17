<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import wordmark from '../assets/wordmark.svg'
import profileIcon from '../assets/profile.svg'
import dropdownIcon from '../assets/chevron-down.svg'
import { useDesignScale } from '../composables/useDesignScale'
import { useTermNames } from '../composables/useTermNames'
import { ApiError, getAnalysisOptions, getStandardSets, runAnalysis } from '../api'
import type { AnalysisOptions, Bucket, Metric, StandardSets } from '../api'

const router = useRouter()
const route = useRoute()
const { loadTerms, termName } = useTermNames()

// 앞 화면에서 넘어온 질문. 자연어를 해석하는 API 가 없어서 문장은 그대로
// 보여주기만 하고, 실제 조건은 아래에서 직접 고른다.
const question = computed(() => String(route.query.q ?? '').trim())

// 조건 선택 상태 — 그룹별로 하나씩 고른다.
// 템플릿으로 들어오면 집계 단위·방식이 미리 채워진 채 시작한다.
const period = ref('')
const unit = ref(String(route.query.unit ?? ''))
const metric = ref(String(route.query.metric ?? '평균'))

// 직접 입력 기간 — 연/월 선택. input[type=month] 는 Safari 가 지원하지 않아
// 그냥 텍스트 칸으로 떨어지고, 네이티브 피커 팝업은 이 페이지의 scale() 배율을
// 따르지 않아 디자인과도 어긋난다. 그래서 select 로 직접 만든다.
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 11 }, (_, i) => CURRENT_YEAR - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

const fromYear = ref('')
const fromMonth = ref('')
const toYear = ref('')
const toMonth = ref('')

const yearMonth = (y: string, m: string) => (y && m ? `${y}-${m.padStart(2, '0')}` : '')
const customFrom = computed(() => yearMonth(fromYear.value, fromMonth.value))
const customTo = computed(() => yearMonth(toYear.value, toMonth.value))
// "YYYY-MM" 은 사전순 비교가 곧 시간순 비교다.
const rangeInvalid = computed(
  () => Boolean(customFrom.value && customTo.value) && customFrom.value > customTo.value,
)

// period(프리셋 칩)와 상호 배타적인데, 한쪽이 바뀔 때 다른 쪽을 지우는 watcher 를
// 두면 서로 덮어쓰기 쉽다. 그래서 직접 입력을 파생값으로 두고 "양쪽이 다 채워지고
// 순서가 맞으면 프리셋보다 우선" 이라는 한 방향 규칙만 쓴다.
const customPeriod = computed(() =>
  customFrom.value && customTo.value && !rangeInvalid.value
    ? `${customFrom.value} ~ ${customTo.value}`
    : '',
)
const periodLabel = computed(() => customPeriod.value || period.value || '미지정')

/** 프리셋 칩이 켜졌는지. 직접 입력한 기간이 있으면 프리셋은 꺼진 것으로 본다. */
const periodOn = (label: string) => !customPeriod.value && period.value === label

// 프리셋 칩을 고르면 직접 입력해 둔 값은 지운다.
function selectPeriod(label: string) {
  period.value = label
  fromYear.value = ''
  fromMonth.value = ''
  toYear.value = ''
  toMonth.value = ''
}

// --- 서버에서 받아오는 선택지 ---

const loading = ref(true)
const loadError = ref('')
const submitting = ref(false)
const submitError = ref('')

const options = ref<AnalysisOptions | null>(null)
const standards = ref<StandardSets | null>(null)

// 빈 문자열은 '전체' 를 뜻한다. 서버도 빈 배열을 전체로 받는다.
const site = ref('')
const itemCode = ref('')
const standardSet = ref('')
const regionGrade = ref('')
const dischargeScale = ref('')

/** 화면 라벨 → 서버 값. 서버에 없는 선택지는 아예 만들지 않는다. */
const BUCKETS: Record<string, Bucket> = { 월별: 'month', 분기별: 'quarter', 연별: 'year' }
const METRICS: Record<string, Metric> = { 평균: 'avg', 최대: 'max', 최소: 'min', 건수: 'count' }
const METRIC_LABELS = Object.keys(METRICS)

function isoDay(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const PRESET_MONTHS: Record<string, number> = {
  '최근 1개월': 1,
  '최근 3개월': 3,
  '최근 1년': 12,
  '최근 3년': 36,
}

/** 고른 기간을 서버가 받는 YYYY-MM-DD 로 바꾼다. 형식이 어긋나면 서버가 500 을 낸다. */
const range = computed<{ from?: string; to?: string }>(() => {
  if (customPeriod.value) {
    const [year, month] = customTo.value.split('-').map(Number)
    // 0 일은 그 전 달의 마지막 날이다.
    return { from: `${customFrom.value}-01`, to: isoDay(new Date(year, month, 0)) }
  }
  const months = PRESET_MONTHS[period.value]
  if (!months) return {}
  const to = new Date()
  const from = new Date()
  from.setMonth(from.getMonth() - months)
  return { from: isoDay(from), to: isoDay(to) }
})

// select 의 기본 화살표를 지우고 기준치 세트가 쓰는 chevron 을 배경으로 깐다.
// Vite 는 작은 SVG 를 data URI 로 인라인하는데 그 안의 작은따옴표를 인코딩하지
// 않는다. 따옴표 없는 url() 토큰에는 ' 가 들어갈 수 없어 선언이 통째로 버려지므로
// 반드시 큰따옴표로 감싸야 한다.
const caret = { backgroundImage: `url("${dropdownIcon}")` }

/** 서버에 실제로 측정값이 있는 기간. 이 밖을 고르면 결과가 비어 나온다. */
const dataPeriod = computed(() => {
  const period = options.value?.period
  if (!period?.first_date || !period?.last_date) return ''
  const day = (iso: string) => iso.slice(0, 10)
  return `데이터가 있는 기간: ${day(period.first_date)} ~ ${day(period.last_date)}`
})

/** 고른 기간이 데이터 범위와 안 겹치면 미리 알려준다. */
const periodMisses = computed(() => {
  const period = options.value?.period
  const picked = range.value
  if (!period?.first_date || !period?.last_date || !picked.from || !picked.to) return false
  return picked.to < period.first_date.slice(0, 10) || picked.from > period.last_date.slice(0, 10)
})

const canSubmit = computed(() => !loading.value && !loadError.value && Boolean(unit.value) && !submitting.value)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [analysisOptions, standardSets] = await Promise.all([
      getAnalysisOptions(),
      getStandardSets(),
      loadTerms(),
    ])
    options.value = analysisOptions
    standards.value = standardSets
    // 기준치는 대부분 한 세트뿐이라 미리 골라둔다.
    standardSet.value = standardSets.sets[0]?.standard_set ?? ''
    regionGrade.value = standardSets.region_grades[0] ?? ''
  } catch (error) {
    loadError.value =
      error instanceof ApiError && error.code !== 'HTTP_ERROR' && error.code !== 'NETWORK_ERROR'
        ? error.message
        : '분석 조건을 불러오지 못했어요. 잠시 후 다시 시도해 주세요'
  } finally {
    loading.value = false
  }
}

async function startAnalysis() {
  if (!canSubmit.value) return
  submitting.value = true
  submitError.value = ''
  try {
    const request = {
      site_names: site.value ? [site.value] : [],
      item_codes: itemCode.value ? [itemCode.value] : [],
      bucket: BUCKETS[unit.value],
      metric: METRICS[metric.value],
      from: range.value.from,
      to: range.value.to,
      standard_set: standardSet.value || undefined,
      region_grade: regionGrade.value || undefined,
      scale: (dischargeScale.value || undefined) as 'large' | 'small' | undefined,
    }
    const result = await runAnalysis(request)
    // 방금 받은 결과를 실어 보내 결과 화면이 조회를 한 번 덜 하게 한다.
    router.push({
      name: 'results',
      query: { executionId: result.execution_id, ...(question.value ? { q: question.value } : {}) },
      state: { analysis: JSON.parse(JSON.stringify(result)), conditions: request },
    })
  } catch (error) {
    submitError.value =
      error instanceof ApiError && error.code !== 'HTTP_ERROR' && error.code !== 'NETWORK_ERROR'
        ? error.message
        : '분석을 시작하지 못했어요. 잠시 후 다시 시도해 주세요'
  } finally {
    submitting.value = false
  }
}

const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 2270

const { scale, offsetX } = useDesignScale(DESIGN_WIDTH)

onMounted(load)
</script>

<template>
  <div :class="$style.viewport" :style="{ height: `${DESIGN_HEIGHT * scale}px` }">
  <div :class="$style.div" :style="{ transform: `translateX(${offsetX}px) scale(${scale})` }">
    <div :class="$style.child" />
    <div :class="$style.item" />
    <div :class="$style.inner" />
    <div :class="$style.rectangleDiv" />
    <b :class="$style.b">분석 조건 확인</b>
    <b :class="$style.b2">누락된 조건을 선택해주세요.</b>
    <b :class="$style.b3">분석 기간</b>
    <div :class="$style.div2">선택한 기간의 수질 측정 데이터를 원하는 시간 단위로 집계하여 평균과 추세를 확인합니다.</div>
    <div :class="$style.div3">선택한 기간의 값을 어떤 방식으로 모을지 정합니다.</div>
    <div :class="$style.div4">분석 결과를 비교할 수질 기준을 선택합니다.</div>
    <div :class="$style.div5">
      분석에 사용할 데이터의 조회 기간을 설정합니다.
      <span v-if="dataPeriod" :class="$style.periodHint">{{ dataPeriod }}</span>
    </div>
    <b :class="$style.b4">집계 단위</b>
    <b :class="$style.b5">집계 방식</b>
    <b :class="$style.b6">적용 기준치</b>
    <div :class="$style.div6">직접 입력 (예: 2023년 1월 ~ 2023년 2월)</div>
    <div :class="$style.child2">
      <div :class="$style.ymGroup">
        <select v-model="fromYear" :class="[$style.ymSelect, $style.ymYear, !fromYear && $style.ymEmpty]"
                :style="caret" aria-label="시작 연도">
          <option value="" disabled>연도</option>
          <option v-for="y in YEARS" :key="y" :value="String(y)">{{ y }}년</option>
        </select>
        <select v-model="fromMonth" :class="[$style.ymSelect, $style.ymMonth, !fromMonth && $style.ymEmpty]"
                :style="caret" aria-label="시작 월">
          <option value="" disabled>월</option>
          <option v-for="m in MONTHS" :key="m" :value="String(m)">{{ m }}월</option>
        </select>
      </div>
      <span :class="$style.periodTilde">~</span>
      <div :class="$style.ymGroup">
        <select v-model="toYear" :class="[$style.ymSelect, $style.ymYear, !toYear && $style.ymEmpty]"
                :style="caret" aria-label="종료 연도">
          <option value="" disabled>연도</option>
          <option v-for="y in YEARS" :key="y" :value="String(y)">{{ y }}년</option>
        </select>
        <select v-model="toMonth" :class="[$style.ymSelect, $style.ymMonth, !toMonth && $style.ymEmpty]"
                :style="caret" aria-label="종료 월">
          <option value="" disabled>월</option>
          <option v-for="m in MONTHS" :key="m" :value="String(m)">{{ m }}월</option>
        </select>
      </div>
      <span v-if="rangeInvalid" :class="$style.rangeHint" role="alert">시작이 종료보다 늦어요</span>
    </div>
    <div :class="$style.div7">투명한 기술 검증으로 가장 믿을 수 있는 분석 환경을 만듭니다.</div>
    <div :class="$style.child3" />
    <div :class="$style.wrapper">
      <b :class="$style.b7">입력된 질문</b>
    </div>
    <b :class="$style.bod">{{ question || '질문 없이 조건만 골라 분석합니다' }}</b>
    <div :class="[$style.rectangleGroup, 'btn']" role="button" @click="selectPeriod('최근 1개월')">
      <div :class="[$style.groupItem, periodOn('최근 1개월') && $style.chipOn, 'btn-fill']" />
      <div :class="[$style.div9, periodOn('최근 1개월') && $style.chipLabelOn]">최근 1개월</div>
    </div>
    <div :class="[$style.rectangleContainer, 'btn']" role="button" @click="unit = '월별'">
      <div :class="[$style.groupInner, unit === '월별' && $style.chipOn, 'btn-fill']" />
      <div :class="[$style.div10, unit === '월별' && $style.chipLabelOn]">월별</div>
    </div>
    <!-- 원본은 '전년 동기 비교 / 다중 지점 비교 / 비교 없음' 이었지만 서버에 비교
         기능이 없다. 대신 실제로 쓰이는 집계 방식(metric)을 여기서 고른다. -->
    <div v-for="(label, mi) in METRIC_LABELS" :key="label"
         :class="[$style.metricChip, 'btn']" role="button"
         :style="{ left: `${219 + mi * 229}px` }" @click="metric = label">
      <div :class="[$style.metricChipBg, metric === label && $style.chipOn, 'btn-fill']" />
      <div :class="[$style.metricChipLabel, metric === label && $style.chipLabelOn]">{{ label }}</div>
    </div>
    <div :class="[$style.rectangleParent4, 'btn']" role="button" @click="unit = '연별'">
      <div :class="[$style.groupInner, unit === '연별' && $style.chipOn, 'btn-fill']" />
      <div :class="[$style.div10, unit === '연별' && $style.chipLabelOn]">연별</div>
    </div>
    <div :class="[$style.rectangleParent5, 'btn']" role="button" @click="unit = '분기별'">
      <div :class="[$style.groupInner, unit === '분기별' && $style.chipOn, 'btn-fill']" />
      <div :class="[$style.div15, unit === '분기별' && $style.chipLabelOn]">분기별</div>
    </div>
    <div :class="[$style.rectangleParent6, 'btn']" role="button" @click="selectPeriod('최근 3개월')">
      <div :class="[$style.groupItem, periodOn('최근 3개월') && $style.chipOn, 'btn-fill']" />
      <div :class="[$style.div9, periodOn('최근 3개월') && $style.chipLabelOn]">최근 3개월</div>
    </div>
    <div :class="[$style.rectangleParent7, 'btn']" role="button" @click="selectPeriod('최근 1년')">
      <div :class="[$style.groupItem, periodOn('최근 1년') && $style.chipOn, 'btn-fill']" />
      <div :class="[$style.div11, periodOn('최근 1년') && $style.chipLabelOn]">최근 1년</div>
    </div>
    <div :class="[$style.rectangleParent8, 'btn']" role="button" @click="selectPeriod('최근 3년')">
      <div :class="[$style.groupItem, periodOn('최근 3년') && $style.chipOn, 'btn-fill']" />
      <div :class="[$style.div11, periodOn('최근 3년') && $style.chipLabelOn]">최근 3년</div>
    </div>
    <!-- 요약 줄 — 지점·항목은 실제로 고르는 자리다. 원본은 값이 박혀 있었는데
         서버가 site_names / item_codes 를 받으므로 선택으로 바꿨다. -->
    <div :class="$style.summaryRow">
      <label :class="[$style.summaryChip, $style.summaryChipWide, $style.summarySelect]">
        <span :class="$style.summaryChipLabel">측정 지점</span>
        <select v-model="site" :class="$style.chipSelect" :style="caret" aria-label="측정 지점">
          <option value="">전체</option>
          <option v-for="name in options?.sites ?? []" :key="name" :value="name">{{ name }}</option>
        </select>
      </label>
      <label :class="[$style.summaryChip, $style.summarySelect]">
        <span :class="$style.summaryChipLabel">측정 항목</span>
        <select v-model="itemCode" :class="$style.chipSelect" :style="caret" aria-label="측정 항목">
          <option value="">전체</option>
          <option v-for="item in options?.items ?? []" :key="item.item_code" :value="item.item_code">
            {{ termName(item.item_code) }} ({{ item.n }})
          </option>
        </select>
      </label>
      <div :class="$style.summaryChip">기간: {{ periodLabel }}</div>
      <div :class="$style.summaryChip">집계: {{ unit || '미지정' }} · {{ metric }}</div>
    </div>

    <div :class="$style.div21">기준치 세트 · 지역 구분 · 배출규모</div>
    <select v-model="standardSet" :class="[$style.thresholdSelect, !standardSet && $style.ymEmpty]"
            :style="caret" aria-label="적용 기준치 세트">
      <option value="">기준선 없이 보기</option>
      <option v-for="set in standards?.sets ?? []" :key="set.standard_set" :value="set.standard_set">
        {{ set.standard_set }} · {{ set.legal_basis }}
      </option>
    </select>
    <select v-model="regionGrade" :class="[$style.regionSelect, !regionGrade && $style.ymEmpty]"
            :style="caret" aria-label="지역 구분">
      <option value="">지역 구분 없음</option>
      <option v-for="grade in standards?.region_grades ?? []" :key="grade" :value="grade">{{ grade }}</option>
    </select>
    <!-- 규모를 지정하지 않으면 서버가 규모별 기준선을 적용하지 않는다. -->
    <select v-model="dischargeScale" :class="[$style.scaleSelect, !dischargeScale && $style.ymEmpty]"
            :style="caret" aria-label="폐수배출규모">
      <option value="">배출규모 미지정</option>
      <option v-for="s in standards?.scales ?? []" :key="s.value" :value="s.value">{{ s.label }}</option>
    </select>

    <div :class="[$style.rectangleParent13, canSubmit ? 'btn' : $style.submitOff]" role="button"
         :aria-disabled="!canSubmit" @click="startAnalysis">
      <div :class="[$style.groupChild14, canSubmit && 'btn-fill', !canSubmit && $style.submitOffBg]" />
      <b :class="$style.b8">{{ submitting ? '분석 중…' : '분석 시작하기' }}</b>
    </div>
    <div v-if="loadError || submitError || periodMisses || (!loading && !unit)"
         :class="[$style.conditionNotice,
                  (loadError || submitError) && $style.conditionNoticeError,
                  !loadError && !submitError && periodMisses && $style.conditionNoticeWarn]">
      {{
        loadError || submitError ||
        (periodMisses
          ? '고른 기간에 측정값이 없어요. 결과가 비어 나옵니다.'
          : '집계 단위를 골라주세요.')
      }}
    </div>
    <div :class="$style.child4" />
    <img :class="[$style.wordmark, 'link']" :src="wordmark" alt="물어볼래" @click="router.push('/')" />
    <img :class="$style.profile" :src="profileIcon" alt="내 프로필" />
    <div :class="[$style.div22, 'link']" @click="router.push('/data')">내 데이터</div>
    <div :class="[$style.div23, 'link']" @click="router.push('/ask')">분석하기</div>
    <div :class="$style.div24">문의하기</div>
    <div :class="[$style.div25, 'link']" @click="router.push('/ask')">←</div>
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
.viewport {
  width: 100%;
  overflow: hidden;
  position: relative;
}
.div {
  width: 1920px;
  height: 2363px;
  position: relative;
  background-color: #f8f9fc;
  text-align: left;
  font-size: var(--font-body-03);
  color: #455772;
  font-family: Pretendard;
  transform-origin: top left;
}
.child {
  position: absolute;
  top: 705px;
  left: 184px;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
  border-radius: 20px;
  background-color: #fcfcfc;
  border: 2px solid #d6e8fa;
  box-sizing: border-box;
  width: 1552px;
  height: 361px;
  flex-shrink: 0;
}
.item {
  position: absolute;
  top: 1083px;
  left: 184px;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
  border-radius: 20px;
  background-color: #fcfcfc;
  border: 2px solid #d6e8fa;
  box-sizing: border-box;
  width: 1552px;
  height: 223px;
  flex-shrink: 0;
}
.inner {
  position: absolute;
  top: 1323px;
  left: 184px;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
  border-radius: 20px;
  background-color: #fcfcfc;
  border: 2px solid #d6e8fa;
  box-sizing: border-box;
  width: 1552px;
  height: 223px;
  flex-shrink: 0;
}
/* 요약 칩 — 원본은 251px 고정 폭 상자에 텍스트를 하드코딩된 left 로 밀어넣어
   가운데를 맞췄다. 내용이 바뀌면 그 좌표가 무너지므로 flex 행으로 바꿔 칩이
   내용에 맞게 늘어나게 한다. 원본의 시작 좌표(247)와 간격(15px)은 그대로다. */
.summaryRow {
  position: absolute;
  top: 468px;
  left: 247px;
  display: flex;
  gap: 15px;
  flex-shrink: 0;
}
.summaryChip {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 251px;
  height: 54px;
  padding: 0 24px;
  box-sizing: border-box;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d0d0d0;
  font-weight: 600;
  white-space: nowrap;
}
.summaryChipWide {
  min-width: 363px;
}
/* 지점·항목 칩은 고르는 자리다. 칩 모양은 그대로 두고 안에 select 를 넣는다. */
.summarySelect {
  gap: 10px;
  justify-content: flex-start;
  cursor: pointer;
}
.summaryChipLabel {
  color: #9ca3af;
  white-space: nowrap;
}
.chipSelect {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 28px 0 0;
  border: none;
  outline: none;
  background-color: transparent;
  background-repeat: no-repeat;
  background-position: right center;
  background-size: 18px 8px;
  -webkit-appearance: none;
  appearance: none;
  font-family: inherit;
  font-size: inherit;
  font-weight: 600;
  color: #1f2937;
  cursor: pointer;
}
/* 집계 방식 칩 — 원본 비교 옵션 칩과 같은 모양, 좌표만 계산해서 놓는다. */
.metricChip {
  position: absolute;
  top: 1467px;
  width: 217px;
  height: 44px;
  flex-shrink: 0;
}
.metricChipBg {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d6e8fa;
  box-sizing: border-box;
  width: 217px;
  height: 44px;
}
.metricChipLabel {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 217px;
  line-height: 44px;
  text-align: center;
  font-weight: 600;
  text-shadow: 1px 0 0 #d6e8fa, 0 1px 0 #d6e8fa, -1px 0 0 #d6e8fa, 0 -1px 0 #d6e8fa;
}
/* 선택된 조건 칩 — 테두리와 배경만 강조 (텍스트는 그대로) */
 .rectangleDiv {
  position: absolute;
  top: 1564px;
  left: 184px;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
  border-radius: 20px;
  background-color: #fcfcfc;
  border: 2px solid #d6e8fa;
  box-sizing: border-box;
  width: 1552px;
  height: 226px;
  flex-shrink: 0;
}
/* 직접 입력 영역 — Figma 는 이 상자를 내용 없이 내보냈다. 같은 페이지의
   단일 입력 필드(기준치 세트)가 1482×57 인데 이건 162px 이라, 한 줄짜리
   필드가 아니라 시작·종료 두 필드를 담는 영역으로 보고 채운다. */
 /* 날짜 피커를 감싸던 흰 상자를 없앴다. 안쪽 여백도 걷어서 위쪽 프리셋 칩과
   왼쪽 선이 맞는다. 줄 높이는 select 높이(60px)만 차지한다. */
.child2 {
  position: absolute;
  top: 976px;
  left: 219px;
  width: 1482px;
  height: 60px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 24px;
}
.ymGroup {
  display: flex;
  gap: 12px;
}
/* select 는 폰트를 상속하지 않고 기본 화살표도 붙으므로 둘 다 직접 지정한다.
   화살표 자리(오른쪽 44px)를 padding 으로 비워 둔다. */
.ymSelect {
  height: 60px;
  padding: 0 44px 0 20px;
  box-sizing: border-box;
  border-radius: 10px;
  border: 2px solid #d6e8fa;
  background-color: #fff;
  background-repeat: no-repeat;
  background-position: right 18px center;
  background-size: 24px 11px;
  -webkit-appearance: none;
  appearance: none;
  outline: none;
  font-family: inherit;
  font-size: inherit;
  font-weight: 500;
  color: #1f2937;
  cursor: pointer;
}
.ymSelect:focus {
  border-color: #0053e3;
}
/* 적용 기준치 세트 — 원본은 상자 + 텍스트 + 아이콘 이미지로 된 가짜 드롭다운이었다.
   화살표 위치(오른쪽 32px)는 원본 아이콘 좌표를 그대로 옮긴 값이다. */
/* 기준치 세트 옆에 지역 구분을 나란히 놓는다. 둘 다 있어야 기준선이 그려진다.
   원본은 세트 하나만 전체 폭(1482)으로 썼다. */
.regionSelect {
  position: absolute;
  top: 1708px;
  left: 939px;
  width: 340px;
  height: 57px;
  padding: 0 68px 0 15px;
  box-sizing: border-box;
  border-radius: 10px;
  border: 2px solid #d6e8fa;
  background-color: #fff;
  background-repeat: no-repeat;
  background-position: right 32px center;
  background-size: 24px 11px;
  -webkit-appearance: none;
  appearance: none;
  outline: none;
  font-family: inherit;
  font-size: inherit;
  font-weight: 500;
  color: #1f2937;
  cursor: pointer;
}
/* 세 번째 칸 — 폐수배출규모 */
.scaleSelect {
  position: absolute;
  top: 1708px;
  left: 1299px;
  width: 402px;
  height: 57px;
  padding: 0 68px 0 15px;
  box-sizing: border-box;
  border-radius: 10px;
  border: 2px solid #d6e8fa;
  background-color: #fff;
  background-repeat: no-repeat;
  background-position: right 32px center;
  background-size: 24px 11px;
  -webkit-appearance: none;
  appearance: none;
  outline: none;
  font-family: inherit;
  font-size: inherit;
  font-weight: 500;
  color: #1f2937;
  cursor: pointer;
}
/* 조건이 덜 찼거나 실패했을 때 버튼 왼쪽에 뜨는 한 줄 */
.conditionNotice {
  position: absolute;
  top: 1843px;
  left: 219px;
  width: 1200px;
  line-height: 45px;
  font-weight: 600;
  color: #9ca3af;
}
.conditionNoticeError {
  color: #d92d20;
}
.conditionNoticeWarn {
  color: #a86504;
}
/* 기간 설명 옆에 붙는 실제 데이터 범위 */
.periodHint {
  font-weight: 600;
  color: #0053e3;
}
.submitOff {
  cursor: not-allowed;
}
.submitOffBg {
  background-color: #e5e7eb;
}
.thresholdSelect {
  position: absolute;
  top: 1708px;
  left: 219px;
  width: 700px;
  height: 57px;
  padding: 0 68px 0 15px;
  box-sizing: border-box;
  border-radius: 10px;
  border: 2px solid #d6e8fa;
  background-color: #fff;
  background-repeat: no-repeat;
  background-position: right 32px center;
  background-size: 24px 11px;
  -webkit-appearance: none;
  appearance: none;
  outline: none;
  font-family: inherit;
  font-size: inherit;
  font-weight: 500;
  color: #1f2937;
  cursor: pointer;
}
.thresholdSelect:focus {
  border-color: #0053e3;
}
/* 아직 안 고른 상태는 placeholder 처럼 회색 */
.ymEmpty {
  color: #9ca3af;
}
.ymYear {
  width: 170px;
}
.ymMonth {
  width: 140px;
}
.periodTilde {
  font-weight: 600;
  color: #9ca3af;
}
.rangeHint {
  font-weight: 600;
  color: #d92d20;
}
.b {
  position: absolute;
  top: 234px;
  left: 210px;
  font-size: var(--font-body-01);
  color: #002f5f;
  flex-shrink: 0;
}
.b2 {
  position: absolute;
  top: 650px;
  left: 219px;
  font-size: var(--font-body-01);
  color: #002f5f;
  flex-shrink: 0;
}
.b3 {
  position: absolute;
  top: 731px;
  left: 219px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #00559e;
  flex-shrink: 0;
}
.div2 {
  position: absolute;
  top: 1154px;
  left: 219px;
  line-height: 45px;
  font-weight: 500;
  color: #9ca3af;
  flex-shrink: 0;
}
.div3 {
  position: absolute;
  top: 1394px;
  left: 219px;
  line-height: 45px;
  font-weight: 500;
  color: #9ca3af;
  flex-shrink: 0;
}
.div4 {
  position: absolute;
  top: 1590px;
  left: 358px;
  line-height: 45px;
  font-weight: 500;
  color: #9ca3af;
  flex-shrink: 0;
}
 /* 원본은 설명 문구 길이에 맞춘 376px 였다. 뒤에 데이터 범위를 덧붙이면서
   두 줄이 되어 45px 상자 밖으로 잘렸다. 카드 안쪽 폭까지 늘리고 한 줄로 둔다. */
.div5 {
  position: absolute;
  top: 776px;
  left: 219px;
  line-height: 45px;
  font-weight: 500;
  color: #9ca3af;
  display: flex;
  align-items: baseline;
  gap: 14px;
  width: 1480px;
  height: 45px;
  white-space: nowrap;
  flex-shrink: 0;
}
.b4 {
  position: absolute;
  top: 1109px;
  left: 219px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #00559e;
  flex-shrink: 0;
}
.b5 {
  position: absolute;
  top: 1349px;
  left: 219px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #00559e;
  flex-shrink: 0;
}
.b6 {
  position: absolute;
  top: 1590px;
  left: 219px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #00559e;
  flex-shrink: 0;
}
.div6 {
  position: absolute;
  top: 931px;
  left: 228px;
  line-height: 45px;
  font-weight: 500;
  color: #9ca3af;
  flex-shrink: 0;
}
/* 원본은 calc(50% - 텍스트폭/2) 로 중앙을 맞춰서 글자 크기가 바뀌면 밀렸다.
   left/right 0 + fit-content + auto 여백으로 블록만 가운데 놓는다. text-align 을
   건드리지 않으므로 여러 줄 텍스트의 줄 내부 정렬은 원본 그대로 유지된다. */
.div7 {
  position: absolute;
  top: 2431px;
  left: 0px;
  right: 0px;
  width: fit-content;
  margin-inline: auto;
  font-size: var(--font-body-01);
  line-height: 55px;
  font-weight: 500;
  color: #fff;
  text-align: right;
  flex-shrink: 0;
}
.child3 {
  position: absolute;
  top: 302px;
  left: 184px;
  box-shadow: 3px 3px 10px 1px rgba(179, 179, 179, 0.2);
  border-radius: 30px;
  background: linear-gradient(-10.99deg, #fff, #f9fbff 36.03%, #f2f8ff);
  border: 2px solid #d6e8fb;
  box-sizing: border-box;
  width: 1552px;
  height: 262px;
  flex-shrink: 0;
}
.wrapper {
  position: absolute;
  top: 344px;
  left: 247px;
  width: 92px;
  height: 45px;
  flex-shrink: 0;
  color: #004ec2;
}
.b7 {
  position: absolute;
  top: 0px;
  left: 0px;
  line-height: 45px;
}
.bod {
  position: absolute;
  top: 389px;
  left: 247px;
  font-size: var(--font-body-01);
  line-height: 45px;
  display: inline-block;
  color: #00559e;
  width: 655px;
  height: 45px;
  flex-shrink: 0;
}
.rectangleGroup {
  position: absolute;
  top: 849px;
  left: 219px;
  width: 170px;
  height: 44px;
  flex-shrink: 0;
}
.groupItem {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d6e8fa;
  box-sizing: border-box;
  width: 170px;
  height: 44px;
}
.div9 {
  position: absolute;
  top: 0px;
  left: 43px;
  line-height: 44px;
  font-weight: 600;
  text-shadow: 1px 0 0 #d6e8fa, 0 1px 0 #d6e8fa, -1px 0 0 #d6e8fa, 0 -1px 0 #d6e8fa;
}
.rectangleContainer {
  position: absolute;
  top: 1227px;
  left: 219px;
  width: 119px;
  height: 44px;
  flex-shrink: 0;
}
.groupInner {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d6e8fa;
  box-sizing: border-box;
  width: 119px;
  height: 44px;
}
.div10 {
  position: absolute;
  top: 0px;
  left: 42px;
  line-height: 44px;
  font-weight: 600;
  text-shadow: 1px 0 0 #d6e8fa, 0 1px 0 #d6e8fa, -1px 0 0 #d6e8fa, 0 -1px 0 #d6e8fa;
}
.groupDiv {
  position: absolute;
  top: 1467px;
  left: 219px;
  width: 217px;
  height: 44px;
  flex-shrink: 0;
}
.groupChild2 {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d6e8fa;
  box-sizing: border-box;
  width: 217px;
  height: 44px;
}
.div11 {
  position: absolute;
  top: 0px;
  left: 52px;
  line-height: 44px;
  font-weight: 600;
  text-shadow: 1px 0 0 #d6e8fa, 0 1px 0 #d6e8fa, -1px 0 0 #d6e8fa, 0 -1px 0 #d6e8fa;
}
.rectangleParent2 {
  position: absolute;
  top: 1467px;
  left: 448px;
  width: 217px;
  height: 44px;
  flex-shrink: 0;
}
.rectangleParent3 {
  position: absolute;
  top: 1467px;
  left: 677px;
  width: 174px;
  height: 44px;
  flex-shrink: 0;
}
.groupChild4 {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d6e8fa;
  box-sizing: border-box;
  width: 174px;
  height: 44px;
}
.div13 {
  position: absolute;
  top: 0px;
  left: 50px;
  line-height: 44px;
  font-weight: 600;
  text-shadow: 1px 0 0 #d6e8fa, 0 1px 0 #d6e8fa, -1px 0 0 #d6e8fa, 0 -1px 0 #d6e8fa;
}
.rectangleParent4 {
  position: absolute;
  top: 1227px;
  left: 481px;
  width: 119px;
  height: 44px;
  flex-shrink: 0;
}
.rectangleParent5 {
  position: absolute;
  top: 1227px;
  left: 350px;
  width: 119px;
  height: 44px;
  flex-shrink: 0;
}
.div15 {
  position: absolute;
  top: 0px;
  left: 34px;
  line-height: 44px;
  font-weight: 600;
  text-shadow: 1px 0 0 #d6e8fa, 0 1px 0 #d6e8fa, -1px 0 0 #d6e8fa, 0 -1px 0 #d6e8fa;
}
.rectangleParent6 {
  position: absolute;
  top: 849px;
  left: 401px;
  width: 170px;
  height: 44px;
  flex-shrink: 0;
}
.rectangleParent7 {
  position: absolute;
  top: 849px;
  left: 583px;
  width: 170px;
  height: 44px;
  flex-shrink: 0;
}
.rectangleParent8 {
  position: absolute;
  top: 849px;
  left: 765px;
  width: 170px;
  height: 44px;
  flex-shrink: 0;
}
.div21 {
  position: absolute;
  top: 1635px;
  left: 219px;
  line-height: 45px;
  font-weight: 600;
  text-shadow: 1px 0 0 #d6e8fa, 0 1px 0 #d6e8fa, -1px 0 0 #d6e8fa, 0 -1px 0 #d6e8fa;
  flex-shrink: 0;
}
.rectangleParent13 {
  position: absolute;
  top: 1832px;
  left: calc(50% + 533px);
  width: 243.2px;
  height: 48px;
  flex-shrink: 0;
  text-align: center;
  color: #fff;
}
.groupChild14 {
  position: absolute;
  top: 0px;
  left: calc(50% - 121.6px);
  border-radius: 10px;
  background-color: #004ec2;
  width: 243.2px;
  height: 48px;
}
.b8 {
  position: absolute;
  top: 0px;
  left: 49px;
  line-height: 48px;
  display: inline-block;
  width: 145px;
  height: 45px;
}
/* 분석 시작하기 버튼(~1986)과 푸터 사이 여백. 원본은 86px 이라 답답해서
   206px 으로 넓혔다. DESIGN_HEIGHT 도 같은 만큼 늘려야 푸터가 잘리지 않는다. */
.child4 {
  position: absolute;
  top: 2099px;
  left: -100px;
  background-color: #d9d9d9;
  width: 2120px;
  height: 171px;
  flex-shrink: 0;
}
/* 프로필 자리 — 헤더 세로중심 100, 오른쪽 여백 50px */
.profile {
  position: absolute;
  top: 76px;
  left: 1822px;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}
.div22 {
  position: absolute;
  top: 85px;
  left: calc(50% - 676px);
  font-size: var(--font-body-02);
  font-weight: 500;
  color: #00559e;
  text-align: center;
  flex-shrink: 0;
}
/* 내비게이션의 현재 섹션 표시 — 굵게 + 밑줄 */
.div23 {
  position: absolute;
  top: 85px;
  left: calc(50% - 528px);
  font-size: var(--font-body-02);
  font-weight: 700;
  text-decoration: underline;
  color: #00559e;
  text-align: center;
  flex-shrink: 0;
}
.div24 {
  position: absolute;
  top: 85px;
  left: calc(50% - 386px);
  font-size: var(--font-body-02);
  font-weight: 500;
  color: #00559e;
  flex-shrink: 0;
}
.div25 {
  position: absolute;
  top: 228px;
  left: 50px;
  font-size: var(--font-title-02);
  font-weight: 600;
  color: #00559e;
  text-align: center;
  flex-shrink: 0;
}

/* 선택된 칩. 원래 채움색이 꺼진 칩의 테두리(#d6e8fa)와 같아 구분이 안 됐다.
   다른 화면의 필터 알약과 같은 진한 파랑으로 맞춘다. */
.chipOn {
  background-color: #0053e3;
  border-color: #0053e3;
}
/* 진한 배경 위에서는 글자를 흰색으로 바꾸고 옅은 파랑 외곽선을 없앤다. */
.chipLabelOn {
  color: #fff;
  text-shadow: none;
}
</style>
