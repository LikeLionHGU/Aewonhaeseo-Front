<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import wordmark from '../assets/wordmark.svg'
import checkIcon from '../assets/check.svg'
import AccountMenu from '../components/AccountMenu.vue'
import { useDesignScale } from '../composables/useDesignScale'
import {
  ApiError,
  decideReview,
  getFile,
  getFilePreview,
  getMapping,
  ingestFile,
  listFiles,
  listReviews,
  listTerms,
  runMapping,
} from '../api'
import type {
  DictionaryTerm,
  FileItem,
  FilePreview,
  MappingResult,
  ReviewItem,
} from '../api'

const DESIGN_WIDTH = 1920
const BASE_HEIGHT = 2894

const { scale, offsetX } = useDesignScale(DESIGN_WIDTH)
const router = useRouter()
const route = useRoute()

const stepConnectors = [
  { left: 231, width: 643 },
  { left: 1046, width: 666 },
]

// 왼쪽 목록 — 원본은 항목마다 좌표를 박아뒀지만 실제 간격은 130px 로 일정하다.
const LIST_BODY_TOP = 1070
const LIST_ITEM_H = 130
const LIST_LEFT = 100
const LIST_BADGE_LEFT = 410

// 미리보기 표는 네 칸·세 행까지 보여준다. 칸과 행 위치는 디자인 좌표 그대로.
const PREVIEW_LEFTS = [802, 1094, 1316, 1568]
const PREVIEW_ROW_TOPS = [1441, 1554, 1673]
// 값 영역이 시작하는 y 와, 3행일 때 끝나는 y. 행이 적으면 그만큼 줄인다.
const PREVIEW_BODY_TOP = 1396
const PREVIEW_BODY_BOTTOM = 1738

// --- 데이터 ---

const loading = ref(true)
const loadError = ref('')
const submitting = ref(false)
const submitError = ref('')

const file = ref<FileItem | null>(null)
const mapping = ref<MappingResult | null>(null)
const preview = ref<FilePreview | null>(null)
const reviews = ref<ReviewItem[]>([])

const selected = ref(0)

// 다른 용어 직접 고르기
const picking = ref(false)
const termQuery = ref('')
const termResults = ref<DictionaryTerm[]>([])
const termLoading = ref(false)

type BadgeKind = 'low' | 'none' | 'done'

/** 어떤 표준 용어에도 해당하지 않을 때 보내는 판정값. 서버가 정한 예약어다. */
const NO_MATCH = 'no_match'

/**
 * 원본 컬럼 하나가 목록의 한 줄이다.
 *
 * 매핑을 재실행하면 같은 컬럼에 검수 행이 여러 개 생기는 서버 버그가 있어서
 * (2026-08-16 확인) 이름으로 묶는다. 판정을 보낼 때는 묶인 id 전부에 보낸다 —
 * 하나만 처리하면 나머지가 영영 대기 상태로 남는다.
 */
type Entry = {
  raw: string
  ids: number[]
  candidateCode?: string
  candidateName?: string
  score: number
  unmapped: boolean
  verdict?: string
  samples: string[]
  rowCount: number
  distinctCount: number
}

const entries = computed<Entry[]>(() => {
  const byRaw = new Map<string, Entry>()
  for (const review of reviews.value) {
    const found = byRaw.get(review.raw)
    if (found) {
      found.ids.push(review.id)
      // 한 번이라도 판정이 났으면 그 컬럼은 확인된 것으로 본다.
      if (review.verdict) found.verdict = review.verdict
      continue
    }
    byRaw.set(review.raw, {
      raw: review.raw,
      ids: [review.id],
      candidateCode: review.candidate_code,
      candidateName: review.candidate_name,
      score: review.score,
      unmapped: review.mapping_status === 'unmapped',
      verdict: review.verdict,
      samples: review.value_summary?.samples ?? [],
      rowCount: review.value_summary?.row_count ?? 0,
      distinctCount: review.value_summary?.distinct_count ?? 0,
    })
  }
  return [...byRaw.values()]
})

const current = computed<Entry | null>(() => entries.value[selected.value] ?? null)

function badgeOf(entry: Entry): { kind: BadgeKind; label: string } {
  // 판정이 끝난 '매칭 없음' 과 아직 안 본 '매칭 없음' 은 구분해야 한다.
  if (entry.verdict === NO_MATCH) return { kind: 'done', label: '매칭 없음 확인' }
  if (entry.verdict) return { kind: 'done', label: '확인함' }
  if (entry.unmapped) return { kind: 'none', label: '매칭 없음' }
  return { kind: 'low', label: '확신 낮음' }
}

