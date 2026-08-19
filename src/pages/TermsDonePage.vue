<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import wordmark from '../assets/wordmark.svg'
import AccountMenu from '../components/AccountMenu.vue'
import { useDesignScale } from '../composables/useDesignScale'
import { ApiError, getFile, getMappingRounds, listFiles, listReviews } from '../api'
import type { FileItem, MappingRounds, ReviewItem } from '../api'

const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1292

const { scale, offsetX } = useDesignScale(DESIGN_WIDTH)
const router = useRouter()
const route = useRoute()

const loading = ref(true)
const loadError = ref('')
const file = ref<FileItem | null>(null)
const rounds = ref<MappingRounds | null>(null)
const reviews = ref<ReviewItem[]>([])

const fileId = computed(() => file.value?.id ?? null)

/**
 * 판정이 끝난 컬럼 수.
 *
 * 매핑 재실행 때문에 같은 컬럼에 검수 행이 여러 개 생길 수 있어서 이름으로 센다.
 * 용어 확인 화면도 같은 기준으로 묶어 보여주므로 숫자가 어긋나지 않는다.
 */
const decidedNames = computed(
  () => new Set(reviews.value.filter((r) => r.verdict).map((r) => r.raw)),
)

/**
 * 확인 내용이 표준 사전 자체에 등록됐는지.
 *
 * 판정은 이 파일의 매핑에는 바로 반영되지만(재매핑하면 via: review 로 붙는다)
 * 사전에는 등록되지 않아 이 값은 false 로 온다. 같은 컬럼명이 다른 파일에
 * 나오면 다시 확인해야 한다(2026-08-17 확인).
 */
const appliedToDictionary = computed(() => {
  const decided = reviews.value.filter((r) => r.verdict)
  return decided.length > 0 && decided.every((r) => r.applied_to_dictionary)
})

const headline = computed(() => {
  if (loading.value) return '확인 결과를 불러오는 중이에요'
  if (loadError.value) return '확인 결과를 볼 수 없어요'
  const count = decidedNames.value.size
  return count > 0 ? `${count}건 모두 확인했어요` : '확인할 항목이 없었어요'
})

/** 두 줄로 나눠 보여줄 설명. */
const detail = computed<string[]>(() => {
  if (loading.value) return []
  if (loadError.value) return [loadError.value]
  if (decidedNames.value.size === 0) {
    return ['이 파일은 모든 컬럼이 자동으로 매핑됐어요.', '바로 분석을 시작할 수 있습니다.']
  }
  if (appliedToDictionary.value) {
    return ['확인해 주신 내용은 표준 사전에 반영됐어요.', '다음에 같은 용어가 나오면 자동으로 매핑됩니다.']
  }
  return [
    '확인해 주신 내용을 이 파일 매핑에 반영했어요.',
    '다만 표준 사전에는 등록되지 않아, 다른 파일에서 같은 컬럼이 나오면 한 번 더 확인해야 해요.',
  ]
})

/** 파일명 · 현재 자동 매핑률. 매핑을 두 번 이상 돌렸을 때만 증감을 덧붙인다. */
const statLine = computed(() => {
  if (loading.value || loadError.value || !rounds.value?.rounds.length) return ''
  const list = rounds.value.rounds
  const latest = list[list.length - 1]
  // 서버가 값을 빼먹으면 Math.round(undefined) 가 NaN 이 되어 화면에 그대로 찍힌다.
  const rate = Number.isFinite(latest.auto_mapped_rate)
    ? `${Math.round(latest.auto_mapped_rate)}%`
    : '-'
  const parts = [file.value?.filename ?? '파일', `자동 매핑 ${rate}`]
  const delta = rounds.value.delta
  if (list.length > 1 && Number.isFinite(delta)) {
    const sign = delta > 0 ? '+' : ''
    parts.push(`${list.length}회차 · 지난 회차 대비 ${sign}${delta}%p`)
  }
  return parts.join(' · ')
})

/** 매핑이 끝난 가장 최근 파일. 갓 올려 아직 안 돌린 파일로 가면 빈 화면만 보인다. */
function latestMappedFile(items: FileItem[]) {
  return items.find((f) => f.auto_mapped_rate !== undefined)?.id ?? items[0]?.id ?? null
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const fromQuery = Number(route.query.fileId)
    const id =
      Number.isInteger(fromQuery) && fromQuery > 0
        ? fromQuery
        : latestMappedFile((await listFiles({ size: 20 })).items)
    if (id === null) {
      loadError.value = '아직 올린 파일이 없어요.'
      return
    }
    const [loaded, roundInfo, reviewPage] = await Promise.all([
      getFile(id),
      getMappingRounds(id),
      listReviews({ file_id: id, status: 'all', size: 200 }),
    ])
    file.value = loaded
    rounds.value = roundInfo
    reviews.value = reviewPage.items
  } catch (error) {
    loadError.value =
      error instanceof ApiError && error.code !== 'HTTP_ERROR' && error.code !== 'NETWORK_ERROR'
        ? error.message
        : '확인 결과를 불러오지 못했어요. 잠시 후 다시 시도해 주세요'
  } finally {
    loading.value = false
  }
}

function backToTerms() {
  router.push({ name: 'terms', query: fileId.value ? { fileId: String(fileId.value) } : {} })
}

onMounted(load)
</script>

