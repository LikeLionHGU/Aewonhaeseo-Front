<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import wordmark from '../assets/wordmark.svg'
import checkIcon from '../assets/check.svg'
import AccountMenu from '../components/AccountMenu.vue'
import { useDesignScale } from '../composables/useDesignScale'
import { ApiError, listFiles } from '../api'
import type { FileItem } from '../api'

const DESIGN_WIDTH = 1920
// 원본 캔버스는 2177px 이지만 푸터(1937 + 244)가 4px 잘려서 끝까지 맞춘다.
const BASE_HEIGHT = 2181

const { scale, offsetX } = useDesignScale(DESIGN_WIDTH)
const router = useRouter()

// 한 번에 가져올 파일 수. 목록에 페이지 넘김 UI 가 없어서 한 장으로 받는다.
const PAGE_SIZE = 50

// 요약 카드 — 카드 왼쪽에서 51px 들어간 자리에 글이 놓인다.
const TEXT_INSET = 51
const CARD_LEFTS = [50, 516, 982, 1448]

// 파일 목록 — 첫 행 1071, 이후 139px 간격.
const COL = { file: 120, period: 588, status: 871, version: 1214, uploaded: 1481, action: 1700 }
/* 알약 폭. 원본 161px 에서는 '확인 필요 137' 이 두 줄로 쪼개져 알약 밖으로
   흘러나왔다. 매핑 상태 칸은 871~1214 라 260px 까지 여유가 있다. */
const MAPPING_TRACK = 260
const FIRST_ROW_TOP = 1071
const ROW_H = 139
const TABLE_HEADER_H = 99
const TABLE_PAD_BOTTOM = 22
const BASE_ROWS = 5
const FOOTER_TOP = 1937

// --- 데이터 ---

const loading = ref(true)
const loadError = ref('')
const files = ref<FileItem[]>([])

type FilterKey = 'all' | 'review' | 'done' | 'failed'
const activeFilter = ref<FilterKey>('all')

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** '2026-08-16T20:43:12+09:00' → '08-16' */
function formatDay(iso: string) {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return '-'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
}

/** 'YYYY-MM-DD' 두 개를 'YYYY-MM ~ MM' 처럼 짧게 묶는다. */
function formatPeriod(from?: string | null, to?: string | null) {
  if (!from || !to) return '-'
  const [fy, fm] = from.split('-')
  const [ty, tm] = to.split('-')
  return fy === ty ? `${fy}-${fm} ~ ${tm}` : `${fy}-${fm} ~ ${ty}-${tm}`
}

type Mapping =
  | { kind: 'partial'; label: string; fill: number }
  | { kind: 'done'; label: string }
  | { kind: 'failed'; label: string }

type Row = {
  id: number
  name: string
  meta: string
  period: string
  version: string
  uploaded: string
  pending: number
  failed: boolean
  mapped: boolean
  mapping: Mapping
}

const STATUS_LABEL: Record<string, string> = {
  uploaded: '매핑 대기',
  mapping: '매핑 중',
  mapped: '매핑 완료',
  reviewing: '확인 중',
}

function toRow(item: FileItem): Row {
  const columns = item.column_count ?? 0
  const pending = item.pending_review_count ?? 0
  const mapped = item.auto_mapped_rate !== undefined
  const failed = item.status === 'failed'

  // 목록 응답이 자동 매핑률을 직접 준다.
  const ratio = (item.auto_mapped_rate ?? 0) / 100

  let mapping: Mapping
  if (failed) {
    mapping = { kind: 'failed', label: '처리 실패' }
  } else if (pending > 0) {
    mapping = { kind: 'partial', label: `확인 필요 ${pending}`, fill: MAPPING_TRACK * ratio }
  } else if (item.status === 'completed' || item.status === 'mapped') {
    mapping = { kind: 'done', label: '확인 완료' }
  } else {
    mapping = {
      kind: 'partial',
      label: STATUS_LABEL[item.status] ?? item.status,
      fill: MAPPING_TRACK * ratio,
    }
  }

  return {
    id: item.id,
    name: item.filename,
    meta: `${columns}개 컬럼 · ${formatSize(item.size_bytes)}`,
    period: formatPeriod(item.measured_from, item.measured_to),
    version: item.dictionary_version ?? '-',
    uploaded: formatDay(item.uploaded_at),
    pending,
    failed,
    // 아직 매핑을 돌리지 않았으면 보여줄 결과가 없다.
    mapped,
    mapping,
  }
}

