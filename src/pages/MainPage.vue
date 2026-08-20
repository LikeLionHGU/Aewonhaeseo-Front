<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import wordmark from '../assets/wordmark.svg'
import uploadIcon from '../assets/upload.svg'
import analyzeIcon from '../assets/analyze.svg'
import AccountMenu from '../components/AccountMenu.vue'
import { useDesignScale } from '../composables/useDesignScale'
import {
  ApiError,
  getAnalysisOptions,
  ingestFile,
  listFiles,
  runMapping,
  uploadFile,
} from '../api'

const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1330

const { scale, offsetX } = useDesignScale(DESIGN_WIDTH)
const router = useRouter()

/**
 * 분석하기 카드의 상태.
 *
 *   checking  분석할 데이터가 있는지 서버에 물어보는 중
 *   empty     없음 — 파일을 올리거나 샘플로 체험한다
 *   seeding   샘플 데이터를 넣는 중
 *   ready     있음 — 바로 분석할 수 있다
 *   failed    샘플을 넣다가 막혔다
 */
type CardState = 'checking' | 'empty' | 'seeding' | 'ready' | 'failed'

const state = ref<CardState>('checking')
const note = ref('')
/** 용어 확인이 남아 막혔을 때만 그리로 가는 길을 내준다. */
const needsTerms = ref(false)

/**
 * 분석할 데이터가 있는지 확인한다.
 *
 * listFiles 로 판단하면 안 된다. 올렸지만 적재(ingest)하지 않은 파일은 분석에서
 * 보이지 않아서, 파일이 있는데도 결과가 빈 화면으로 나온다. /analyses/options 의
 * items 는 측정값 테이블에서 나오므로 "분석이 실제로 볼 수 있는 것" 과 같다.
 */
async function hasAnalyzableData() {
  const options = await getAnalysisOptions()
  return (options.items ?? []).length > 0
}

async function check() {
  state.value = 'checking'
  note.value = ''
  needsTerms.value = false
  try {
    state.value = (await hasAnalyzableData()) ? 'ready' : 'empty'
  } catch (error) {
    // 확인에 실패한 것을 "데이터 없음" 으로 단정하면, 데이터가 있는 사람에게
    // 샘플을 올리라고 권하게 된다. 잠그지 않고 열어 둔 뒤 다음 화면이 판단한다.
    state.value = 'ready'
    note.value = describe(error, '데이터를 확인하지 못했어요. 분석 화면에서 다시 시도해 주세요')
  }
}

function describe(error: unknown, fallback: string) {
  return error instanceof ApiError &&
    error.code !== 'HTTP_ERROR' &&
    error.code !== 'NETWORK_ERROR'
    ? error.message
    : fallback
}

// --- 샘플 데이터 ---

/**
 * 서버에 올라가는 이름. 목록에서 바로 알아볼 수 있어야 하고, 이 이름으로 이미
 * 올라와 있는지 찾아 같은 파일을 두 번 올리지 않는다 — 삭제 API 가 없어서
 * 누를 때마다 쌓이면 지울 방법이 없다.
 *
 * 이 이름은 바꾸지 말 것(2026-08-20 실제 서버 확인). 적재는 파일 단위로만
 * 멱등해서, 이름이 달라지면 새 파일로 올라가고 예전 파일의 측정값이 그대로 남는다.
 * 같은 달에 값이 두 개가 되어 평균이 흐려지고 초과 판정까지 달라진다.
 *
 * 그래서 샘플 CSV 내용을 고쳐도 이미 체험해 본 계정은 예전 데이터를 계속 본다.
 * 그게 값이 섞이는 것보다는 낫다고 보고 이름을 고정했다.
 */
const SAMPLE_FILENAME = '샘플-수질측정자료.csv'

/** public/sample 에 들어 있는 CSV. 하위 경로 배포에서도 맞도록 BASE_URL 을 쓴다. */
const SAMPLE_URL = `${import.meta.env.BASE_URL}sample/water-quality-sample.csv`

async function fetchSampleFile() {
  const res = await fetch(SAMPLE_URL)
  if (!res.ok) throw new ApiError(res.status, 'SAMPLE_MISSING', '샘플 파일을 찾지 못했어요')
  return new File([await res.blob()], SAMPLE_FILENAME, { type: 'text/csv' })
}

