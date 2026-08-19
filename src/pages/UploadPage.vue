<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import wordmark from '../assets/wordmark.svg'
import profileIcon from '../assets/profile.svg'
import uploadIcon from '../assets/upload-large.svg'
import { useDesignScale } from '../composables/useDesignScale'
import { ApiError, ingestFile, runMapping, uploadFile } from '../api'
import type { MappingSummary } from '../api'

const DESIGN_WIDTH = 1920

const { scale, offsetX } = useDesignScale(DESIGN_WIDTH)
const router = useRouter()

const ACCEPT = '.csv,.xls,.xlsx'
const ALLOWED_EXT = ['csv', 'xls', 'xlsx']
const MAX_BYTES = 50 * 1024 * 1024 // 파일당 최대 50MB

// 진행 단계
const steps = [
  { no: '1', label: '파일 올리기', circleLeft: 50, noLeft: 64, labelLeft: 98, done: true },
  { no: '2', label: '용어 확인', circleLeft: 888, noLeft: 900, labelLeft: 936, done: false },
  { no: '3', label: '분석 시작', circleLeft: 1726, noLeft: 1738, labelLeft: 1774, done: false },
]
const stepConnectors = [
  { left: 231, width: 643 },
  { left: 1046, width: 666 },
]

// 카드 한 장의 생애: 올리는 중 → 매핑 중 → (적재 중) → 준비 완료 / 실패.
// 확인할 컬럼이 남아 있으면 적재를 건너뛴다 — 검수를 마쳐야 날짜가 붙는다.
type UploadState = 'uploading' | 'mapping' | 'ingesting' | 'ready' | 'failed'

type UploadedFile = {
  key: number
  name: string
  size: number
  /** 업로드 진행률 0~1. 매핑 단계에서는 쓰지 않는다. */
  progress: number
  state: UploadState
  fileId?: number
  summary?: MappingSummary
  /** 적재된 측정값 수. 확인할 컬럼이 남아 있으면 적재하지 않아 비어 있다. */
  inserted?: number
  error?: string
}

// 같은 이름·크기의 파일을 다시 올릴 수 있어서 이름을 키로 쓰면 안 된다.
let nextKey = 0

const fileInput = ref<HTMLInputElement | null>(null)
const listHeading = ref<HTMLElement | null>(null)
const files = ref<UploadedFile[]>([])
const errors = ref<string[]>([])
const isDragging = ref(false)

const readyFiles = computed(() => files.value.filter((f) => f.state === 'ready'))
const canConfirm = computed(() => readyFiles.value.length > 0)

// 파일 카드 — 첫 장이 1583px, 이후 카드는 높이 + 여백만큼 내려간다.
const CARD_TOP = 1583
const CARD_HEIGHT = 221
const CARD_GAP = 20
const CARD_STEP = CARD_HEIGHT + CARD_GAP
const TRACK_WIDTH = 1388
const cardTop = (i: number) => CARD_TOP + i * CARD_STEP

// 파일이 없을 땐 점선 빈 상태 박스만 놓인다.
const EMPTY_BOX_TOP = 1616
const EMPTY_BOX_HEIGHT = 151

// 마지막 카드 아래 91px 지점에 "용어 확인하기", 그 아래 229px 지점부터 푸터.
const confirmTop = computed(() => cardTop(files.value.length - 1) + CARD_HEIGHT + 91)
// "용어 확인하기" 버튼 높이 — .confirmButton 과 같이 유지해야 한다
const CONFIRM_BUTTON_HEIGHT = 56
const footerTop = computed(() =>
  files.value.length
    ? confirmTop.value + CONFIRM_BUTTON_HEIGHT + 229
    : EMPTY_BOX_TOP + EMPTY_BOX_HEIGHT + 170,
)
const designHeight = computed(() => footerTop.value + 244)

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** 카드에 띄울 상태 배지. tone 은 아래 statusTone* 스타일과 짝이다. */
function statusOf(file: UploadedFile) {
  if (file.state === 'uploading') return { label: '올리는 중', tone: 'busy' }
  if (file.state === 'mapping') return { label: '매핑 중', tone: 'busy' }
  if (file.state === 'ingesting') return { label: '적재 중', tone: 'busy' }
  if (file.state === 'failed') return { label: '실패', tone: 'error' }
  const left = file.summary ? file.summary.needs_review + file.summary.unmapped : 0
  return left > 0 ? { label: '확인 필요', tone: 'warn' } : { label: '분석 준비 완료', tone: 'done' }
}