const rows = computed(() => files.value.map(toRow))

/** 확인이 끝난 파일. 아직 매핑을 안 돌린 파일은 완료가 아니다. */
const isDone = (row: Row) => !row.failed && row.mapped && row.pending === 0

const counts = computed(() => ({
  all: rows.value.length,
  review: rows.value.filter((r) => r.pending > 0).length,
  done: rows.value.filter(isDone).length,
  failed: rows.value.filter((r) => r.failed).length,
}))

const filters = computed(() => [
  { key: 'all' as FilterKey, label: '전체' },
  { key: 'review' as FilterKey, label: `확인 필요 ${counts.value.review}` },
  { key: 'done' as FilterKey, label: `완료 ${counts.value.done}` },
  { key: 'failed' as FilterKey, label: `실패 ${counts.value.failed}` },
])

const visibleRows = computed(() => {
  const key = activeFilter.value
  if (key === 'all') return rows.value
  if (key === 'review') return rows.value.filter((r) => r.pending > 0)
  if (key === 'failed') return rows.value.filter((r) => r.failed)
  return rows.value.filter(isDone)
})

// --- 요약 카드 ---

const statCards = computed(() => {
  const totalColumns = files.value.reduce((sum, f) => sum + (f.column_count ?? 0), 0)
  const pendingTotal = files.value.reduce((sum, f) => sum + (f.pending_review_count ?? 0), 0)
  const filesWithPending = counts.value.review
  const totalBytes = files.value.reduce((sum, f) => sum + f.size_bytes, 0)

  return [
    {
      label: '연결된 파일',
      value: String(counts.value.all),
      accent: false,
      notes: [
        { text: `완료 ${counts.value.done}개`, dx: 0 },
        { text: '·', dx: 108 },
        { text: formatSize(totalBytes), dx: 133 },
      ],
    },
    {
      label: '전체 컬럼',
      value: String(totalColumns),
      accent: false,
      notes: [{ text: `파일 ${counts.value.all}개 합계`, dx: 0 }],
    },
    {
      label: '확인 필요',
      value: String(pendingTotal),
      accent: pendingTotal > 0,
      notes: [
        {
          text: filesWithPending > 0 ? `파일 ${filesWithPending}개에 분산` : '남은 항목이 없어요',
          dx: 0,
        },
      ],
    },
    {
      label: '처리 실패',
      value: String(counts.value.failed),
      accent: counts.value.failed > 0,
      notes: [
        { text: counts.value.failed > 0 ? '형식 확인 필요' : '모두 정상이에요', dx: 0 },
      ],
    },
  ]
})

// --- 배치 ---

const rowTop = (i: number) => FIRST_ROW_TOP + i * ROW_H
const rowDividers = computed(() =>
  visibleRows.value.slice(1).map((_, i) => FIRST_ROW_TOP + 99 + i * ROW_H),
)
const tableHeight = computed(
  () => TABLE_HEADER_H + Math.max(1, visibleRows.value.length) * ROW_H + TABLE_PAD_BOTTOM,
)
const shift = computed(() => (Math.max(1, visibleRows.value.length) - BASE_ROWS) * ROW_H)
const footerTop = computed(() => FOOTER_TOP + shift.value)
const designHeight = computed(() => BASE_HEIGHT + shift.value)

// --- 불러오기 ---

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    // 사전 버전·자동 매핑률·측정 기간까지 목록 한 번으로 다 온다.
    files.value = (await listFiles({ size: PAGE_SIZE })).items
  } catch (error) {
    loadError.value =
      error instanceof ApiError && error.code !== 'HTTP_ERROR' && error.code !== 'NETWORK_ERROR'
        ? error.message
        : '파일 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요'
  } finally {
    loading.value = false
  }
}

