<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import logo from '../assets/logo.png'
import uploadIcon from '../assets/upload-large.svg'
import { useDesignScale } from '../composables/useDesignScale'

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

type UploadedFile = { name: string; size: number; progress: number }

const fileInput = ref<HTMLInputElement | null>(null)
const files = ref<UploadedFile[]>([])
const errors = ref<string[]>([])
const isDragging = ref(false)

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

function addFiles(list: FileList | null) {
  if (!list) return
  const nextErrors: string[] = []

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
    if (files.value.some((f) => f.name === file.name && f.size === file.size)) continue
    // 매핑 진행률 — 서버 연동 전이라 디자인의 진행 상태(1148/1388)를 그대로 쓴다.
    files.value.push({ name: file.name, size: file.size, progress: 1148 / TRACK_WIDTH })
  }
  errors.value = nextErrors
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
    <div :class="[$style.caAaca4862A5402b585a54a82eParent, 'link']" @click="router.push('/')">
      <img :class="$style.caAaca4862A5402b585a54a82eIcon" :src="logo" alt="로고" />
      <b :class="$style.b3">물</b>
      <b :class="$style.b4">볼래</b>
      <b :class="$style.b5">ㅓ</b>
    </div>
    <div :class="$style.profile" />
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
    <b :class="$style.b2">올린 파일</b>
    <template v-if="!files.length">
      <div :class="$style.emptyBox" />
      <div :class="$style.div5">아직 올린 파일이 없어요. 파일을 올리면 여기에 상태가 표시됩니다.</div>
    </template>
    <template v-else>
      <div v-for="(file, i) in files" :key="file.name + file.size"
           :class="$style.fileCard" :style="{ top: `${cardTop(i)}px` }">
        <b :class="$style.fileName">{{ file.name }}</b>
        <div :class="$style.fileMeta">
          <span :class="$style.fileMetaSize">{{ formatSize(file.size) }}</span>
          <b> · 용어 매핑 중</b>
        </div>
        <div :class="$style.barTrack" />
        <div :class="$style.barFill" :style="{ width: `${TRACK_WIDTH * file.progress}px` }" />
        <div :class="$style.statusPill" />
        <div :class="$style.statusDot" />
        <div :class="$style.statusLabel">매핑 중</div>
      </div>
      <div :class="[$style.confirmButton, 'btn']" role="button"
           :style="{ top: `${confirmTop}px` }" @click="router.push('/mapping')">
        <div :class="[$style.confirmButtonBg, 'btn-fill']" />
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
.caAaca4862A5402b585a54a82eParent {
  position: absolute;
  top: 82px;
  left: 50px;
  width: 144px;
  height: 35px;
  text-align: center;
  font-size: var(--font-body-01);
  color: #0053e3;
  font-family: 'Ria Sans';
}
.caAaca4862A5402b585a54a82eIcon {
  position: absolute;
  top: 3px;
  left: 32px;
  width: 23px;
  height: 29px;
  object-fit: cover;
}
.b3 {
  position: absolute;
  top: 0px;
  left: 0px;
  line-height: 35px;
}
.b4 {
  position: absolute;
  top: 0px;
  left: 81px;
  line-height: 35px;
}
.b5 {
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
  background-color: #d9d9d9;
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
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #1f2937;
}
.fileMeta {
  position: absolute;
  top: 92px;
  left: 44px;
  font-size: var(--font-body-03);
  line-height: 45px;
  color: #9ca3af;
}
.fileMetaSize {
  font-weight: 500;
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
.statusDot {
  position: absolute;
  top: 104px;
  left: 1607px;
  border-radius: 50%;
  background-color: #6b7280;
  width: 14px;
  height: 14px;
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