/** 카드 두 번째 줄 — 파일 크기 뒤에 붙는 설명. */
function detailOf(file: UploadedFile) {
  if (file.state === 'uploading') return `올리는 중 ${Math.round(file.progress * 100)}%`
  if (file.state === 'mapping') return '용어 매핑 중'
  if (file.state === 'ingesting') return '측정값 넣는 중'
  if (file.state === 'failed') return file.error ?? '업로드하지 못했어요'
  if (!file.summary) return '매핑 완료'
  const left = file.summary.needs_review + file.summary.unmapped
  const rate = `자동 매핑 ${Math.round(file.summary.auto_mapped_rate)}%`
  if (left > 0) return `${rate} · 확인 필요 ${left}건`
  return file.inserted !== undefined ? `${rate} · 측정값 ${file.inserted}건` : rate
}

/**
 * 카드에 그대로 노출할 실패 문구.
 *
 * 서버가 우리말 설명을 붙여 주면 그게 제일 정확하니 그대로 쓰고, 연결 자체가
 * 끊겼거나 프록시가 502 를 뱉은 경우처럼 사람이 읽을 게 없는 실패만 갈아끼운다.
 */
function messageOf(error: unknown) {
  if (!(error instanceof ApiError)) return '알 수 없는 오류가 발생했어요'
  if (error.code === 'HTTP_ERROR' || error.code === 'NETWORK_ERROR') {
    return '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요'
  }
  return error.message
}

/** 막대 길이. 실패한 카드는 채우지 않는다. */
function barRatio(file: UploadedFile) {
  if (file.state === 'uploading') return file.progress
  if (file.state === 'failed') return 0
  return 1
}

/**
 * 업로드하고 곧바로 매핑까지 돌린다.
 *
 * 카드는 files 에 넣은 뒤 배열에서 다시 꺼내 쓴다. push 에 넘긴 원본 객체를
 * 그대로 고치면 반응형 프록시를 거치지 않아 화면이 갱신되지 않는다.
 */
async function runPipeline(source: File, card: UploadedFile) {
  try {
    const created = await uploadFile(source, (ratio) => {
      card.progress = ratio
    })
    card.fileId = created.id
    card.progress = 1
    card.state = 'mapping'

    const result = await runMapping(created.id)
    card.summary = result.summary

    // 확인할 컬럼이 없으면 바로 적재한다. 적재를 해야 분석이 볼 수 있다.
    // 남아 있으면 검수를 마친 뒤 용어 확인 화면에서 적재한다.
    if (result.summary.needs_review + result.summary.unmapped === 0) {
      card.state = 'ingesting'
      const ingested = await ingestFile(created.id)
      card.inserted = ingested.inserted_values
    }
    card.state = 'ready'
  } catch (error) {
    card.state = 'failed'
    card.error = messageOf(error)
  }
}

/**
 * 올린 파일 목록으로 내려준다.
 *
 * 카드가 디자인 좌표 1583px 자리에 생겨서 업로드해도 화면에 안 보인다.
 * 새로 추가했을 때만 한 번 움직이고, 이후 상태 변화(매핑·적재)에는 건드리지 않는다.
 */
async function revealUploadedList() {
  await nextTick()
  const el = listHeading.value
  if (!el) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // 제목이 화면 맨 위에 딱 붙지 않도록 조금 위에서 멈춘다.
  const top = el.getBoundingClientRect().top + window.scrollY - 120
  window.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' })
}