/**
 * 이미 올라와 있는 샘플 파일. 있으면 다시 올리지 않고 그 파일로 이어서 한다.
 *
 * 같은 이름이 여러 벌 있을 수 있다 — 샘플 CSV 내용이 바뀐 뒤 예전 것을 이미
 * 올려 둔 계정이 그렇다. 먼저 찾은 것을 쓰면 목록 순서에 따라 옛 데이터로
 * 되돌아가므로 가장 최근에 올린 것을 고른다.
 */
async function findUploadedSample() {
  const page = await listFiles({ size: 50 })
  return (
    page.items
      .filter((item) => item.filename === SAMPLE_FILENAME)
      // 값이 빠져 오면 localeCompare 가 터져 체험이 통째로 막힌다. 빈 문자열로 받는다.
      .sort((a, b) => (b.uploaded_at ?? '').localeCompare(a.uploaded_at ?? ''))[0] ?? null
  )
}

async function connectSampleData() {
  if (state.value === 'seeding') return
  state.value = 'seeding'
  needsTerms.value = false
  note.value = '올라와 있는 샘플이 있는지 확인하는 중…'
  try {
    let fileId = (await findUploadedSample())?.id
    if (fileId === undefined) {
      note.value = '샘플 파일 올리는 중…'
      fileId = (await uploadFile(await fetchSampleFile())).id
    }

    note.value = '용어 매핑 중…'
    await runMapping(fileId)

    // 확인이 필요한 컬럼이 남아도 적재는 해 본다. 붙은 컬럼만 들어가므로,
    // 애매한 항목 하나 때문에 체험이 통째로 막히는 것보다 낫다.
    note.value = '측정값 넣는 중…'
    const ingested = await ingestFile(fileId)

    // 적재했다고 분석이 볼 수 있다는 뜻은 아니다. 측정일이 안 붙으면 값이
    // 들어가도 집계에서 빠진다. 실제로 보이는지 다시 물어본다.
    if (!(await hasAnalyzableData())) {
      state.value = 'failed'
      needsTerms.value = true
      note.value = '샘플을 넣었지만 분석이 아직 볼 수 없어요'
      return
    }
    state.value = 'ready'
    note.value = `샘플 측정값 ${ingested.inserted_values}건을 넣었어요. 바로 분석할 수 있어요`
  } catch (error) {
    state.value = 'failed'
    note.value = describe(error, '샘플 데이터를 넣지 못했어요. 잠시 후 다시 시도해 주세요')
  }
}

// --- 화면 ---

/** 실패해도 원래 두 버튼으로 돌아가 다시 시도할 수 있게 한다. */
const showChoice = computed(() => state.value === 'empty' || state.value === 'failed')
const busyLabel = computed(() =>
  state.value === 'checking' ? '데이터 확인 중…' : '샘플 데이터 준비 중…',
)

onMounted(check)
</script>