// --- 배치 ---

const itemTop = (i: number) => LIST_BODY_TOP + i * LIST_ITEM_H
const listDividers = computed(() =>
  entries.value.slice(1).map((_, i) => LIST_BODY_TOP + 120 + i * LIST_ITEM_H),
)
const listHeight = computed(() => 99 + Math.max(1, entries.value.length) * LIST_ITEM_H)
const designHeight = computed(() =>
  Math.max(BASE_HEIGHT, 971 + listHeight.value + 300),
)
/* 푸터 띠. 원본은 2650px 에 박혀 있어서, 확인할 컬럼이 열세 개를 넘으면 목록이
   띠를 뚫고 내려가 글자가 회색 띠 위에 겹쳐 찍혔다. 항상 캔버스 바닥에 붙인다. */
const FOOTER_H = 244
const footerTop = computed(() => designHeight.value - FOOTER_H)

// --- 오른쪽 상세 ---

/** 0 → A, 25 → Z, 26 → AA */
function columnLetter(index: number) {
  let n = index
  let out = ''
  do {
    out = String.fromCharCode(65 + (n % 26)) + out
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return out
}

const columnIndex = computed(() =>
  current.value ? (preview.value?.columns.indexOf(current.value.raw) ?? -1) : -1,
)

const detailMeta = computed(() => {
  if (!current.value) return ''
  const parts = [file.value?.filename ?? '파일']
  if (columnIndex.value >= 0) parts.push(`${columnLetter(columnIndex.value)}열`)
  parts.push(`값 ${current.value.rowCount}개`)
  parts.push(`고유값 ${current.value.distinctCount}개`)
  return parts.join(' · ')
})

/**
 * 미리보기에 보여줄 네 칸. 확인 중인 컬럼이 세 번째 칸에 오도록 창을 민다.
 * 컬럼이 네 개 미만이면 있는 만큼만.
 */
const previewWindow = computed(() => {
  const columns = preview.value?.columns ?? []
  if (!columns.length) return { headers: [] as string[], rows: [] as string[][], targetSlot: -1 }
  const start = Math.max(0, Math.min(Math.max(0, columnIndex.value - 2), Math.max(0, columns.length - 4)))
  const end = Math.min(columns.length, start + 4)
  return {
    headers: columns.slice(start, end),
    rows: (preview.value?.rows ?? []).slice(0, 3).map((row) => row.slice(start, end)),
    targetSlot: columnIndex.value >= 0 ? columnIndex.value - start : -1,
  }
})

/** 실제 행 수. 원본 파일이 1~2행이면 표도 그만큼만 그린다. */
const previewRowCount = computed(() => Math.max(1, previewWindow.value.rows.length))

/** 세로 강조 띠와 표 본문이 끝나는 y. */
const previewBodyBottom = computed(
  () => PREVIEW_ROW_TOPS[previewRowCount.value - 1] + 65,
)
const previewHighlightHeight = computed(() => previewBodyBottom.value - PREVIEW_BODY_TOP)

/** 행과 행 사이에만 선을 긋는다. 빈 슬롯에 선이 남으면 빈 행처럼 보인다. */
const previewDividers = computed(() =>
  PREVIEW_ROW_TOPS.slice(0, previewRowCount.value - 1).map(
    (top, i) => Math.round((top + PREVIEW_ROW_TOPS[i + 1]) / 2) + 12,
  ),
)

/** 3행 기준 배치에서 얼마나 줄었는지. 아래 요소를 그만큼 끌어올린다. */
const previewShift = computed(() => previewBodyBottom.value - PREVIEW_BODY_BOTTOM)

const valueNote = computed(() => {
  if (!current.value) return ''
  const samples = current.value.samples.slice(0, 4)
  const kinds = `값 종류 ${current.value.distinctCount}개`
  return samples.length ? `${kinds} · 예시 ${samples.join(' · ')}` : kinds
})

const suggestionName = computed(() => current.value?.candidateName ?? '추천 용어 없음')
const suggestionNote = computed(() => {
  if (!current.value?.candidateCode) return '사전에서 비슷한 용어를 찾지 못했어요'
  return `표준 사전 · 코드 ${current.value.candidateCode}`
})
const hasSuggestion = computed(() => Boolean(current.value?.candidateCode))

// --- 진행 요약 ---

const remaining = computed(() => entries.value.filter((e) => !e.verdict).length)
const summaryHead = computed(() => {
  const total = mapping.value?.summary.total_columns ?? 0
  const mapped = mapping.value?.summary.auto_mapped ?? 0
  return { total, mapped }
})
const summaryNote = computed(() => {
  const name = file.value?.filename ?? '파일'
  const version = mapping.value?.dictionary_version ?? '-'
  return `${name} · 사전 ${version} 기준`
})

// --- 불러오기 ---

/** 매핑이 끝난 가장 최근 파일. 갓 올려 아직 안 돌린 파일로 가면 빈 화면만 보인다. */
function latestMappedFile(items: FileItem[]) {
  return items.find((f) => f.auto_mapped_rate !== undefined)?.id ?? items[0]?.id ?? null
}

async function resolveFileId() {
  const fromQuery = Number(route.query.fileId)
  if (Number.isInteger(fromQuery) && fromQuery > 0) return fromQuery
  const page = await listFiles({ size: 20 })
  return latestMappedFile(page.items)
}

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
  try {
    const id = await resolveFileId()
    if (id === null) {
      loadError.value = '아직 올린 파일이 없어요. 파일을 먼저 올려주세요.'
      return
    }
    const [loaded, result, reviewPage, filePreview] = await Promise.all([
      getFile(id),
      getMapping(id),
      // 판정이 끝난 항목도 목록에 남겨야 해서 status=all 로 받는다.
      listReviews({ file_id: id, status: 'all', size: 200 }),
      getFilePreview(id),
    ])
    file.value = loaded
    mapping.value = result
    reviews.value = reviewPage.items
    preview.value = filePreview
    // 아직 판정하지 않은 첫 항목부터 시작한다.
    const first = entries.value.findIndex((e) => !e.verdict)
    selected.value = first === -1 ? 0 : first
  } catch (error) {
    loadError.value = describe(error, '확인할 항목을 불러오지 못했어요. 잠시 후 다시 시도해 주세요')
  } finally {
    loading.value = false
  }
}