function openFile(row: Row) {
  const query = { fileId: String(row.id) }
  router.push(row.pending > 0 ? { name: 'terms', query } : { name: 'mapping', query })
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
    <img :class="[$style.wordmark, 'link']" :src="wordmark" alt="물어볼래" @click="router.push('/')" />
    <AccountMenu />
    <b :class="$style.b3">내 데이터</b>
    <b :class="$style.b2">업로드한 파일과 용어 표준화 상태를 확인할 수 있어요.</b>

    <!-- 업로드 — 전용 페이지로 이동 -->
    <div :class="[$style.rectangleParent7, 'btn']" role="button" @click="router.push('/upload')">
      <div :class="[$style.groupChild15, 'btn-fill']" />
      <b :class="$style.csv4">엑셀 · CSV 파일 업로드</b>
    </div>

    <!-- 요약 카드 -->
    <template v-for="(card, ci) in statCards" :key="card.label">
      <div :class="$style.statCard" :style="{ left: `${CARD_LEFTS[ci]}px` }" />
      <b :class="$style.statLabel" :style="{ left: `${CARD_LEFTS[ci] + TEXT_INSET}px` }">{{ card.label }}</b>
      <b :class="[$style.statValue, card.accent && $style.statValueAccent]"
         :style="{ left: `${CARD_LEFTS[ci] + TEXT_INSET}px` }">{{ loading ? '–' : card.value }}</b>
      <div v-for="note in card.notes" :key="note.text + note.dx" :class="$style.statNote"
           :style="{ left: `${CARD_LEFTS[ci] + TEXT_INSET + note.dx}px` }">{{ loading ? '' : note.text }}</div>
    </template>

    <!-- 상태 필터 + 검색 -->
    <div :class="$style.filterRow">
      <div v-for="f in filters" :key="f.key" role="button"
           :class="[$style.filterPill, 'btn',
                    activeFilter === f.key ? [$style.filterPillOn, 'btn-fill'] : 'btn-outline']"
           @click="activeFilter = f.key">{{ f.label }}</div>
    </div>
    <div :class="$style.rectangleParent">
      <div :class="$style.groupChild" />
      <div :class="$style.div15">파일명 · 기관 · 항목 검색</div>
    </div>

    <!-- 파일 목록 -->
    <div :class="$style.child6" :style="{ height: `${tableHeight}px` }" />
    <div :class="$style.child7" />
    <div v-for="top in rowDividers" :key="top" :class="$style.rowDivider" :style="{ top: `${top}px` }" />
    <b :class="$style.tableHead" :style="{ left: `${COL.file}px` }">파일</b>
    <b :class="$style.tableHead" :style="{ left: `${COL.period}px` }">기간</b>
    <b :class="$style.tableHead" :style="{ left: '866px' }">매핑 상태</b>
    <b :class="$style.tableHead" :style="{ left: `${COL.version}px` }">사전 버전</b>
    <b :class="$style.tableHead" :style="{ left: `${COL.uploaded}px` }">업로드</b>

    <div v-if="loading || loadError || !visibleRows.length"
         :class="[$style.tableNotice, loadError && $style.tableNoticeError]"
         :style="{ top: `${FIRST_ROW_TOP}px` }">
      {{ loading ? '파일 목록을 불러오는 중이에요…' : loadError || '이 상태에 해당하는 파일이 없어요.' }}
    </div>

    <template v-for="(row, i) in visibleRows" :key="row.id">
      <div :class="$style.fileCell" :style="{ top: `${rowTop(i)}px`, left: `${COL.file}px` }">
        <b :class="$style.fileName" :title="row.name">{{ row.name }}</b>
        <div :class="$style.fileMeta">{{ row.meta }}</div>
      </div>
      <div :class="$style.cell" :style="{ top: `${rowTop(i) + 18}px`, left: `${COL.period}px` }">{{ row.period }}</div>
      <div :class="$style.cell" :style="{ top: `${rowTop(i) + 18}px`, left: `${COL.version}px` }">{{ row.version }}</div>
      <div :class="$style.cell" :style="{ top: `${rowTop(i) + 18}px`, left: `${COL.uploaded}px` }">{{ row.uploaded }}</div>
      <!-- 실패했거나 아직 매핑 전이면 열어봐야 볼 게 없다. -->
      <b v-if="!row.failed && row.mapped" :class="[$style.action, 'link']" role="button"
         :style="{ top: `${rowTop(i) + 21}px`, left: `${COL.action}px` }"
         @click="openFile(row)">{{ row.pending > 0 ? '확인하기 →' : '결과 보기 →' }}</b>

      <!-- 매핑 상태: 진행 중이면 막대 + 알약, 완료면 꽉 찬 막대 + 체크, 실패면 붉은 알약만 -->
      <div :class="$style.mappingCell" :style="{ top: `${rowTop(i) + 2}px`, left: `${COL.status}px` }">
        <template v-if="row.mapping.kind !== 'failed'">
          <div :class="$style.barTrack" />
          <div :class="row.mapping.kind === 'done' ? $style.barFillDone : $style.barFill"
               :style="{ width: `${row.mapping.kind === 'done' ? MAPPING_TRACK : row.mapping.fill}px` }" />
          <div :class="$style.pill" />
          <template v-if="row.mapping.kind === 'done'">
            <img :class="$style.pillCheck" :src="checkIcon" alt="" />
            <b :class="[$style.pillLabel, $style.pillLabelDone]">{{ row.mapping.label }}</b>
          </template>
          <template v-else>
            <div :class="$style.pillDot" />
            <b :class="$style.pillLabel">{{ row.mapping.label }}</b>
          </template>
        </template>
        <template v-else>
          <div :class="$style.pillFailed" />
          <b :class="[$style.pillLabel, $style.pillLabelFailed]">{{ row.mapping.label }}</b>
        </template>
      </div>
    </template>

    <div :class="$style.child12" :style="{ top: `${footerTop}px` }" />
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
  height: 2181px;
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
.b3 {
  position: absolute;
  top: 299px;
  left: calc(50% - 866px);
  font-size: var(--font-title-02);
  color: #0053e3;
}
.b2 {
  position: absolute;
  top: 347px;
  left: calc(50% - 866px);
  font-size: var(--font-body-03);
  line-height: 45px;
}
.rectangleParent7 {
  position: absolute;
  top: 288px;
  left: calc(50% + 580px);
  width: 320px;
  height: 56px;
  text-align: center;
  font-size: var(--font-body-03);
  color: #fff;
}
.groupChild15 {
  position: absolute;
  top: 0px;
  left: calc(50% - 160px);
  border-radius: 10px;
  background-color: #004ec2;
  width: 320px;
  height: 56px;
}
.csv4 {
  position: absolute;
  top: 0px;
  left: 27px;
  line-height: 56px;
  display: inline-block;
  width: 266px;
  height: 45px;
}
/* ── 요약 카드 ──────────────────────────────── */
.statCard {
  position: absolute;
  top: 426px;
  border-radius: 20px;
  background-color: rgba(214, 232, 250, 0.3);
  border: 2px solid #d6e8fb;
  box-sizing: border-box;
  width: 420px;
  height: 240px;
}
.statLabel {
  position: absolute;
  top: 457px;
  font-size: var(--font-body-03);
  line-height: 45px;
  color: #00559e;
}
.statValue {
  position: absolute;
  top: 510px;
  font-size: var(--font-metric);
  color: #0053e3;
}
.statValueAccent {
  color: #ff0000;
}
.statNote {
  position: absolute;
  top: 590px;
  font-size: var(--font-body-03);
  line-height: 45px;
  font-weight: 500;
}
/* 상태 필터 알약 — 원본은 알약마다 좌표와 폭을 박아둬서 좌우 패딩이 57~65px
   까지 벌어져 있었다(높이 44px 보다 큼). flex 행으로 바꿔 내용에 맞게 줄이고
   패딩을 20px 로 통일한다. */