<template>
  <div :class="$style.viewport" :style="{ height: `${DESIGN_HEIGHT * scale}px` }">
  <div :class="$style.div" :style="{ transform: `translateX(${offsetX}px) scale(${scale})` }">
    <b :class="$style.b">무엇부터 시작할까요?</b>
    <b :class="$style.b2">데이터를 먼저 연결하거나, 이미 연결된 데이터로 바로 분석을 시작할 수 있어요.</b>
    <div :class="$style.child" />
    <div :class="$style.item" />
    <div :class="$style.inner" />
    <img :class="$style.groupIcon" :src="uploadIcon" alt="" />
    <b :class="$style.b3">데이터 올리기</b>
    <b :class="$style.b4">분석하기</b>
    <div :class="$style.csv">엑셀·CSV 파일을 업로드하면 <br/>데이터를 자동으로 정리하고 용어를 표준화합니다.</div>
    <div :class="$style.bod">“작년 인천 지점 BOD 월별 추이 보여줘"<br/>궁금한 내용을 입력하면, 근거와 함께 분석 결과를 확인할 수 있어요.</div>
    <img :class="$style.child2" :src="analyzeIcon" alt="" />
    <img :class="[$style.wordmark, 'link']" :src="wordmark" alt="물어볼래" @click="router.push('/')" />
    <AccountMenu />
    <div :class="[$style.rectangleParent, 'btn']" role="button" @click="router.push('/upload')">
      <div :class="[$style.groupChild, 'btn-fill']" />
      <div :class="$style.csv2">엑셀·CSV 업로드</div>
    </div>
    <!-- 분석하기 카드의 버튼. 원본은 hasData 를 손으로 켜고 껐지만 이제 서버에
         분석할 데이터가 있는지 물어본 결과로 갈린다. -->
    <template v-if="showChoice">
      <div :class="[$style.rectangleGroup, 'btn']" role="button" @click="connectSampleData">
        <div :class="[$style.groupItem, 'btn-outline']" />
        <div :class="$style.div2">{{ state === 'failed' ? '샘플 다시 시도' : '샘플 데이터로 체험' }}</div>
      </div>
      <div :class="$style.rectangleContainer">
        <div :class="$style.groupInner" />
        <div :class="$style.div3">데이터 연결 후 가능</div>
      </div>
    </template>
    <div v-else-if="state === 'ready'" :class="[$style.rectangleGroupActive, 'btn']" role="button"
         @click="router.push('/ask')">
      <div :class="[$style.groupChild, 'btn-fill']" />
      <div :class="$style.div2Active">분석 시작하기</div>
    </div>
    <!-- 확인 중·준비 중. 누를 수 없으니 .btn 을 붙이지 않는다. -->
    <div v-else :class="$style.rectangleGroupActive">
      <div :class="$style.groupInner" />
      <div :class="[$style.div2Active, $style.busyLabel]">{{ busyLabel }}</div>
    </div>
    <!-- 진행·결과 한 줄. 버튼(750~791)과 카드 바닥(884) 사이 여백에 놓는다. -->
    <div v-if="note" :class="[$style.cardNote, state === 'failed' && $style.cardNoteError]">
      <span :class="$style.cardNoteText">{{ note }}</span>
      <span v-if="needsTerms" :class="[$style.cardNoteLink, 'link']"
            @click="router.push('/terms')">용어 확인하러 가기 →</span>
    </div>
    <div :class="[$style.div4, 'link']" @click="router.push('/data')">내 데이터</div>
    <div :class="[$style.div5, 'link']" @click="router.push('/ask')">분석하기</div>
    <div :class="$style.div6">문의하기</div>
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
  height: 1330px;
  position: relative;
  background-color: #f8f9fc;
  text-align: center;
  font-size: var(--font-body-03);
  color: #6b7280;
  font-family: Pretendard;
  transform-origin: top left;
}
/* 원본은 calc(50% - 텍스트폭/2) 로 중앙을 맞춰서 글자 크기가 바뀌면 밀렸다.
   left/right 0 + fit-content + auto 여백으로 블록만 가운데 놓는다. text-align 을
   건드리지 않으므로 여러 줄 텍스트의 줄 내부 정렬은 원본 그대로 유지된다. */