function addFiles(list: FileList | null) {
  if (!list) return
  const nextErrors: string[] = []
  const queued: { source: File; card: UploadedFile }[] = []

  for (const file of Array.from(list)) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXT.includes(ext)) {
      nextErrors.push(`${file.name} — 지원하지 않는 형식이에요 (.xlsx · .xls · .csv)`)
      continue
    }
    if (file.size > MAX_BYTES) {
      nextErrors.push(`${file.name} — 50MB를 넘어요 (${formatSize(file.size)})`)
      continue
    }
    // 아직 올라가는 중인 같은 파일만 걸러낸다. 이미 끝난 파일은 다시 올릴 수 있다.
    if (
      files.value.some(
        (f) =>
          f.name === file.name &&
          f.size === file.size &&
          (f.state === 'uploading' || f.state === 'mapping'),
      )
    ) {
      continue
    }

    files.value.push({
      key: nextKey++,
      name: file.name,
      size: file.size,
      progress: 0,
      state: 'uploading',
    })
    queued.push({ source: file, card: files.value[files.value.length - 1] })
  }

  errors.value = nextErrors
  // 하나도 못 받았으면(형식·용량 탈락) 화면을 움직일 이유가 없다.
  if (queued.length) void revealUploadedList()
  for (const { source, card } of queued) void runPipeline(source, card)
}

function goToMapping() {
  if (!canConfirm.value) return
  // 매핑 화면이 어느 파일을 열지 알 수 있게 id 를 넘긴다.
  router.push({ name: 'mapping', query: { fileId: String(readyFiles.value[0].fileId) } })
}

function pickFile() {
  fileInput.value?.click()
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  addFiles(input.files)
  // 같은 파일을 다시 골라도 change 가 뜨도록 초기화
  input.value = ''
}

function onDrop(event: DragEvent) {
  isDragging.value = false
  addFiles(event.dataTransfer?.files ?? null)
}
</script>

