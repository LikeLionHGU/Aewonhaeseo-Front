<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import wordmark from "../assets/wordmark.svg";
import searchIcon from "../assets/search.png";
import AccountMenu from "../components/AccountMenu.vue";
import { useDesignScale } from "../composables/useDesignScale";
import { useTermNames } from "../composables/useTermNames";
import { listAnalyses, parseConditions } from "../api";
import type { AnalysisHistoryItem } from "../api";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 2181;

const { scale, offsetX } = useDesignScale(DESIGN_WIDTH);
const router = useRouter();
const { loadTerms, termName } = useTermNames();

const PLACEHOLDER = "예: 낙동강 BOD 지난 1년 월별 평균을 보여줘";
const query = ref("");
const canSubmit = computed(() => query.value.trim().length > 0);

// 자연어를 해석하는 API 가 없어서 질문은 조건 화면으로 넘겨 보여주기만 한다.
// 실제 조건은 거기서 직접 고른다.
function submit() {
  if (!canSubmit.value) return;
  router.push({ name: "conditions", query: { q: query.value.trim() } });
}

// 템플릿 — 조건 화면의 집계 단위·방식을 미리 채워서 연다.
const templates = [
  { title: "월별 항목 추세 분석", bucket: "월별", metric: "평균" },
  { title: "기준 초과 구간 탐지", bucket: "월별", metric: "최대" },
  { title: "전년 동기 대비 분석", bucket: "연별", metric: "평균" },
];
function useTemplate(index: number) {
  const preset = templates[index];
  router.push({
    name: "conditions",
    query: { q: preset.title, unit: preset.bucket, metric: preset.metric },
  });
}

// --- 최근 분석 기록 ---

const historyLoading = ref(true);
const historyError = ref("");
const history = ref<AnalysisHistoryItem[]>([]);

const BUCKET_LABEL: Record<string, string> = {
  month: "월별",
  quarter: "분기별",
  year: "연도별",
  none: "기간 전체",
};
const METRIC_LABEL: Record<string, string> = {
  avg: "평균",
  max: "최대",
  min: "최소",
  count: "건수",
};