.b {
  position: absolute;
  top: 304px;
  left: 0px;
  right: 0px;
  width: fit-content;
  margin-inline: auto;
  font-size: var(--font-title-02);
  background: linear-gradient(-86.07deg, #3482ff, #42a8ff 65.38%, #0053e3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
/* 원본은 calc(50% - 텍스트폭/2) 로 중앙을 맞춰서 글자 크기가 바뀌면
   오른쪽으로 밀렸다. 실제 중앙 정렬로 바꿔 크기와 무관하게 고정한다. */
.b2 {
  position: absolute;
  top: 364px;
  left: 0px;
  width: 100%;
  text-align: center;
  font-size: var(--font-body-02);
  line-height: 45px;
}
.child {
  position: absolute;
  top: 453px;
  left: 360px;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
  border-radius: 20px;
  background-color: #fff;
  border: 2px solid #e6e7eb;
  box-sizing: border-box;
  width: 584px;
  height: 431px;
}
.item {
  position: absolute;
  top: 453px;
  left: 977px;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
  border-radius: 20px;
  background-color: #fff;
  border: 2px solid #e6e7eb;
  box-sizing: border-box;
  width: 584px;
  height: 431px;
}
.inner {
  position: absolute;
  top: 1086px;
  left: -100px;
  background-color: #f3f3f3;
  width: 2120px;
  height: 244px;
}
.groupIcon {
  position: absolute;
  top: 531px;
  left: 630px;
  width: 45px;
  height: 45px;
}
.b3 {
  position: absolute;
  top: 589px;
  left: calc(50% - 389px);
  font-size: var(--font-body-01);
  color: #0053e3;
}
.b4 {
  position: absolute;
  top: 589px;
  left: calc(50% + 257px);
  font-size: var(--font-body-01);
  color: #0053e3;
}
.csv {
  position: absolute;
  top: 651px;
  left: calc(50% - 502px);
  line-height: 35px;
}
.bod {
  position: absolute;
  top: 651px;
  left: calc(50% + 48px);
  line-height: 35px;
}
.child2 {
  position: absolute;
  top: 531px;
  left: 1247px;
  width: 45px;
  height: 45px;
}
.rectangleParent {
  position: absolute;
  top: 750px;
  left: 544px;
  width: 217px;
  height: 41px;
  color: #fff;
}
.groupChild {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 10px;
  background-color: #0053e3;
  width: 217px;
  height: 41px;
}
.csv2 {
  position: absolute;
  top: 9px;
  left: 39px;
  font-weight: 600;
}
.rectangleGroup {
  position: absolute;
  top: 750px;
  left: 1274px;
  width: 217px;
  height: 41px;
  color: #0053e3;
}
.groupItem {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 10px;
  background-color: rgba(0, 83, 227, 0.08);
  border: 1px solid #0053e3;
  box-sizing: border-box;
  width: 217px;
  height: 41px;
}
.div2 {
  position: absolute;
  top: 9px;
  left: 34px;
  font-weight: 600;
  display: inline-block;
  width: 148px;
  height: 24px;
}
.rectangleContainer {
  position: absolute;
  top: 750px;
  left: 1047px;
  width: 217px;
  height: 41px;
}
.groupInner {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 10px;
  background-color: #e5e7eb;
  width: 217px;
  height: 41px;
}
.div3 {
  position: absolute;
  top: 9px;
  left: 25px;
  font-weight: 600;
  display: inline-block;
  width: 166px;
  height: 24px;
}
.rectangleGroupActive {
  position: absolute;
  top: 750px;
  left: 1161px;
  width: 217px;
  height: 41px;
  color: #fff;
}
.div2Active {
  position: absolute;
  top: 9px;
  left: 54px;
  font-weight: 600;
}
/* '분석 시작하기'(5자)보다 긴 문구가 들어와서 left 54px 고정을 쓸 수 없다.
   상자 폭을 다 쓰고 가운데 맞춘다. */
.busyLabel {
  left: 0;
  width: 217px;
  color: #6b7280;
}
/* 진행·결과 안내. 카드(977~1561) 안쪽 폭을 다 쓰고, 루트가 text-align: center
   라 따로 정렬하지 않아도 가운데로 놓인다. */
.cardNote {
  position: absolute;
  top: 798px;
  left: 977px;
  width: 584px;
  box-sizing: border-box;
  padding: 0 40px;
  line-height: 28px;
  font-weight: 500;
  color: #6b7280;
  /* 기본 줄바꿈은 글자 단위라 '…마쳐주세 / 요' 처럼 한 글자가 넘어간다. */
  word-break: keep-all;
}
/* 서버가 준 실패 문구는 길이를 알 수 없다. 두 줄에서 끊어 카드 밑변(884)을
   넘지 않게 한다 — 링크가 붙는 경우는 문구가 한 줄짜리라 셋이 다 들어간다. */
.cardNoteText {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cardNoteError {
  color: #d92d20;
}
.cardNoteLink {
  display: block;
  font-weight: 600;
  color: #0053e3;
}
.div4 {
  position: absolute;
  top: 85px;
  left: calc(50% - 676px);
  font-size: var(--font-body-02);
  font-weight: 500;
  color: #00559e;
}
.div5 {
  position: absolute;
  top: 85px;
  left: calc(50% - 528px);
  font-size: var(--font-body-02);
  font-weight: 500;
  color: #00559e;
}
.div6 {
  position: absolute;
  top: 85px;
  left: calc(50% - 386px);
  font-size: var(--font-body-02);
  font-weight: 500;
  color: #00559e;
  text-align: left;
}
</style>