<template>
  <div :class="$style.viewport" :style="{ height: `${designHeight * scale}px` }">
  <div :class="$style.div" :style="{ transform: `translateX(${offsetX}px) scale(${scale})`, height: `${designHeight}px` }">
    <b :class="[$style.b, 'link']" @click="router.push('/data')">내 데이터</b>
    <div :class="[$style.div2, 'link']" @click="router.push('/ask')">분석하기</div>
    <div :class="$style.div3">문의하기</div>
    <img :class="[$style.wordmark, 'link']" :src="wordmark" alt="물어볼래" @click="router.push('/')" />
    <img :class="$style.profile" :src="profileIcon" alt="내 프로필" />
    <b :class="$style.csv2">엑셀 · CSV 파일 업로드</b>
    <b :class="$style.csv">기관에서 사용하는 엑셀·CSV 파일을 그대로 올려보세요.<br/>별도의 서식 정리 없이 바로 업로드할 수 있어요.</b>

    <!-- 진행 단계 -->
    <div v-for="c in stepConnectors" :key="c.left" :class="$style.stepLine"
         :style="{ left: `${c.left}px`, width: `${c.width}px` }" />
    <template v-for="step in steps" :key="step.no">
      <div :class="[$style.stepCircle, step.done ? $style.stepCircleOn : $style.stepCircleOff]"
           :style="{ left: `${step.circleLeft}px` }" />
      <b :class="$style.stepNo" :style="{ left: `${step.noLeft}px` }">{{ step.no }}</b>
      <b :class="[$style.stepLabel, !step.done && $style.stepLabelOff]"
         :style="{ left: `${step.labelLeft}px` }">{{ step.label }}</b>
    </template>

    <!-- 드롭존 -->
    <input ref="fileInput" type="file" multiple :accept="ACCEPT" :class="$style.fileInput" @change="onFileChange" />
    <div :class="[$style.dropzone, isDragging && $style.dropzoneActive]"
         @dragover.prevent="isDragging = true"
         @dragenter.prevent="isDragging = true"
         @dragleave.prevent="isDragging = false"
         @drop.prevent="onDrop" />
    <img :class="$style.groupIcon" :src="uploadIcon" alt="" />
    <b :class="$style.b12">파일을 여기로 끌어다 놓으세요.</b>
    <div :class="$style.div4">또는 아래 버튼으로 파일을 선택할 수 있어요.<br/>여러 개를 한 번에 올려도 됩니다.</div>
    <div :class="[$style.rectangleParent, 'btn']" role="button" @click="pickFile">
      <div :class="[$style.groupChild, 'btn-fill']" />
      <b :class="$style.b13">파일 선택</b>
    </div>
    <div :class="$style.formatNote">
      <span>지원 형식: .xlsx · .xls · .csv</span>
      <span>|</span>
      <span>파일당 최대 50MB</span>
    </div>

    <!-- 올린 파일 -->
    <b ref="listHeading" :class="$style.b2">올린 파일</b>
    <template v-if="!files.length">
      <div :class="$style.emptyBox" />
      <div :class="$style.div5">아직 올린 파일이 없어요. 파일을 올리면 여기에 상태가 표시됩니다.</div>
    </template>
    <template v-else>
      <div v-for="(file, i) in files" :key="file.key"
           :class="$style.fileCard" :style="{ top: `${cardTop(i)}px` }">
        <b :class="$style.fileName" :title="file.name">{{ file.name }}</b>
        <div :class="[$style.fileMeta, file.state === 'failed' && $style.fileMetaError]"
             :title="detailOf(file)">
          <span :class="$style.fileMetaSize">{{ formatSize(file.size) }}</span>
          <b> · {{ detailOf(file) }}</b>
        </div>
        <div :class="$style.barTrack" />
        <!-- 매핑·적재는 끝나는 시점을 알 수 없어서 진행률 대신 왕복하는 막대로 보여준다. -->
        <div v-if="file.state === 'mapping' || file.state === 'ingesting'"
             :class="[$style.barFill, $style.barBusy]" />
        <div v-else :class="[$style.barFill, $style[`barTone_${statusOf(file).tone}`]]"
             :style="{ width: `${TRACK_WIDTH * barRatio(file)}px` }" />
        <div :class="[$style.statusPill, $style[`statusPill_${statusOf(file).tone}`]]" />
        <div :class="[$style.statusDot, $style[`statusDot_${statusOf(file).tone}`]]" />
        <div :class="[$style.statusLabel, $style[`statusLabel_${statusOf(file).tone}`]]">
          {{ statusOf(file).label }}
        </div>
      </div>
      <div :class="[$style.confirmButton, canConfirm ? 'btn' : $style.confirmDisabled]" role="button"
           :style="{ top: `${confirmTop}px` }" @click="goToMapping">
        <div :class="[$style.confirmButtonBg, canConfirm && 'btn-fill']" />
        <b :class="$style.confirmButtonLabel">용어 확인하기</b>
      </div>
    </template>
    <div v-for="(msg, i) in errors" :key="msg" :class="$style.uploadError"
         :style="{ top: `${footerTop - 150 + i * 44}px` }">{{ msg }}</div>

    <div :class="$style.item" :style="{ top: `${footerTop}px` }" />
    <div :class="[$style.div7, 'link']" @click="router.push('/data')">←</div>
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
  position: relative;
  background-color: #f8f9fc;
  text-align: left;
  font-size: var(--font-body-03);
  color: #00559e;
  font-family: Pretendard;
  transform-origin: top left;
}
.b {
  position: absolute;
  top: 85px;
  left: calc(50% - 676px);
  font-size: var(--font-body-02);
  text-decoration: underline;
  text-align: center;
}
.div2 {
  position: absolute;
  top: 85px;
  left: calc(50% - 528px);
  font-size: var(--font-body-02);
  font-weight: 500;
  text-align: center;
}
.div3 {
  position: absolute;
  top: 85px;
  left: calc(50% - 386px);
  font-size: var(--font-body-02);
  font-weight: 500;
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
  line-height: 45px;
  color: #6b7280;
}
.div7 {
  position: absolute;
  top: 228px;
  left: 50px;
  font-size: var(--font-title-02);
  font-weight: 600;
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
.stepCircle {
  position: absolute;
  top: 574px;
  border-radius: 50%;
  width: 40px;
  height: 40px;
}
.stepCircleOn {
  background-color: #00559e;
}
.stepCircleOff {
  background-color: #d1d5db;
}
.stepNo {
  position: absolute;
  font-size: var(--font-body-02);
  top: 571px;
  line-height: 45px;
  color: #fff;
}
.stepLabel {
  position: absolute;
  font-size: var(--font-body-02);
  top: 571px;
  line-height: 45px;
}
.stepLabelOff {
  color: #d1d5db;
}
/* ── 드롭존 ─────────────────────────────────── */
.fileInput {
  display: none;
}
.dropzone {
  position: absolute;
  top: 694px;
  left: 50px;
  border-radius: 40px;
  background-color: #f3f4f6;
  border: 2px dashed #6b7280;
  box-sizing: border-box;
  width: 1820px;
  height: 700px;
}
/* 파일을 끌고 들어왔을 때 */
.dropzoneActive {
  background-color: #e5f0ff;
  border-color: #0053e3;
}
.groupIcon {
  position: absolute;
  top: 769px;
  left: 921px;
  width: 77px;
  height: 77px;
  pointer-events: none;
}
/* 원본은 calc(50% - 텍스트폭/2) 로 중앙을 맞춰서 글자 크기가 바뀌면
   오른쪽으로 밀렸다. 실제 중앙 정렬로 바꿔 크기와 무관하게 고정한다. */
.b12 {
  position: absolute;
  top: 906px;
  left: 0px;
  width: 100%;
  text-align: center;
  font-size: var(--font-body-01);
  line-height: 48px;
  pointer-events: none;
}
.div4 {
  position: absolute;
  top: 1000px;
  left: 0px;
  width: 100%;
  line-height: 45px;
  font-weight: 500;
  color: #6b7280;
  text-align: center;
  pointer-events: none;
}
.rectangleParent {
  position: absolute;
  top: 1139px;
  left: calc(50% - 160px);
  width: 320px;
  height: 56px;
  text-align: center;
  font-size: var(--font-body-03);
  color: #fff;
}
.groupChild {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 10px;
  background-color: #00559e;
  width: 320px;
  height: 56px;
}
.b13 {
  position: absolute;
  top: 0px;
  left: 27px;
  line-height: 56px;
  display: inline-block;
  width: 266px;
  height: 45px;
}
/* ── 올린 파일 ──────────────────────────────── */
/* 지원 형식 안내 — 원본은 "지원 형식…" · "|" · "파일당 최대…" 세 조각을 각각
   하드코딩된 오프셋으로 놓아서, 글자 크기가 바뀌면 간격과 중앙이 동시에
   틀어졌다. 한 줄로 묶어 flex 로 가운데 정렬한다. */
.formatNote {
  position: absolute;
  top: 1274px;
  left: 0px;
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 16px;
  line-height: 45px;
  font-weight: 600;
  color: #6b7280;
  pointer-events: none;
}

.b2 {
  position: absolute;
  top: 1498px;
  left: calc(50% - 866px);
  font-size: var(--font-body-02);
  line-height: 36px;
  color: #455772;
}
.emptyBox {
  position: absolute;
  top: 1616px;
  left: 50px;
  border-radius: 30px;
  background-color: #f3f4f6;
  border: 2px dashed #6b7280;
  box-sizing: border-box;
  width: 1820px;
  height: 151px;
}
.div5 {
  position: absolute;
  top: 1669px;
  left: 0px;
  width: 100%;
  font-size: var(--font-body-03);
  line-height: 45px;
  font-weight: 500;
  color: #6b7280;
  text-align: center;
}
/* 파일 카드 — 안쪽 좌표는 카드 기준 상대값 */
.fileCard {
  position: absolute;
  left: 50px;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
  border-radius: 20px;
  background-color: #fff;
  border: 2px solid #e6e7eb;
  box-sizing: border-box;
  width: 1820px;
  height: 221px;
  text-align: left;
}
.fileName {
  position: absolute;
  top: 47px;
  left: 44px;
  width: 1480px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* 실패했을 때 서버 문구가 그대로 들어가는 줄이다. 폭 제한이 없으면 두 줄이
   되면서 진행 막대(168)를 덮으므로 상태 알약(1557) 앞에서 끊는다. */
.fileMeta {
  position: absolute;
  top: 92px;
  left: 44px;
  width: 1480px;
  font-size: var(--font-body-03);
  line-height: 45px;
  color: #9ca3af;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fileMetaSize {
  font-weight: 500;
}
.fileMetaError {
  color: #d92d20;
}
.barTrack {
  position: absolute;
  top: 168px;
  left: 44px;
  border-radius: 10px;
  background-color: #d9d9d9;
  width: 1388px;
  height: 7px;
}
.barFill {
  position: absolute;
  top: 168px;
  left: 44px;
  border-radius: 10px;
  background-color: #00559e;
  height: 7px;
  transition: width 0.2s ease-out;
}
/* 매핑 중에는 남은 시간을 알 수 없다. 트랙 위를 왕복시켜 "도는 중"만 알린다. */
.barBusy {
  width: 400px;
  animation: barSlide 1.4s ease-in-out infinite alternate;
}
@keyframes barSlide {
  from { transform: translateX(0); }
  to { transform: translateX(988px); }
}
.barTone_warn {
  background-color: #d97706;
}
.barTone_done {
  background-color: #16a34a;
}
.statusPill {
  position: absolute;
  top: 73px;
  left: 1557px;
  border-radius: 20px;
  background-color: #e5e7eb;
  width: 210px;
  height: 75px;
}
.statusPill_warn {
  background-color: #fef3c7;
}
.statusPill_done {
  background-color: #dcfce7;
}
.statusPill_error {
  background-color: #fee2e2;
}
.statusDot {
  position: absolute;
  top: 104px;
  left: 1607px;
  border-radius: 50%;
  background-color: #6b7280;
  width: 14px;
  height: 14px;
}
.statusDot_warn {
  background-color: #d97706;
}
.statusDot_done {
  background-color: #16a34a;
}
.statusDot_error {
  background-color: #d92d20;
}
.statusLabel {
  position: absolute;
  top: 93px;
  left: 1632px;
  font-size: var(--font-body-03);
  line-height: 36px;
  font-weight: 600;
  color: #6b7280;
}
.statusLabel_warn {
  color: #d97706;
}
.statusLabel_done {
  color: #16a34a;
}
.statusLabel_error {
  color: #d92d20;
}
.confirmButton {
  position: absolute;
  left: 1520px;
  width: 350px;
  height: 56px;
  font-size: var(--font-body-03);
  color: #fff;
}
.confirmButtonBg {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 10px;
  background-color: #0053e3;
  width: 350px;
  height: 56px;
}
/* 매핑이 끝난 파일이 하나도 없으면 다음 단계로 갈 게 없다. */
.confirmDisabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.confirmButtonLabel {
  position: absolute;
  top: 0px;
  left: 64px;
  display: inline-block;
  width: 222px;
  height: 56px;
  line-height: 56px;
  text-align: center;
}
.uploadError {
  position: absolute;
  left: 50px;
  font-size: var(--font-body-03);
  line-height: 44px;
  font-weight: 600;
  color: #d92d20;
}
.item {
  position: absolute;
  left: -100px;
  background-color: #f3f3f3;
  width: 2120px;
  height: 244px;
}
</style>
