<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import wordmark from '../assets/wordmark.svg'
import profileIcon from '../assets/profile.svg'
import checkIcon from '../assets/check.svg'
import { useDesignScale } from '../composables/useDesignScale'
import {
  ApiError,
  getFile,
  getMapping,
  listFiles,
  listReviews,
} from '../api'
import type { FileItem, MappedColumn, MappingResult, ReviewItem } from '../api'

const DESIGN_WIDTH = 1920

const { scale, offsetX } = useDesignScale(DESIGN_WIDTH)
const router = useRouter()
const route = useRoute()

// 진행 단계 — 1단계는 완료(체크), 2단계가 현재, 3단계는 대기.
const stepConnectors = [
  { left: 231, width: 643 },
  { left: 1046, width: 666 },
]

// 컬럼 매핑 표 — 열 위치는 디자인 좌표를 그대로 쓴다.
const COL = { source: 120, standard: 458, status: 871, checker: 1214, checkedAt: 1491 }

// 행 높이. 원본은 행마다 top 을 박아뒀는데 실제로는 139px 간격이라
// 첫 행 위치와 간격만 두고 나머지는 계산한다. 행 수가 데이터에 따라 변한다.
const ROW_H = 139
const FIRST_ROW_TOP = 1206
const TABLE_HEADER_H = 99
// 5행일 때 표 높이가 816px 이었다 — 99 + 5×139 + 22.
const TABLE_PAD_BOTTOM = 22
// 표 아래 요소들의 원본 좌표. 행이 5개일 때 기준이라 늘거나 줄면 그만큼 민다.
const BASE_ROWS = 5
const ANALYZE_TOP = 1938
const FOOTER_TOP = 2097
const BASE_HEIGHT = 2341

// --- 데이터 ---

const loading = ref(true)
const loadError = ref('')
const file = ref<FileItem | null>(null)
const mapping = ref<MappingResult | null>(null)
const reviews = ref<ReviewItem[]>([])

type Tone = 'auto' | 'needsCheck' | 'humanChecked' | 'noMatch'
type FilterKey = 'all' | 'human' | 'auto' | 'review'

type Row = {
  source: string
  standard: string
  tone: Tone
  statusLabel: string
  checker: string
  checkedAt: string
}

const activeFilter = ref<FilterKey>('all')