/**
 * 판정을 보낸다.
 *
 * verdict 는 표준 용어 코드다. 서버가 사전에 있는 코드만 받고, 없는 값은 422 로
 * 거절한다. 로그인이 없어서 reviewed_by 는 비워 둔다 — 서버가 '미상' 으로 채운다.
 */
async function submitVerdict(verdict: string) {
  const entry = current.value
  if (!entry || submitting.value) return
  submitting.value = true
  submitError.value = ''
  try {
    await Promise.all(entry.ids.map((id) => decideReview(id, { verdict })))
    // 서버 상태를 다시 받아오는 대신 손에 든 목록만 갱신한다.
    reviews.value = reviews.value.map((r) =>
      entry.ids.includes(r.id) ? { ...r, verdict } : r,
    )
    picking.value = false
    await goToNext()
  } catch (error) {
    submitError.value = describe(error, '판정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요')
  } finally {
    submitting.value = false
  }
}

/** 처리하지 않은 다음 항목으로. 남은 게 없으면 마무리하고 완료 화면으로 넘어간다. */
async function goToNext() {
  const next = entries.value.findIndex((e) => !e.verdict)
  if (next === -1) {
    await finishFile()
    router.push({ name: 'terms-done', query: file.value ? { fileId: String(file.value.id) } : {} })
    return
  }
  selected.value = next
}

/**
 * 검수를 마친 뒤 매핑을 다시 돌리고 측정값을 적재한다.
 *
 * 판정은 매핑을 다시 돌려야 반영된다(via: review). 그리고 적재를 해야 분석이
 * 볼 수 있다 — 이 두 단계를 빼면 확인을 다 해도 결과 화면이 비어 있다.
 */
async function finishFile() {
  const id = file.value?.id
  if (!id) return
  try {
    await runMapping(id)
    await ingestFile(id)
  } catch (error) {
    // 여기서 실패해도 판정 자체는 저장돼 있다. 완료 화면이 상태를 다시 읽는다.
    submitError.value = describe(error, '매핑을 마무리하지 못했어요. 잠시 후 다시 시도해 주세요')
  }
}

/** 어떤 표준 용어에도 해당하지 않는 컬럼임을 서버에 기록한다. */
function markNoMatch() {
  void submitVerdict(NO_MATCH)
}