/** '2026-08-16T20:32:33' → '2026.08.16 20:32 실행' */
function formatRanAt(iso: string) {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}.${pad(at.getMonth() + 1)}.${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())} 실행`;
}

/** 저장된 조건을 한 줄 제목으로 푼다. */
function titleOf(item: AnalysisHistoryItem) {
  const c = parseConditions(item);
  const sites = c.site_names?.length ? c.site_names.join(", ") : "전체 지점";
  const items = c.item_codes?.length ? c.item_codes.map(termName).join(", ") : "전체 항목";
  const bucket = BUCKET_LABEL[c.bucket ?? "none"] ?? "";
  const metric = METRIC_LABEL[c.metric ?? "avg"] ?? "";
  const period = c.from && c.to ? ` (${c.from} ~ ${c.to})` : "";
  return `${sites} · ${items} ${bucket} ${metric}${period}`;
}

const historyCards = computed(() =>
  history.value.slice(0, 4).map((item) => ({
    id: item.execution_id,
    title: titleOf(item),
    // 5000행에서 잘렸으면 '집계 완료' 라고 하면 안 된다.
    badge: item.truncated ? "일부만 집계" : "집계 완료",
    truncated: item.truncated,
    ruleset: item.ruleset_version,
    ranAt: formatRanAt(item.ran_at),
  })),
);

async function loadHistory() {
  historyLoading.value = true;
  historyError.value = "";
  try {
    await loadTerms();
    const page = await listAnalyses({ size: 4 });
    history.value = page.items;
  } catch {
    historyError.value = "최근 분석 기록을 불러오지 못했어요";
  } finally {
    historyLoading.value = false;
  }
}

function openResult(executionId: string) {
  router.push({ name: "results", query: { executionId } });
}

// 템플릿 카드 안, 세 줄 사이 구분선 y 좌표.
const TEMPLATE_DIVIDERS = [1179, 1313];

// 기록 카드 좌표 — 첫 카드가 956px, 이후 155px 간격.
const HISTORY_STEP = 155;
const cardTop = (i: number) => 956 + i * HISTORY_STEP;
const titleTop = (i: number) => 979 + i * HISTORY_STEP;
const chipTop = (i: number) => 1024 + i * HISTORY_STEP;
const buttonTop = (i: number) => 996 + i * HISTORY_STEP;

onMounted(loadHistory);
</script>

<template>
  <div
    :class="$style.viewport"
    :style="{ height: `${DESIGN_HEIGHT * scale}px` }"
  >
    <div
      :class="$style.div"
      :style="{ transform: `translateX(${offsetX}px) scale(${scale})` }"
    >
      <b :class="$style.b">무엇을 분석해드릴까요?</b>
      <b :class="$style.b2"
        >수질측정망 데이터를 자동으로 집계·분석하고, 계산 근거와 원본 데이터를
        함께 제공합니다.</b
      >
      <div :class="$style.child" />
      <div :class="$style.parent">
        <b :class="$style.b3">수질 데이터에 대해 질문해 보세요</b>
        <img :class="$style.searchIcon" :src="searchIcon" alt="" />
      </div>
      <div :class="$style.rectangleParent">
        <div :class="$style.groupChild" />
        <input
          v-model="query"
          :class="$style.queryInput"
          type="text"
          :placeholder="PLACEHOLDER"
          enterkeyhint="search"
          aria-label="수질 데이터 질문 입력"
          @keyup.enter="submit"
        />
      </div>
      <div :class="$style.div3">이렇게 질문해 보세요</div>
      <div
        :class="[$style.rectangleGroup, 'btn']"
        role="button"
        :aria-disabled="!canSubmit"
        @click="submit"
      >
        <div
          :class="[
            $style.groupItem,
            canSubmit ? 'btn-fill' : $style.groupItemOff,
          ]"
        />
        <b :class="[$style.b4, !canSubmit && $style.b4Off]">질문하기 →</b>
      </div>
      <div
        :class="[$style.rectangleContainer, 'btn']"
        role="button"
        @click="query = '한강 COD 분기별 기준 초과 횟수'"
      >
        <div :class="[$style.groupInner, 'btn-fill']" />
        <div :class="$style.cod">한강 COD 분기별 기준 초과 횟수</div>
      </div>
      <div
        :class="[$style.groupDiv, 'btn']"
        role="button"
        @click="query = '금강 DO 전년 동기 대비 비교'"
      >
        <div :class="[$style.rectangleDiv, 'btn-fill']" />
        <div :class="$style.do">금강 DO 전년 동기 대비 비교</div>
      </div>
      <img :class="[$style.wordmark, 'link']" :src="wordmark" alt="물어볼래" @click="router.push('/')" />
      <AccountMenu />
      <b :class="$style.b8">최근 분석 기록</b>
      <div :class="$style.div4">전체 기록 보기 →</div>
      <div
        v-if="historyLoading || historyError || !historyCards.length"
        :class="[$style.historyNotice, historyError && $style.historyNoticeError]"
      >
        {{
          historyLoading
            ? "최근 분석 기록을 불러오는 중이에요…"
            : historyError || "아직 분석한 기록이 없어요. 위에서 질문해 보세요."
        }}
      </div>
      <template v-for="(card, i) in historyCards" :key="card.id">
        <div :class="$style.historyCard" :style="{ top: `${cardTop(i)}px` }" />
        <b :class="$style.historyTitle" :style="{ top: `${titleTop(i)}px` }"
           :title="card.title">{{ card.title }}</b>
        <div :class="$style.historyMeta" :style="{ top: `${chipTop(i)}px` }">
          <b :class="[$style.metaBadge, card.truncated && $style.metaBadgeWarn]">{{ card.badge }}</b>
          <b :class="$style.metaRuleset">{{ card.ruleset }}</b>
          <span :class="$style.metaRanAt">{{ card.ranAt }}</span>
        </div>
        <div
          :class="[$style.historyButton, 'btn']"
          role="button"
          :style="{ top: `${buttonTop(i)}px` }"
          @click="openResult(card.id)"
        >
          <div :class="[$style.groupChild10, 'btn-fill']" />
          <b :class="$style.b13">결과 보기</b>
        </div>
      </template>
      <div :class="$style.child5" />
      <div v-for="top in TEMPLATE_DIVIDERS" :key="top" :class="$style.templateDivider"
           :style="{ top: `${top}px` }" />
      <b :class="$style.b17">자주 쓰는 템플릿</b>
      <b :class="$style.b18">월별 항목 추세 분석</b>
      <b :class="$style.b19">기준 초과 구간 탐지</b>
      <b :class="$style.b20">전년 동기 대비 분석</b>
      <div :class="$style.div9">지점/항목/기간을 입력하면 월별 추세 생성</div>
      <div :class="$style.div10">법정/내부 기준 적용 후 초과 횟수 산출</div>
      <div :class="$style.div11">동일 지점/항목의 기간 전후 차이 비교</div>
      <div
        :class="[$style.rectangleParent14, 'btn']"
        role="button"
        @click="useTemplate(0)"
      >
        <div :class="[$style.groupChild14, 'btn-fill']" />
        <b :class="$style.b9">사용</b>
      </div>
      <div
        :class="[$style.rectangleParent15, 'btn']"
        role="button"
        @click="useTemplate(1)"
      >
        <div :class="[$style.groupChild14, 'btn-fill']" />
        <b :class="$style.b9">사용</b>
      </div>
      <div
        :class="[$style.rectangleParent16, 'btn']"
        role="button"
        @click="useTemplate(2)"
      >
        <div :class="[$style.groupChild14, 'btn-fill']" />
        <b :class="$style.b9">사용</b>
      </div>
      <div :class="$style.child7" />
      <div :class="[$style.div12, 'link']" @click="router.push('/data')">
        내 데이터
      </div>
      <div :class="[$style.div13, 'link']" @click="router.push('/ask')">
        분석하기
      </div>
      <div :class="$style.div14">문의하기</div>
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
  text-align: right;
  font-size: var(--font-body-03);
  color: #00559e;
  font-family: Pretendard;
  transform-origin: top left;
}
/* 원본은 calc(50% - 텍스트폭/2) 로 중앙을 맞춰서 글자 크기가 바뀌면 밀렸다.
   left/right 0 + fit-content + auto 여백으로 블록만 가운데 놓는다. text-align 을
   건드리지 않으므로 여러 줄 텍스트의 줄 내부 정렬은 원본 그대로 유지된다. */
.b {
  position: absolute;
  top: 364px;
  left: 0px;
  right: 0px;
  width: fit-content;
  margin-inline: auto;
  font-size: var(--font-title-02);
  color: #002f5f;
  flex-shrink: 0;
}
/* 원본은 calc(50% - 텍스트폭/2) 로 중앙을 맞춰서 글자 크기가 바뀌면 밀렸다.
   left/right 0 + fit-content + auto 여백으로 블록만 가운데 놓는다. text-align 을
   건드리지 않으므로 여러 줄 텍스트의 줄 내부 정렬은 원본 그대로 유지된다. */
.b2 {
  position: absolute;
  top: 432px;
  left: 0px;
  right: 0px;
  width: fit-content;
  margin-inline: auto;
  line-height: 45px;
  color: #6b7280;
  flex-shrink: 0;
}
.child {
  position: absolute;
  top: 529px;
  left: 50px;
  box-shadow: 3px 3px 10px 1px rgba(179, 179, 179, 0.2);
  border-radius: 30px;
  background: linear-gradient(-10.99deg, #fff, #f9fbff 36.03%, #f2f8ff);
  border: 2px solid #d6e8fb;
  box-sizing: border-box;
  width: 1820px;
  height: 276px;
  flex-shrink: 0;
}
.parent {
  position: absolute;
  top: 574px;
  left: 221px;
  width: 289px;
  height: 45px;
  flex-shrink: 0;
  color: #004ec2;
}
.b3 {
  position: absolute;
  top: 0px;
  left: 28px;
  line-height: 45px;
}
.searchIcon {
  position: absolute;
  top: 13px;
  left: 0px;
  width: 20px;
  height: 20px;
  object-fit: cover;
}
.rectangleParent {
  position: absolute;
  top: 626px;
  left: calc(50% - 760px);
  width: 1184px;
  height: 75px;
  flex-shrink: 0;
  text-align: left;
  color: #a0a0a0;
}
.groupChild {
  position: absolute;
  top: 0px;
  left: calc(50% - 592px);
  border-radius: 10px;
  background-color: #fff;
  border: 2px solid #c2ddf5;
  box-sizing: border-box;
  width: 1184px;
  height: 75px;
}
/* 실제 입력 필드 — 배경 사각형(.groupChild) 위에 겹쳐 둔다.
   input 은 폰트를 상속하지 않으므로 명시해야 하고, 루트가 text-align: right
   이라 정렬도 직접 되돌려야 한다. 원본 텍스트 상자는 700px 이었지만 긴 질문도
   들어가도록 상자 안쪽 폭(1184 - 좌우 여백 31)을 다 쓴다. */
.queryInput {
  position: absolute;
  top: 15px;
  left: 31px;
  width: 1122px;
  height: 45px;
  margin: 0;
  padding: 0;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: inherit;
  line-height: 45px;
  text-align: left;
  color: #1f2937;
}
.queryInput::placeholder {
  color: #a0a0a0;
}
/* 입력 중임을 테두리로 알린다 */
.rectangleParent:focus-within .groupChild {
  border-color: #0053e3;
}
.div3 {
  position: absolute;
  top: 729px;
  left: 231px;
  line-height: 45px;
  color: #9ca3af;
  flex-shrink: 0;
}
.rectangleGroup {
  position: absolute;
  top: 626px;
  left: calc(50% + 438px);
  width: 322px;
  height: 56px;
  flex-shrink: 0;
  text-align: center;
  color: #fff;
}
.groupItem {
  position: absolute;
  top: 0px;
  left: calc(50% - 161px);
  border-radius: 10px;
  background-color: #004ec2;
  width: 322px;
  height: 56px;
}
/* 질문이 비었을 때 — 메인 화면의 "데이터 연결 후 가능" 버튼과 같은 톤.
   .groupItem 뒤에 와야 배경색을 덮어쓴다. */
.groupItemOff {
  background-color: #e5e7eb;
}
.rectangleGroup[aria-disabled="true"] {
  cursor: default;
}
.b4 {
  position: absolute;
  top: 0px;
  left: 91px;
  line-height: 56px;
  display: inline-block;
  width: 139px;
  height: 45px;
}
.b4Off {
  color: #9ca3af;
}
.rectangleContainer {
  position: absolute;
  top: 729px;
  left: 424px;
  width: 363px;
  height: 45px;
  flex-shrink: 0;
  color: #455772;
}
.groupInner {
  position: absolute;
  top: 6px;
  left: 0px;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d0d0d0;
  box-sizing: border-box;
  width: 363px;
  height: 34px;
}
.cod {
  position: absolute;
  top: 0px;
  left: 53px;
  line-height: 45px;
  font-weight: 600;
}
.groupDiv {
  position: absolute;
  top: 729px;
  left: 799px;
  width: 363px;
  height: 45px;
  flex-shrink: 0;
  color: #455772;
}
.rectangleDiv {
  position: absolute;
  top: 5px;
  left: 0px;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d0d0d0;
  box-sizing: border-box;
  width: 363px;
  height: 34px;
}
.do {
  position: absolute;
  top: 0px;
  left: 68px;
  line-height: 45px;
  font-weight: 600;
  display: inline-block;
  width: 226px;
  height: 45px;
}
.b8 {
  position: absolute;
  top: 902px;
  left: 210px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #1f2937;
  flex-shrink: 0;
}
.div4 {
  position: absolute;
  top: 902px;
  left: 1034px;
  line-height: 45px;
  font-weight: 600;
  color: #0053e3;
  flex-shrink: 0;
}
.groupChild10 {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 10px;
  background-color: #fff;
  border: 2px solid #e6e7eb;
  box-sizing: border-box;
  width: 131px;
  height: 44px;
}
.b13 {
  position: absolute;
  top: 0px;
  left: 28px;
  line-height: 44px;
}
/* ── 최근 분석 기록 ─────────────────────────────
   원본은 카드 4장을 좌표까지 복제해 뒀다. 기록 수에 따라 늘고 줄어야 하므로
   좌표는 script 에서 계산하고 여기엔 모양만 남긴다. */
.historyCard {
  position: absolute;
  left: 184px;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
  border-radius: 20px;
  background-color: #fff;
  border: 2px solid #e6e7eb;
  box-sizing: border-box;
  width: 1002px;
  height: 135px;
}
.historyTitle {
  position: absolute;
  left: 226px;
  width: 740px;
  line-height: 45px;
  color: #1f2937;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.historyButton {
  position: absolute;
  left: 994px;
  width: 131px;
  height: 44px;
}
/* 카드 두 번째 줄 — 배지·규칙 버전·실행 시각.
   원본은 셋 다 고정폭 상자였는데 'rules-2026-08-11' 이 알약 안에서 줄바꿈되어
   카드 밖으로 흘러나왔다. 내용 길이에 맞춰 늘어나는 한 줄로 바꾼다. */
.historyMeta {
  position: absolute;
  left: 226px;
  display: flex;
  align-items: center;
  gap: 14px;
  max-width: 750px;
  white-space: nowrap;
}
.metaBadge {
  display: inline-flex;
  align-items: center;
  height: 37px;
  padding: 0 18px;
  border-radius: 10px;
  background-color: #e2f8f0;
  color: #00a26a;
}
/* 5000행에서 잘린 결과는 완료와 같은 색으로 두면 안 된다. */
.metaBadgeWarn {
  background-color: #fdf0da;
  color: #a86504;
}
.metaRuleset {
  display: inline-flex;
  align-items: center;
  height: 37px;
  padding: 0 18px;
  border-radius: 10px;
  background-color: #f1f7ff;
  border: 1px solid #d6e8fa;
  box-sizing: border-box;
  color: #00559e;
}
.metaRanAt {
  font-weight: 500;
  color: #9ca3af;
  overflow: hidden;
  text-overflow: ellipsis;
}
.historyNotice {
  position: absolute;
  top: 979px;
  left: 226px;
  width: 900px;
  line-height: 45px;
  font-weight: 500;
  color: #6b7280;
  text-align: left;
}
.historyNoticeError {
  color: #d92d20;
}
.child5 {
  position: absolute;
  top: 956px;
  left: 1216px;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
  border-radius: 20px;
  background-color: #fff;
  border: 2px solid #e6e7eb;
  box-sizing: border-box;
  width: 520px;
  height: 510px;
  flex-shrink: 0;
}
/* 템플릿 세 줄 사이 구분선. 원본은 src 가 없는 빈 <img> 라 아무것도 그려지지
   않았다 — 다른 화면의 구분선과 같은 방식으로 되살린다. */
.templateDivider {
  position: absolute;
  left: 1256px;
  width: 439.5px;
  height: 1px;
  background-color: #e6e7eb;
  flex-shrink: 0;
}
.b17 {
  position: absolute;
  top: 986px;
  left: 1256px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #1f2937;
  text-align: left;
  flex-shrink: 0;
}
.b18 {
  position: absolute;
  top: 1068px;
  left: 1256px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #1f2937;
  text-align: left;
  flex-shrink: 0;
}
.b19 {
  position: absolute;
  top: 1202px;
  left: 1256px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #1f2937;
  text-align: left;
  flex-shrink: 0;
}
.b20 {
  position: absolute;
  top: 1336px;
  left: 1256px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #1f2937;
  text-align: left;
  flex-shrink: 0;
}
.div9 {
  position: absolute;
  top: 1111px;
  left: 1256px;
  line-height: 45px;
  color: #6b7280;
  text-align: left;
  flex-shrink: 0;
}
.div10 {
  position: absolute;
  top: 1245px;
  left: 1256px;
  line-height: 45px;
  color: #6b7280;
  text-align: left;
  flex-shrink: 0;
}
.div11 {
  position: absolute;
  top: 1379px;
  left: 1256px;
  line-height: 45px;
  color: #6b7280;
  text-align: left;
  flex-shrink: 0;
}
.rectangleParent14 {
  position: absolute;
  top: 1068px;
  left: 1606px;
  width: 78px;
  height: 45px;
  flex-shrink: 0;
  text-align: left;
}
 /* 템플릿의 '사용' 버튼 라벨. 기록 카드 배지와 공용이었는데 그쪽만 정리됐다. */
.b9 {
  position: absolute;
  top: 0px;
  left: 21px;
  line-height: 45px;
}
.groupChild14 {
  position: absolute;
  top: 4px;
  left: 0px;
  border-radius: 10px;
  background-color: #f1f7ff;
  border: 1px solid #d6e8fa;
  box-sizing: border-box;
  width: 78px;
  height: 37px;
}
.rectangleParent15 {
  position: absolute;
  top: 1202px;
  left: 1606px;
  width: 78px;
  height: 45px;
  flex-shrink: 0;
  text-align: left;
}
.rectangleParent16 {
  position: absolute;
  top: 1336px;
  left: 1606px;
  width: 78px;
  height: 45px;
  flex-shrink: 0;
  text-align: left;
}
.child7 {
  position: absolute;
  top: 1937px;
  left: -100px;
  background-color: #f3f3f3;
  width: 2120px;
  height: 244px;
  flex-shrink: 0;
}
.div12 {
  position: absolute;
  top: 85px;
  left: calc(50% - 676px);
  font-size: var(--font-body-02);
  font-weight: 500;
  text-align: center;
  flex-shrink: 0;
}
/* 내비게이션의 현재 섹션 표시 — 굵게 + 밑줄 */
.div13 {
  position: absolute;
  top: 85px;
  left: calc(50% - 528px);
  font-size: var(--font-body-02);
  font-weight: 700;
  text-decoration: underline;
  text-align: center;
  flex-shrink: 0;
}
.div14 {
  position: absolute;
  top: 85px;
  left: calc(50% - 386px);
  font-size: var(--font-body-02);
  font-weight: 500;
  text-align: left;
  flex-shrink: 0;
}
</style>