<template>
  <div :class="$style.viewport" :style="{ height: `${DESIGN_HEIGHT * scale}px` }">
  <div :class="$style.div" :style="{ transform: `translateX(${offsetX}px) scale(${scale})` }">
    <b :class="[$style.b, 'link']" @click="router.push('/data')">내 데이터</b>
    <div :class="[$style.div2, 'link']" @click="router.push('/ask')">분석하기</div>
    <div :class="$style.div3">문의하기</div>
    <img :class="[$style.wordmark, 'link']" :src="wordmark" alt="물어볼래" @click="router.push('/')" />
    <AccountMenu />

    <!-- 완료 표시 — 원본은 빈 img 였다 -->
    <svg :class="$style.item" viewBox="0 0 144 144" role="img" aria-label="확인 완료">
      <circle cx="72" cy="72" r="72" :fill="loadError ? '#D92D20' : '#0053E3'" />
      <path v-if="loadError" d="M52 52 L92 92 M92 52 L52 92" fill="none" stroke="#fff" stroke-width="11"
            stroke-linecap="round" stroke-linejoin="round" />
      <path v-else d="M42 74 L64 96 L104 50" fill="none" stroke="#fff" stroke-width="11"
            stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <b :class="[$style.b2, loadError && $style.b2Error]">{{ headline }}</b>
    <b :class="$style.b8">
      <template v-for="(line, i) in detail" :key="i"><br v-if="i" />{{ line }}</template>
    </b>
    <div v-if="statLine" :class="$style.statLine">{{ statLine }}</div>

    <div :class="[$style.rectangleGroup, 'btn']" role="button" @click="router.push('/data')">
      <div :class="[$style.groupItem, 'btn-outline']" />
      <b :class="$style.b7">내 데이터로 돌아가기</b>
    </div>
    <div :class="[$style.rectangleParent, 'btn']" role="button" @click="router.push('/ask')">
      <div :class="[$style.groupChild, 'btn-fill']" />
      <b :class="$style.b6">데이터 분석하러 가기</b>
    </div>

    <div :class="$style.inner" />
    <div :class="[$style.div4, 'link']" @click="backToTerms">←</div>
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
  height: 1292px;
  position: relative;
  background-color: #f8f9fc;
  text-align: center;
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
}
.div2 {
  position: absolute;
  top: 85px;
  left: calc(50% - 528px);
  font-size: var(--font-body-02);
  font-weight: 500;
}
.div3 {
  position: absolute;
  top: 85px;
  left: calc(50% - 386px);
  font-size: var(--font-body-02);
  font-weight: 500;
  text-align: left;
}
.item {
  position: absolute;
  top: 328px;
  left: 888px;
  width: 144px;
  height: 144px;
}
/* 원본은 calc(50% - 텍스트폭/2) 로 중앙을 맞춰서 글자 크기가 바뀌면 밀렸다.
   left/right 0 + fit-content + auto 여백으로 블록만 가운데 놓는다. text-align 을
   건드리지 않으므로 여러 줄 텍스트의 줄 내부 정렬은 원본 그대로 유지된다. */
.b2 {
  position: absolute;
  top: 526px;
  left: 0px;
  right: 0px;
  width: fit-content;
  margin-inline: auto;
  font-size: var(--font-title-01);
  color: #0053e3;
  text-align: left;
}
/* 원본은 calc(50% - 텍스트폭/2) 로 중앙을 맞춰서 글자 크기가 바뀌면
   오른쪽으로 밀렸다. 실제 중앙 정렬로 바꿔 크기와 무관하게 고정한다. */
.b8 {
  position: absolute;
  top: 640px;
  left: 0px;
  width: 100%;
  text-align: center;
  line-height: 45px;
  color: #6b7280;
}
.b2Error {
  color: #d92d20;
}
/* 설명 아래 한 줄 — 파일명과 현재 자동 매핑률. 디자인에는 없던 자리지만
   설명(640)과 버튼(807) 사이가 비어 있어 그 사이에 놓는다. */
.statLine {
  position: absolute;
  top: 730px;
  left: 0px;
  width: 100%;
  text-align: center;
  line-height: 45px;
  font-weight: 500;
  color: #9ca3af;
}
.rectangleGroup {
  position: absolute;
  top: 807px;
  left: 497px;
  width: 455px;
  height: 56px;
  color: #0053e3;
}
.groupItem {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 20px;
  border: 2px solid #0053e3;
  box-sizing: border-box;
  width: 455px;
  height: 56px;
}
/* Figma 는 이 두 라벨을 서로 다른 높이(36px / 26px)로 내보냈다. 줄 상자는 둘 다
   36px 이라 26px 로 내보낸 쪽만 글자가 4.5px 아래로 내려간다. 나란히 놓인 버튼이라
   차이가 바로 보이므로, 버튼 높이만큼 line-height 를 줘서 둘 다 정중앙에 맞춘다. */
.b7 {
  position: absolute;
  top: 0px;
  left: 73.11px;
  display: inline-block;
  width: 321.9px;
  height: 56px;
  line-height: 56px;
}
.rectangleParent {
  position: absolute;
  top: 807px;
  left: 964px;
  width: 455px;
  height: 56px;
  color: #fff;
}
.groupChild {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 20px;
  background-color: #0053e3;
  width: 455px;
  height: 56px;
}
.b6 {
  position: absolute;
  top: 0px;
  left: 83.2px;
  display: inline-block;
  width: 288.6px;
  height: 56px;
  line-height: 56px;
}
.inner {
  position: absolute;
  top: 1048px;
  left: -100px;
  background-color: #f3f3f3;
  width: 2120px;
  height: 244px;
}
.div4 {
  position: absolute;
  top: 228px;
  left: 50px;
  font-size: var(--font-title-02);
  font-weight: 600;
}
</style>