/** 사전에서 용어를 찾는다. 검수 대기 컬럼은 대부분 측정항목이라 그쪽을 먼저 보여준다. */
async function searchTerms() {
  termLoading.value = true
  try {
    termResults.value = (await listTerms({ query: termQuery.value.trim() })).items.slice(0, 8)
  } catch {
    termResults.value = []
  } finally {
    termLoading.value = false
  }
}

function openPicker() {
  if (submitting.value) return
  picking.value = !picking.value
  if (picking.value) {
    termQuery.value = current.value?.raw ?? ''
    void searchTerms()
  }
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
    <AccountMenu />
    <b :class="$style.b2">용어 확인</b>
    <b :class="$style.ai">AI가 정확히 판단하기 어려운 항목만 모았어요. <br/>실제 데이터와 용어를 확인하고 맞는 항목을 선택해주세요.</b>

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

    <!-- 진행 요약 -->
    <div :class="$style.summaryCard" />
    <b :class="$style.b18">
      <template v-if="loading">불러오는 중이에요…</template>
      <template v-else-if="loadError">확인할 항목을 볼 수 없어요</template>
      <template v-else>
        <span :class="$style.span">{{ summaryHead.total }}개 중 {{ summaryHead.mapped }}개 매핑 완료, </span>
        <span :class="remaining ? $style.span2 : $style.spanDone">{{ remaining }}개 확인 필요</span>
      </template>
    </b>
    <div :class="$style.v09">{{ loading || loadError ? ' ' : summaryNote }}</div>

    <!-- 왼쪽: 확인 필요 목록 -->
    <div :class="$style.listCard" :style="{ height: `${listHeight}px` }" />
    <div :class="$style.listHeaderBg" />
    <b :class="$style.b24">확인 필요 목록</b>

    <div v-if="loading || loadError || !entries.length" :class="$style.listNotice"
         :style="{ top: `${LIST_BODY_TOP + 20}px` }">
      {{ loading ? '불러오는 중이에요…' : loadError || '확인할 항목이 없어요.' }}
    </div>

    <template v-else>
      <div :class="$style.listSelected"
           :style="{ top: `${itemTop(selected)}px`, height: `${LIST_ITEM_H}px` }" />
      <div v-for="top in listDividers" :key="top" :class="$style.listDivider" :style="{ top: `${top}px` }" />
      <template v-for="(entry, i) in entries" :key="entry.raw">
        <b :class="[$style.listName, 'link']"
           :style="{ top: `${itemTop(i) + 20}px`, left: `${LIST_LEFT}px` }"
           :title="entry.raw" @click="selected = i">{{ entry.raw }}</b>
        <div :class="[$style.listFile, 'link']"
             :style="{ top: `${itemTop(i) + 56}px`, left: `${LIST_LEFT}px` }"
             :title="file?.filename" @click="selected = i">{{ file?.filename }}</div>
        <div :class="$style.badge" :style="{ top: `${itemTop(i) + 33}px`, left: `${LIST_BADGE_LEFT}px` }">
          <div :class="{
            [$style.badgeBgLow]: badgeOf(entry).kind === 'low',
            [$style.badgeBgNone]: badgeOf(entry).kind === 'none',
            [$style.badgeBgDone]: badgeOf(entry).kind === 'done',
          }" />
          <b :class="{
            [$style.badgeLabel]: true,
            [$style.badgeLabelLow]: badgeOf(entry).kind === 'low',
            [$style.badgeLabelNone]: badgeOf(entry).kind === 'none',
            [$style.badgeLabelDone]: badgeOf(entry).kind === 'done',
          }">{{ badgeOf(entry).label }}</b>
        </div>
      </template>
    </template>

    <!-- 오른쪽: 이 컬럼은 무엇인가요? -->
    <div :class="$style.detailCard" :style="{ height: `${1444 + previewShift}px` }" />
    <b :class="$style.b25">이 컬럼은 무엇인가요?</b>

    <template v-if="current">
      <b :class="$style.b3" :title="current.raw">{{ current.raw }}</b>
      <div :class="$style.xlsxC">{{ detailMeta }}</div>

      <!-- 실제 값 미리보기 -->
      <div :class="$style.previewCard" :style="{ height: `${607 + previewShift}px` }" />
      <div :class="$style.previewHeaderBg" />
      <b :class="$style.b13">실제 값 미리보기</b>
      <div :class="$style.previewColHeaderBg" />
      <div v-if="previewWindow.targetSlot >= 0" :class="$style.previewColHighlight"
           :style="{ left: `${PREVIEW_LEFTS[previewWindow.targetSlot] - 52}px`,
                     height: `${previewHighlightHeight}px` }" />
      <b v-for="(header, c) in previewWindow.headers" :key="header" :class="$style.previewHead"
         :style="{ left: `${PREVIEW_LEFTS[c]}px` }" :title="header">{{ header }}</b>
      <div v-for="top in previewDividers" :key="top" :class="$style.previewDivider" :style="{ top: `${top}px` }" />
      <template v-for="(row, r) in previewWindow.rows" :key="r">
        <div v-for="(value, c) in row" :key="c" :class="$style.previewCell"
             :style="{ top: `${PREVIEW_ROW_TOPS[r]}px`, left: `${PREVIEW_LEFTS[c]}px` }"
             :title="value">{{ value }}</div>
      </template>
      <div :class="$style.previewFooterBg" :style="{ top: `${1738 + previewShift}px` }" />
      <b :class="$style.b14" :style="{ top: `${1771 + previewShift}px` }" :title="valueNote">{{ valueNote }}</b>

      <!-- 추천 용어 -->
      <b :class="$style.b26" :style="{ top: `${1908 + previewShift}px` }">추천 용어</b>
      <div :class="$style.suggestCard" :style="{ top: `${1973 + previewShift}px` }" />
      <b :class="$style.b4" :style="{ top: `${2021 + previewShift}px` }"
         :title="suggestionName">{{ suggestionName }}</b>
      <div v-if="hasSuggestion" :class="$style.badge"
           :style="{ top: `${2025 + previewShift}px`, left: '1579px' }">
        <div :class="$style.badgeBgConfidence" />
        <b :class="[$style.badgeLabel, $style.badgeLabelConfidence]">확신도 {{ Math.round(current.score) }}%</b>
      </div>
      <div :class="$style.div16" :style="{ top: `${2089 + previewShift}px` }">{{ suggestionNote }}</div>

      <!-- 액션 — verdict 는 표준 용어 코드를 보낸다 -->
      <div :class="[$style.actionPrimary, hasSuggestion && !submitting ? 'btn' : $style.actionDisabled]"
           role="button" :style="{ top: `${2223 + previewShift}px` }"
           @click="hasSuggestion && submitVerdict(current.candidateCode!)">
        <div :class="[$style.actionPrimaryBg, hasSuggestion && !submitting && 'btn-fill']" />
        <b :class="$style.actionPrimaryLabel">{{ submitting ? '저장하는 중…' : '맞아요' }}</b>
      </div>
      <!-- 원래 '아니에요' 자리. 서버가 no_match 예약어를 받으므로 실제로 기록된다. -->
      <div :class="[$style.actionSecondary, submitting ? $style.actionDisabled : 'btn']" role="button"
           :style="{ top: `${2223 + previewShift}px`, left: '1180px' }" @click="markNoMatch">
        <div :class="[$style.actionSecondaryBg, !submitting && 'btn-outline']" />
        <b :class="$style.actionSecondaryLabel">매칭 없음</b>
      </div>
      <div :class="[$style.actionSecondary, submitting ? $style.actionDisabled : 'btn']" role="button"
           :style="{ top: `${2223 + previewShift}px`, left: '1504.21px' }" @click="openPicker">
        <div :class="[$style.actionSecondaryBg, !submitting && 'btn-outline']" />
        <b :class="$style.actionSecondaryLabel">{{ picking ? '닫기' : '다른 항목 선택' }}</b>
      </div>

      <!-- 용어 직접 고르기 -->
      <div v-if="picking" :class="$style.pickerCard" :style="{ top: `${2295 + previewShift}px` }">
        <input v-model="termQuery" :class="$style.pickerInput" type="search"
               placeholder="표준 용어를 이름이나 코드로 검색하세요"
               aria-label="표준 용어 검색" @input="searchTerms" />
        <div :class="$style.pickerList">
          <div v-if="termLoading" :class="$style.pickerEmpty">찾는 중이에요…</div>
          <div v-else-if="!termResults.length" :class="$style.pickerEmpty">맞는 용어가 없어요.</div>
          <div v-for="term in termResults" :key="term.code"
               :class="[$style.pickerRow, 'btn']" role="button" @click="submitVerdict(term.code)">
            <b :class="$style.pickerName">{{ term.name }}</b>
            <span :class="$style.pickerCode">{{ term.code }} · {{ term.dict_type }}</span>
          </div>
        </div>
      </div>

      <div v-if="submitError" :class="$style.submitError"
           :style="{ top: `${2178 + previewShift}px` }" :title="submitError">{{ submitError }}</div>
    </template>

    <div v-else-if="!loading" :class="$style.detailNotice">
      {{ loadError || '왼쪽 목록에서 확인할 컬럼을 골라주세요.' }}
    </div>

    <div :class="$style.child19" :style="{ top: `${footerTop}px` }" />
    <div :class="[$style.div17, 'link']" @click="router.push('/mapping')">←</div>
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
  height: 2894px;
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
.b2 {
  position: absolute;
  top: 299px;
  left: calc(50% - 866px);
  font-size: var(--font-title-02);
  color: #0053e3;
}
.ai {
  position: absolute;
  top: 364px;
  left: calc(50% - 866px);
  font-size: var(--font-body-03);
  line-height: 45px;
}
.div17 {
  position: absolute;
  top: 228px;
  left: 50px;
  font-size: var(--font-title-02);
  font-weight: 600;
  color: #00559e;
  text-align: center;
}
/* ── 진행 단계 ──────────────────────────────── */
.stepLine {
  position: absolute;
  top: 594px;
  height: 1px;
  background-color: #d1d5db;
}
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
/* ── 진행 요약 ──────────────────────────────── */
.summaryCard {
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
.b18 {
  position: absolute;
  top: 735px;
  left: 103px;
  font-size: var(--font-title-03);
  line-height: 45px;
  color: #000;
}
.span {
  line-height: 45px;
}
.span2 {
  color: #ff0000;
  line-height: 45px;
}
/* 남은 게 0 건이면 빨강으로 경고할 이유가 없다. */
.spanDone {
  color: #11803d;
  line-height: 45px;
}
.v09 {
  position: absolute;
  top: 785px;
  left: 103px;
  width: 1720px;
  font-size: var(--font-body-03);
  line-height: 45px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* ── 확인 필요 목록 ─────────────────────────── */
.listCard {
  position: absolute;
  top: 971px;
  left: 50px;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 560px;
  height: 613px;
}
.listHeaderBg {
  position: absolute;
  top: 971px;
  left: 50px;
  border-radius: 20px 20px 0px 0px;
  background-color: #f7f6f3;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 560px;
  height: 99px;
}
.b24 {
  position: absolute;
  font-size: var(--font-body-02);
  line-height: 36px;
  top: 1006px;
  left: 100px;
}
/* 선택된 항목 배경 */
.listSelected {
  position: absolute;
  left: 52px;
  background-color: #eff5fe;
  width: 556px;
}
/* 원본은 빈 img 였던 구분선 */
.listDivider {
  position: absolute;
  left: 50px;
  width: 560px;
  height: 1px;
  background-color: #d1d5db;
}
/* 목록 자리에 뜨는 한 줄 안내 — 불러오는 중 · 실패 · 빈 목록 */
.listNotice {
  position: absolute;
  left: 100px;
  width: 460px;
  line-height: 36px;
  font-weight: 500;
}
/* 이름과 파일명은 배지(left 410) 앞에서 끊는다. 긴 컬럼명이 배지를 덮지 않게. */
.listName {
  position: absolute;
  font-size: var(--font-body-02);
  line-height: 36px;
  color: #000;
  display: inline-block;
  width: 295px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.listFile {
  position: absolute;
  font-size: var(--font-body-03);
  line-height: 45px;
  font-weight: 500;
  display: inline-block;
  width: 295px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* 상태 배지 */
.badge {
  position: absolute;
  width: 159.2px;
  height: 45px;
  text-align: center;
  font-size: var(--font-body-03);
}
.badgeBgLow {
  position: absolute;
  top: 4px;
  left: 0px;
  border-radius: 10px;
  background-color: #fff4de;
  border: 1px solid #d6e8fa;
  box-sizing: border-box;
  width: 159.2px;
  height: 37px;
}
.badgeBgNone {
  position: absolute;
  top: 4px;
  left: 0px;
  border-radius: 10px;
  background-color: #ffe9ea;
  border: 1px solid #d6e8fa;
  box-sizing: border-box;
  width: 159.2px;
  height: 37px;
}
.badgeBgDone {
  position: absolute;
  top: 4px;
  left: 0px;
  border-radius: 10px;
  background-color: #e4f3e6;
  border: 1px solid #d6e8fa;
  box-sizing: border-box;
  width: 159.2px;
  height: 37px;
}
.badgeBgConfidence {
  position: absolute;
  top: 4px;
  left: 0px;
  border-radius: 10px;
  background-color: #d6e8fa;
  border: 1px solid #d6e8fa;
  box-sizing: border-box;
  width: 159.2px;
  height: 37px;
}
/* 원본은 폭 108.8px 고정이라 '매칭 없음 확인'·'확신도 100%' 가 두 줄로 쪼개져
   배지 밖 아래로 흘러나왔다. 배지 안쪽을 다 쓰고 한 줄로 둔다. */
.badgeLabel {
  position: absolute;
  top: 0px;
  left: 8px;
  right: 8px;
  line-height: 45px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.badgeLabelLow {
  color: #bc6900;
}
.badgeLabelNone {
  color: #e32936;
}
.badgeLabelDone {
  color: #006600;
}
.badgeLabelConfidence {
  color: #0053e3;
}
/* ── 이 컬럼은 무엇인가요? ──────────────────── */
.detailCard {
  position: absolute;
  top: 971px;
  left: 635px;
  filter: drop-shadow(3px 4px 10px rgba(0, 83, 227, 0.16));
  border-radius: 30px;
  border: 2px solid #d6e8fa;
  box-sizing: border-box;
  width: 1235px;
  height: 1444px;
}
.b25 {
  position: absolute;
  font-size: var(--font-body-02);
  line-height: 36px;
  top: 1006px;
  left: 704px;
}
.b3 {
  position: absolute;
  top: 1090px;
  left: calc(50% - 256px);
  width: 1130px;
  font-size: var(--font-body-01);
  line-height: 54px;
  color: #0053e3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.xlsxC {
  position: absolute;
  top: 1150px;
  left: 704px;
  font-size: var(--font-body-03);
  line-height: 45px;
  font-weight: 500;
}
/* 실제 값 미리보기 */
.previewCard {
  position: absolute;
  top: 1230px;
  left: 704px;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1102px;
  height: 607px;
}
.previewHeaderBg {
  position: absolute;
  top: 1230px;
  left: 704px;
  border-radius: 20px 20px 0px 0px;
  background-color: #f7f6f3;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1102px;
  height: 99px;
}
.b13 {
  position: absolute;
  font-size: var(--font-body-02);
  line-height: 36px;
  top: 1265px;
  left: 802px;
  display: inline-block;
  width: 335px;
}
.previewColHeaderBg {
  position: absolute;
  top: 1326px;
  left: 704px;
  background-color: #f7f6f3;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1102px;
  height: 70px;
}
/* 확인 중인 컬럼을 세로로 강조 */
.previewColHighlight {
  position: absolute;
  top: 1396px;
  left: 1264px;
  background-color: #eff5fe;
  width: 160px;
  height: 342px;
}
/* 원본은 '측정일' 같은 짧은 이름만 가정해 폭이 86px 이었다. 실제 컬럼명은
   '생물화학적산소요구량'처럼 길어서 줄바꿈되며 헤더 띠를 넘어간다.
   칸 간격(최소 222px) 안에서 한 줄로 자른다. */
.previewHead {
  position: absolute;
  line-height: 36px;
  top: 1343px;
  display: inline-block;
  width: 205px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.previewDivider {
  position: absolute;
  left: 704px;
  width: 1102px;
  height: 1px;
  background-color: #d1d5db;
}
.previewCell {
  position: absolute;
  line-height: 36px;
  font-weight: 500;
  color: #000;
  display: inline-block;
  width: 205px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* 미리보기 카드의 바닥 띠 — Figma 는 이 박스를 자기 높이(99px)만큼 아래(1837)로
   내보냈다. 카드 하단(1837)에서 99px 올린 1738 이 강조 밴드가 끝나는 지점이고,
   그래야 b14 가 헤더 라벨과 같은 들여쓰기로 이 안에 들어온다. */
.previewFooterBg {
  position: absolute;
  top: 1738px;
  left: 704px;
  border-radius: 0px 0px 20px 20px;
  background-color: #f7f6f3;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1102px;
  height: 99px;
}
/* 예시값은 원본 셀 내용이라 길이를 예측할 수 없다. 원본 폭(718)에서는 두 줄이
   되며 카드 바닥 띠(1738~1837) 밖으로 흘러나왔다. 띠 안쪽을 다 쓰고 자른다. */
.b14 {
  position: absolute;
  line-height: 36px;
  top: 1771px;
  left: 802px;
  display: inline-block;
  width: 980px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.b26 {
  position: absolute;
  font-size: var(--font-body-02);
  line-height: 36px;
  top: 1908px;
  left: 704px;
}
.suggestCard {
  position: absolute;
  top: 1973px;
  left: 704px;
  filter: drop-shadow(3px 4px 10px rgba(0, 83, 227, 0.16));
  border-radius: 30px;
  border: 2px solid #0053e3;
  box-sizing: border-box;
  width: 1102px;
  height: 199px;
}
.b4 {
  position: absolute;
  top: 2021px;
  left: calc(50% - 200px);
  width: 800px;
  font-size: var(--font-body-01);
  line-height: 54px;
  color: #0053e3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.div16 {
  position: absolute;
  top: 2089px;
  left: 760px;
  font-size: var(--font-body-03);
  line-height: 45px;
  font-weight: 500;
  white-space: pre-wrap;
}
/* ── 액션 ───────────────────────────────────── */
.actionPrimary {
  position: absolute;
  top: 2223px;
  left: 704px;
  width: 455px;
  height: 56px;
  text-align: center;
  color: #fff;
}
.actionPrimaryBg {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 20px;
  background-color: #0053e3;
  width: 455px;
  height: 56px;
}
/* Figma 는 라벨 박스를 글리프 높이(26px)로 내보내고 그 박스를 가운데 맞췄지만,
   브라우저의 줄 상자는 line-height: normal 로 36px 이라 글자가 5px 쯤 아래로
   내려간다. 버튼 높이만큼 line-height 를 줘서 폰트 메트릭과 무관하게 정중앙에 둔다. */
.actionPrimaryLabel {
  position: absolute;
  top: 0px;
  left: 83.2px;
  display: inline-block;
  width: 288.6px;
  height: 56px;
  line-height: 56px;
}
.actionSecondary {
  position: absolute;
  top: 2223px;
  width: 301.8px;
  height: 56px;
  text-align: center;
  color: #0053e3;
}
.actionSecondaryBg {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 20px;
  border: 2px solid #0053e3;
  box-sizing: border-box;
  width: 301.8px;
  height: 56px;
}
.actionSecondaryLabel {
  position: absolute;
  top: 0px;
  left: 55.18px;
  display: inline-block;
  width: 191.4px;
  height: 56px;
  line-height: 56px;
}
/* 오른쪽 패널에 고를 항목이 없을 때 */
.detailNotice {
  position: absolute;
  top: 1090px;
  left: 704px;
  width: 1000px;
  line-height: 45px;
  font-weight: 500;
}
/* 누를 수 없는 버튼 — 호버·클릭 반응을 주지 않는다. */
.actionDisabled {
  cursor: not-allowed;
  opacity: 0.4;
}
/* 용어 직접 고르기 — 액션 버튼 줄 아래에 펼쳐진다. */
.pickerCard {
  position: absolute;
  top: 2295px;
  left: 704px;
  width: 1102px;
  box-sizing: border-box;
  padding: 20px 24px 24px;
  border-radius: 20px;
  background-color: #fff;
  border: 2px solid #0053e3;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.pickerInput {
  height: 56px;
  padding: 0 20px;
  box-sizing: border-box;
  border-radius: 10px;
  border: 2px solid #d6e8fa;
  outline: none;
  font-family: inherit;
  font-size: var(--font-body-03);
  color: #1f2937;
}
.pickerInput:focus {
  border-color: #0053e3;
}
.pickerList {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 420px;
  overflow-y: auto;
}
.pickerRow {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding: 12px 18px;
  border-radius: 10px;
  background-color: #f1f7ff;
  border: 1px solid #d6e8fa;
}
.pickerName {
  font-size: var(--font-body-03);
  color: #0053e3;
}
.pickerCode {
  font-size: var(--font-body-03);
  font-weight: 500;
  color: #9ca3af;
}
.pickerEmpty {
  padding: 12px 18px;
  font-weight: 500;
}
/* 원본 좌표(2255)는 액션 버튼 줄(2223~2279) 한가운데라 버튼 위에 글자가 겹쳐
   찍혔다. 추천 카드(~2172)와 버튼 사이에 한 줄로 넣는다. */
.submitError {
  position: absolute;
  top: 2178px;
  left: 704px;
  width: 1100px;
  line-height: 40px;
  font-weight: 600;
  color: #d92d20;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.child19 {
  position: absolute;
  left: -100px;
  background-color: #f3f3f3;
  width: 2120px;
  height: 244px;
}
</style>