.filterRow {
  position: absolute;
  top: 854px;
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
.rectangleParent {
  position: absolute;
  top: 848px;
  left: calc(50% - 121px);
  width: 1030px;
  height: 56px;
  font-size: var(--font-body-03);
  color: #a0a0a0;
}
.groupChild {
  position: absolute;
  top: 0px;
  left: calc(50% - 515px);
  border-radius: 10px;
  background-color: #fff;
  border: 2px solid #c2ddf5;
  box-sizing: border-box;
  width: 1030px;
  height: 56px;
}
.div15 {
  position: absolute;
  top: 0px;
  left: 26.97px;
  line-height: 56px;
  display: inline-block;
  width: 347.8px;
  height: 45px;
}
/* ── 파일 목록 ──────────────────────────────── */
.child6 {
  position: absolute;
  top: 930px;
  left: 50px;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1820px;
  height: 816px;
}
.child7 {
  position: absolute;
  top: 930px;
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
  top: 965px;
  font-size: var(--font-body-03);
  line-height: 30px;
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
.fileCell {
  position: absolute;
  width: 440px;
  height: 72px;
  color: #000;
}
/* 표 본문 — 헤더(.tableHead 25px)와 크기를 맞춘다. line-height 는 이전 줄 상자
   높이(30px 의 normal ≈ 36px)를 그대로 유지해 세로 위치가 밀리지 않게 한다. */
.fileName {
  position: absolute;
  top: 0px;
  left: 0px;
  font-size: var(--font-body-03);
  line-height: 36px;
  display: inline-block;
  width: 440px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fileMeta {
  position: absolute;
  top: 42px;
  left: 0px;
  font-size: var(--font-body-03);
  line-height: 30px;
  font-weight: 500;
  color: #9ca3af;
  display: inline-block;
  width: 323px;
}
.cell {
  position: absolute;
  font-size: var(--font-body-03);
  line-height: 36px;
  font-weight: 500;
}
.action {
  position: absolute;
  font-size: var(--font-body-03);
  line-height: 30px;
}
/* ── 매핑 상태 위젯 ─────────────────────────── */
.mappingCell {
  position: absolute;
  width: 260px;
  height: 68px;
  font-size: var(--font-body-03);
  color: #00559e;
}
.barTrack {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 40px;
  background-color: #d9d9d9;
  width: 260px;
  height: 17px;
}
.barFill {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 40px;
  background-color: #00559e;
  height: 17px;
}
.barFillDone {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 40px;
  background-color: #0053e3;
  height: 17px;
}
.pill {
  position: absolute;
  top: 27px;
  left: 0px;
  border-radius: 50px;
  background-color: #e5f3ff;
  width: 260px;
  height: 41px;
}
.pillFailed {
  position: absolute;
  top: 16px;
  left: 0px;
  border-radius: 50px;
  background-color: rgba(255, 0, 0, 0.18);
  width: 260px;
  height: 41px;
}
.pillDot {
  position: absolute;
  top: 37px;
  left: 21px;
  border-radius: 50%;
  background-color: #00559e;
  width: 22px;
  height: 22px;
}
.pillCheck {
  position: absolute;
  top: 37px;
  left: 20px;
  width: 20px;
  height: 20px;
}
/* 상태 문구는 알약 안에서 한 줄로 둔다. '확인 필요 1284' 처럼 건수가 커져도
   줄바꿈되지 않게 한다. */
.pillLabel {
  position: absolute;
  top: 36px;
  left: 50px;
  right: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pillLabelDone {
  left: 46px;
  color: #0053e3;
}
.pillLabelFailed {
  top: 25px;
  left: 44px;
  color: #ff0000;
}
.child12 {
  position: absolute;
  top: 1937px;
  left: -100px;
  background-color: #f3f3f3;
  width: 2120px;
  height: 244px;
}
</style>