/** '2026-08-16T20:24:19+09:00' → '08-16 20:24' */
function formatMoment(iso?: string) {
  if (!iso) return '-'
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return '-'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(at.getMonth() + 1)}-${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())}`
}

/**
 * 원본 컬럼명에 붙은 검수 기록 중 사람이 판정을 내린 것.
 *
 * 매핑을 다시 돌리면 같은 컬럼에 검수 행이 한 벌 더 생기는 서버 버그가 있어서
 * (2026-08-16 확인) 같은 이름이 여러 개 나올 수 있다. 가장 최근 판정을 쓴다.
 */
function decidedReview(raw: string) {
  return reviews.value
    .filter((r) => r.raw === raw && r.verdict)
    .sort((a, b) => (b.reviewed_at ?? '').localeCompare(a.reviewed_at ?? ''))[0]
}

function toRow(column: MappedColumn): Row {
  const decided = decidedReview(column.raw)
  const checker = decided?.reviewed_by ?? '-'
  const checkedAt = formatMoment(decided?.reviewed_at)

  if (decided) {
    return {
      source: column.raw,
      standard: decided.candidate_name ?? column.matched_variant ?? '매칭 없음',
      tone: 'humanChecked',
      statusLabel: '사람 확인',
      checker,
      checkedAt,
    }
  }
  if (column.status === 'unmapped') {
    return { source: column.raw, standard: '매칭 없음', tone: 'noMatch', statusLabel: '! 매칭 없음', checker, checkedAt }
  }
  if (column.status === 'needs_review') {
    return {
      source: column.raw,
      standard: column.matched_variant ?? '미정',
      tone: 'needsCheck',
      statusLabel: '확인 필요',
      checker,
      checkedAt,
    }
  }
  return {
    source: column.raw,
    standard: column.matched_variant ?? column.code ?? '-',
    tone: 'auto',
    statusLabel: '자동 매핑',
    checker,
    checkedAt,
  }
}

const rows = computed<Row[]>(() => (mapping.value?.columns ?? []).map(toRow))

const counts = computed(() => ({
  all: rows.value.length,
  human: rows.value.filter((r) => r.tone === 'humanChecked').length,
  auto: rows.value.filter((r) => r.tone === 'auto').length,
  review: rows.value.filter((r) => r.tone === 'needsCheck' || r.tone === 'noMatch').length,
}))

const filters = computed(() => [
  { key: 'all' as FilterKey, label: `전체 ${counts.value.all}` },
  { key: 'human' as FilterKey, label: `사람 확인 ${counts.value.human}` },
  { key: 'auto' as FilterKey, label: `자동 매핑 ${counts.value.auto}` },
  { key: 'review' as FilterKey, label: `확인 필요 ${counts.value.review}` },
])

const visibleRows = computed(() => {
  const key = activeFilter.value
  if (key === 'all') return rows.value
  if (key === 'human') return rows.value.filter((r) => r.tone === 'humanChecked')
  if (key === 'auto') return rows.value.filter((r) => r.tone === 'auto')
  return rows.value.filter((r) => r.tone === 'needsCheck' || r.tone === 'noMatch')
})

// --- 배치 ---

const rowTop = (i: number) => FIRST_ROW_TOP + i * ROW_H
// 행과 행 사이에만 선을 긋는다. 마지막 행 아래는 표 테두리가 받는다.
const dividerTops = computed(() =>
  visibleRows.value.slice(1).map((_, i) => FIRST_ROW_TOP + 82 + i * ROW_H),
)
const tableHeight = computed(
  () => TABLE_HEADER_H + Math.max(1, visibleRows.value.length) * ROW_H + TABLE_PAD_BOTTOM,
)
// 표가 길어지거나 짧아진 만큼 아래 요소를 통째로 민다.
const shift = computed(() => (Math.max(1, visibleRows.value.length) - BASE_ROWS) * ROW_H)
const analyzeTop = computed(() => ANALYZE_TOP + shift.value)
const footerTop = computed(() => FOOTER_TOP + shift.value)
const designHeight = computed(() => BASE_HEIGHT + shift.value)

// --- 안내 카드 ---

const needsCount = computed(() => counts.value.review)
const alertTitle = computed(() => {
  const name = file.value?.filename ?? '파일'
  return needsCount.value > 0
    ? `${name} — 확인 필요 ${needsCount.value}건`
    : `${name} — 확인할 항목이 없어요`
})
const alertDetail = computed(() =>
  needsCount.value > 0
    ? `이름만으로는 판단하기 어려운 컬럼이 나왔어요. ${needsCount.value}건만 확인하면 됩니다.`
    : '모든 컬럼이 표준 용어에 붙었어요. 바로 분석을 시작할 수 있어요.',
)

// --- 불러오기 ---

/** 매핑이 끝난 가장 최근 파일. 갓 올려 아직 안 돌린 파일로 가면 빈 화면만 보인다. */
function latestMappedFile(items: FileItem[]) {
  return items.find((f) => f.auto_mapped_rate !== undefined)?.id ?? items[0]?.id ?? null
}

async function resolveFileId() {
  const fromQuery = Number(route.query.fileId)
  if (Number.isInteger(fromQuery) && fromQuery > 0) return fromQuery
  // 업로드 화면을 거치지 않고 바로 들어온 경우.
  const page = await listFiles({ size: 20 })
  return latestMappedFile(page.items)
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const id = await resolveFileId()
    if (id === null) {
      loadError.value = '아직 올린 파일이 없어요. 파일을 먼저 올려주세요.'
      return
    }
    // 검수 기록은 status=all 로 받아야 판정이 끝난 것까지 온다.
    const [loaded, result, reviewPage] = await Promise.all([
      getFile(id),
      getMapping(id),
      listReviews({ file_id: id, status: 'all', size: 200 }),
    ])
    file.value = loaded
    mapping.value = result
    reviews.value = reviewPage.items
  } catch (error) {
    loadError.value =
      error instanceof ApiError && error.code !== 'HTTP_ERROR' && error.code !== 'NETWORK_ERROR'
        ? error.message
        : '매핑 결과를 불러오지 못했어요. 잠시 후 다시 시도해 주세요'
  } finally {
    loading.value = false
  }
}

function goToTerms() {
  router.push({ name: 'terms', query: file.value ? { fileId: String(file.value.id) } : {} })
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
    <img :class="[$style.wordmark, 'link']" :src="wordmark" alt="물어볼래" @click="router.push('/')" />
    <img :class="$style.profile" :src="profileIcon" alt="내 프로필" />
    <b :class="$style.csv2">엑셀 · CSV 파일 업로드</b>
    <b :class="$style.csv">기관에서 사용하는 엑셀·CSV 파일을 그대로 올려보세요.<br/>별도의 서식 정리 없이 바로 업로드할 수 있어요.</b>

    <!-- 진행 단계: ① 완료 ② 진행 중 ③ 대기 -->
    <div v-for="c in stepConnectors" :key="c.left" :class="$style.stepLine"
         :style="{ left: `${c.left}px`, width: `${c.width}px` }" />
    <div :class="$style.stepDone" />
    <img :class="$style.stepDoneCheck" :src="checkIcon" alt="" />
    <b :class="$style.stepLabelDone">파일 올리기</b>
    <div :class="$style.stepCurrent" />
    <b :class="$style.stepNoCurrent">2</b>
    <b :class="$style.stepLabelCurrent">용어 확인</b>
    <div :class="$style.stepPending" />
    <b :class="$style.stepNoPending">3</b>
    <b :class="$style.stepLabelPending">분석 시작</b>

    <!-- 확인 필요 안내 — 결과를 받기 전에는 건수를 말할 수 없으니 내보내지 않는다.
         불러오는 중이거나 실패한 사정은 표 자리에서 한 줄로 알린다. -->
    <template v-if="!loading && !loadError">
      <div :class="$style.alertCard" />
      <b :class="$style.xlsx" :title="alertTitle">{{ alertTitle }}</b>
      <div :class="$style.div4">{{ alertDetail }}</div>
      <div v-if="needsCount > 0" :class="[$style.alertButton, 'btn']" role="button" @click="goToTerms">
        <div :class="[$style.alertButtonBg, 'btn-fill']" />
        <b :class="$style.alertButtonLabel">확인 필요 {{ needsCount }}건 보러가기 →</b>
      </div>
    </template>

    <!-- 상태 필터 + 검색 -->
    <div :class="$style.filterRow">
      <div v-for="f in filters" :key="f.key" role="button"
           :class="[$style.filterPill, 'btn',
                    activeFilter === f.key ? [$style.filterPillOn, 'btn-fill'] : 'btn-outline']"
           @click="activeFilter = f.key">{{ f.label }}</div>
    </div>
    <div :class="$style.searchBox">
      <div :class="$style.searchBoxBg" />
      <div :class="$style.searchPlaceholder">파일명 · 기관 · 항목 검색</div>
    </div>

    <!-- 컬럼 매핑 표 -->
    <div :class="$style.tableCard" :style="{ height: `${tableHeight}px` }" />
    <div :class="$style.tableHeaderBg" />
    <div v-for="top in dividerTops" :key="top" :class="$style.rowDivider" :style="{ top: `${top}px` }" />
    <b :class="$style.tableHead" :style="{ left: `${COL.source}px` }">원본 칼럼</b>
    <b :class="$style.tableHead" :style="{ left: `${COL.standard}px` }">표준 용어</b>
    <b :class="$style.tableHead" :style="{ left: '866px' }">상태</b>
    <b :class="$style.tableHead" :style="{ left: `${COL.checker}px` }">확인자</b>
    <b :class="$style.tableHead" :style="{ left: '1531px' }">확인 시각</b>

    <!-- 표 본문: 불러오는 중 · 실패 · 빈 결과는 첫 행 자리에 한 줄로 알린다. -->
    <div v-if="loading" :class="$style.tableNotice" :style="{ top: `${FIRST_ROW_TOP}px` }">
      매핑 결과를 불러오는 중이에요…
    </div>
    <div v-else-if="loadError" :class="[$style.tableNotice, $style.tableNoticeError]"
         :style="{ top: `${FIRST_ROW_TOP}px` }">{{ loadError }}</div>
    <div v-else-if="!visibleRows.length" :class="$style.tableNotice" :style="{ top: `${FIRST_ROW_TOP}px` }">
      이 상태에 해당하는 컬럼이 없어요.
    </div>

    <template v-for="(row, i) in visibleRows" :key="row.source + i">
      <b :class="$style.sourceCol" :style="{ top: `${rowTop(i)}px` }" :title="row.source">{{ row.source }}</b>
      <div :class="$style.standardCol" :style="{ top: `${rowTop(i)}px` }" :title="row.standard">{{ row.standard }}</div>
      <!-- 값이 없는 칸은 좁은 상자에 가운데 정렬, 값이 있으면 왼쪽 정렬 -->
      <div :class="row.checker === '-' ? $style.emptyCell : $style.checkerCol" :style="{ top: `${rowTop(i)}px` }">{{ row.checker }}</div>
      <div :class="row.checkedAt === '-' ? $style.emptyCellWide : $style.checkedAtCol" :style="{ top: `${rowTop(i)}px` }">{{ row.checkedAt }}</div>

      <div :class="$style.badge" :style="{ top: `${rowTop(i) - 2}px` }">
        <div :class="{
          [$style.badgeBgNeedsCheck]: row.tone === 'needsCheck',
          [$style.badgeBgHuman]: row.tone === 'humanChecked',
          [$style.badgeBgNoMatch]: row.tone === 'noMatch',
          [$style.badgeBgAuto]: row.tone === 'auto',
        }" />
        <div v-if="row.tone === 'needsCheck'" :class="$style.badgeDot" />
        <div v-else-if="row.tone === 'auto'" :class="[$style.badgeDot, $style.badgeDotAuto]" />
        <img v-else-if="row.tone === 'humanChecked'" :class="$style.badgeCheck" :src="checkIcon" alt="" />
        <b :class="{
          [$style.badgeLabel]: true,
          [$style.badgeLabelHuman]: row.tone === 'humanChecked',
          [$style.badgeLabelNoMatch]: row.tone === 'noMatch',
          [$style.badgeLabelAuto]: row.tone === 'auto',
        }">{{ row.statusLabel }}</b>
      </div>
    </template>

    <div :class="[$style.analyzeButton, 'btn']" role="button"
         :style="{ top: `${analyzeTop}px` }" @click="router.push('/ask')">
      <div :class="[$style.analyzeButtonBg, 'btn-fill']" />
      <b :class="$style.analyzeButtonLabel">분석하기</b>
    </div>
    <div :class="$style.child15" :style="{ top: `${footerTop}px` }" />
    <div :class="[$style.div24, 'link']" @click="router.push('/upload')">←</div>
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
  height: 2341px;
  position: relative;
  background-color: #f8f9fc;
  text-align: left;
  font-size: var(--font-body-03);
  color: #6b7280;
  font-family: Pretendard;
  transform-origin: top left;
}
.b {
  position: absolute;
  top: 85px;
  left: calc(50% - 676px);
  font-size: var(--font-body-02);
  text-decoration: underline;
  color: #00559e;
  text-align: center;
}
.div2 {
  position: absolute;
  top: 85px;
  left: calc(50% - 528px);
  font-size: var(--font-body-02);
  font-weight: 500;
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
/* 프로필 자리 — 헤더 세로중심 100, 오른쪽 여백 50px */
.profile {
  position: absolute;
  top: 76px;
  left: 1822px;
  border-radius: 50%;
  width: 48px;
  height: 48px;
}
.csv2 {
  position: absolute;
  top: 299px;
  left: calc(50% - 866px);
  font-size: var(--font-title-02);
  color: #0053e3;
}
.csv {
  position: absolute;
  top: 364px;
  left: calc(50% - 866px);
  font-size: var(--font-body-03);
  line-height: 45px;
}
.div24 {
  position: absolute;
  top: 228px;
  left: 50px;
  font-size: var(--font-title-02);
  font-weight: 600;
  color: #00559e;
  text-align: center;
}
/* ── 진행 단계 ──────────────────────────────── */
/* 원본은 빈 img 였던 단계 연결선 */
.stepLine {
  position: absolute;
  top: 594px;
  height: 1px;
  background-color: #d1d5db;
}
/* ① 완료 — 테두리만 있는 원 안에 체크 */
.stepDone {
  position: absolute;
  top: 574px;
  left: 50px;
  border-radius: 50%;
  border: 2px solid #0053e3;
  box-sizing: border-box;
  width: 40px;
  height: 40px;
}
.stepDoneCheck {
  position: absolute;
  top: 584px;
  left: 60px;
  width: 20px;
  height: 20px;
}
.stepLabelDone {
  position: absolute;
  top: 571px;
  left: 98px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #0053e3;
}
/* ② 진행 중 */
.stepCurrent {
  position: absolute;
  top: 574px;
  left: 888px;
  border-radius: 50%;
  background-color: #00559e;
  width: 40px;
  height: 40px;
}
.stepNoCurrent {
  position: absolute;
  top: 571px;
  left: 900px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #fff;
}
.stepLabelCurrent {
  position: absolute;
  top: 571px;
  left: 936px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #00559e;
}
/* ③ 대기 */
.stepPending {
  position: absolute;
  top: 573px;
  left: 1726px;
  border-radius: 50%;
  background-color: #d1d5db;
  width: 40px;
  height: 40px;
}
.stepNoPending {
  position: absolute;
  top: 571px;
  left: 1738px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #fff;
}
.stepLabelPending {
  position: absolute;
  top: 571px;
  left: 1774px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #d1d5db;
}
/* ── 확인 필요 안내 ─────────────────────────── */
.alertCard {
  position: absolute;
  top: 683px;
  left: 50px;
  filter: drop-shadow(3px 4px 10px rgba(0, 83, 227, 0.16));
  border-radius: 30px;
  border: 2px solid #0053e3;
  box-sizing: border-box;
  width: 1820px;
  height: 199px;
}
/* 파일명이 들어가는 줄이라 길이를 예측할 수 없다. '보러가기' 버튼(1501) 앞에서
   끊어 버튼을 덮지 않게 한다. */
.xlsx {
  position: absolute;
  top: 735px;
  left: 103px;
  width: 1370px;
  font-size: var(--font-title-03);
  line-height: 45px;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.div4 {
  position: absolute;
  top: 785px;
  left: 103px;
  font-size: var(--font-body-03);
  line-height: 45px;
  font-weight: 500;
}
.alertButton {
  position: absolute;
  top: 745px;
  left: calc(50% + 541px);
  width: 322px;
  height: 56px;
  text-align: center;
  font-size: var(--font-body-03);
  color: #fff;
}
.alertButtonBg {
  position: absolute;
  top: 0px;
  left: 1px;
  border-radius: 10px;
  background-color: #004ec2;
  width: 320px;
  height: 56px;
}
.alertButtonLabel {
  position: absolute;
  top: 0px;
  left: 0px;
  line-height: 56px;
  display: inline-block;
  width: 322px;
  height: 45px;
}
/* 상태 필터 알약 — 원본은 알약마다 좌표와 폭을 박아둬서 좌우 패딩이 57~65px
   까지 벌어져 있었다(높이 44px 보다 큼). flex 행으로 바꿔 내용에 맞게 줄이고
   패딩을 20px 로 통일한다. */
.filterRow {
  position: absolute;
  top: 972px;
  left: 50px;
  display: flex;
  gap: 14px;
}
.filterPill {
  height: 44px;
  padding: 0 20px;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  border-radius: 40px;
  border: 2px solid #0053e3;
  color: #005dff;
  white-space: nowrap;
}
.filterPillOn {
  background-color: #0053e3;
  color: #fff;
}
.searchBox {
  position: absolute;
  top: 966px;
  left: calc(50% - 33px);
  width: 942px;
  height: 56px;
  font-size: var(--font-body-03);
  color: #a0a0a0;
}
.searchBoxBg {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 10px;
  background-color: #fff;
  border: 2px solid #c2ddf5;
  box-sizing: border-box;
  width: 942px;
  height: 56px;
}
.searchPlaceholder {
  position: absolute;
  top: 0px;
  left: 24.66px;
  line-height: 56px;
  display: inline-block;
  width: 318.1px;
  height: 45px;
}
/* ── 컬럼 매핑 표 ───────────────────────────── */
.tableCard {
  position: absolute;
  top: 1048px;
  left: 50px;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1820px;
  height: 816px;
}
.tableHeaderBg {
  position: absolute;
  top: 1048px;
  left: 50px;
  border-radius: 20px 20px 0px 0px;
  background-color: #f1f7ff;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1820px;
  height: 99px;
}
/* 원본은 빈 img 였던 행 구분선 */
.rowDivider {
  position: absolute;
  left: 50px;
  width: 1820px;
  height: 1px;
  background-color: #d1d5db;
}
.tableHead {
  position: absolute;
  top: 1083px;
  font-size: var(--font-body-03);
  line-height: 30px;
}
/* 원본 칼럼·표준 용어·확인자는 전부 서버 값이라 길이를 예측할 수 없다.
   칸 폭 안에서 한 줄로 자른다 — 전체 값은 title 로 본다. */
.sourceCol {
  position: absolute;
  line-height: 36px;
  left: 120px;
  width: 310px;
  color: #000;
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.standardCol {
  position: absolute;
  line-height: 36px;
  left: 458px;
  width: 385px;
  font-weight: 500;
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.checkerCol {
  position: absolute;
  left: 1214px;
  width: 250px;
  font-weight: 500;
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.checkedAtCol {
  position: absolute;
  left: 1491px;
  font-weight: 500;
  display: inline-block;
  width: 193px;
}
.emptyCell {
  position: absolute;
  line-height: 36px;
  left: 1214px;
  font-weight: 500;
  text-align: center;
  display: inline-block;
  width: 61px;
}
.emptyCellWide {
  position: absolute;
  line-height: 36px;
  left: 1534px;
  font-weight: 500;
  text-align: center;
  display: inline-block;
  width: 88px;
}
/* 표 본문 자리에 뜨는 한 줄 안내 — 불러오는 중 · 실패 · 빈 결과 */
.tableNotice {
  position: absolute;
  left: 120px;
  line-height: 36px;
  font-weight: 500;
}
.tableNoticeError {
  color: #d92d20;
}
/* 상태 배지 */
.badge {
  position: absolute;
  left: 871px;
  width: 161px;
  height: 41px;
  font-size: var(--font-body-03);
  color: #00559e;
}
.badgeBgNeedsCheck {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 50px;
  background-color: #e5f3ff;
  width: 161px;
  height: 41px;
}
.badgeBgHuman {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 50px;
  background-color: rgba(0, 83, 227, 0.2);
  width: 161px;
  height: 41px;
}
.badgeBgNoMatch {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 50px;
  background-color: rgba(255, 0, 0, 0.18);
  width: 161px;
  height: 41px;
}
/* 자동 매핑 — 사람 손이 필요 없다는 뜻이라 완료 색(초록)을 쓴다. */
.badgeBgAuto {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 50px;
  background-color: #dcfce7;
  width: 161px;
  height: 41px;
}
.badgeDot {
  position: absolute;
  top: 10px;
  left: 29px;
  border-radius: 50%;
  background-color: #00559e;
  width: 22px;
  height: 22px;
}
.badgeDotAuto {
  background-color: #16a34a;
}
.badgeCheck {
  position: absolute;
  top: 11px;
  left: 29px;
  width: 20px;
  height: 20px;
}
.badgeLabel {
  position: absolute;
  top: 9px;
  left: 58px;
}
.badgeLabelHuman {
  color: #0053e3;
}
.badgeLabelNoMatch {
  left: 44px;
  color: #ff0000;
}
.badgeLabelAuto {
  color: #16a34a;
}
/* ── 하단 ───────────────────────────────────── */
.analyzeButton {
  position: absolute;
  top: 1938px;
  left: 1520px;
  width: 350px;
  height: 56px;
  text-align: center;
  color: #fff;
}
.analyzeButtonBg {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 10px;
  background-color: #0053e3;
  width: 350px;
  height: 56px;
}
.analyzeButtonLabel {
  position: absolute;
  line-height: 56px;
  top: 0px;
  left: 64px;
  display: inline-block;
  width: 222px;
  height: 36px;
}
.child15 {
  position: absolute;
  top: 2097px;
  left: -100px;
  background-color: #f3f3f3;
  width: 2120px;
  height: 244px;
}
</style>
