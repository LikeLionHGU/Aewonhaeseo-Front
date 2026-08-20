<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import wordmark from '../assets/wordmark.svg'
import AccountMenu from '../components/AccountMenu.vue'
import { useDesignScale } from '../composables/useDesignScale'
import { useCanvasHeight } from '../composables/useCanvasHeight'

/**
 * 기업용 수질 데이터 표준화 Open API 소개.
 *
 * 로그인 없이 볼 수 있다 — 신청하기 전에 무엇을 주는 API 인지 먼저 읽어야 하니까.
 * 신청서 화면은 로그인이 필요하고, 라우터 가드가 알아서 로그인으로 보낸다.
 *
 * 다른 화면들과 달리 요소마다 좌표를 박지 않았다. Figma 내보내기가 아니라 손으로
 * 쓰는 글이라, 문단이 하나 늘 때마다 아래 좌표를 전부 고치는 방식은 유지되지 않는다.
 * 1920 캔버스와 배율은 그대로 쓰고 안쪽만 보통 흐름으로 쌓는다.
 */
const DESIGN_WIDTH = 1920

const { scale, offsetX } = useDesignScale(DESIGN_WIDTH)
const router = useRouter()

const canvas = ref<HTMLElement | null>(null)
const canvasHeight = useCanvasHeight(canvas)

/**
 * API 문서 주소.
 *
 * 백엔드가 springdoc 문서를 인증 없이 열어 둔다(2026-08-20 확인 — /swagger-ui/index.html
 * 200). /api 만 프록시를 타므로 같은 출처로는 닿지 않아 절대 주소를 쓴다. 배포 환경이
 * 다르면 VITE_API_DOCS_URL 로 덮어쓴다.
 */
const API_DOCS_URL =
  import.meta.env.VITE_API_DOCS_URL ?? 'https://1-201-116-24.sslip.io/swagger-ui/index.html'

function goToApply() {
  router.push({ name: 'open-api-apply' })
}

const FEATURES = [
  {
    no: '01',
    title: '컬럼명 자동 표준화',
    // 문서 원문은 마크다운 백틱으로 용어를 감쌌다. 화면에서는 그대로 찍히므로 뗀다 —
    // 아래 코드 블록이 변환 예시를 보여주니 강조가 따로 필요하지 않다.
    body:
      'T-N, 총질소, TN(mg/L)처럼 서로 다르게 작성된 수질 용어를 동일한 표준코드와 표준명으로 변환합니다.',
    // 코드는 실제 사전에서 확인한 값이다(2026-08-20). 문서 초안에는 SS 가
    // WQ-003 으로 적혀 있었지만 WQ-003 은 화학적산소요구량이고, 부유물질량은
    // WQ-004 다. 잘못된 코드를 소개 페이지에 그대로 두면 연동하는 쪽이 헤맨다.
    code: ['T-N → WQ-005 / 총질소', 'SS  → WQ-004 / 부유물질량'],
  },
  {
    no: '02',
    title: '엑셀·CSV 파일 분석',
    body:
      '기업이 보유한 엑셀 또는 CSV 파일을 API로 전송하면 파일의 컬럼 구조를 분석하고 항목별 표준화 결과를 제공합니다.',
    facts: ['지원 형식: CSV · XLS · XLSX · XLSM', '최대 파일 크기: 100MB'],
  },
  {
    no: '03',
    title: '검토가 필요한 항목 추천',
    body:
      '정확하게 판별하기 어려운 용어는 임의로 확정하지 않고, 가능한 표준항목과 점수를 함께 제공합니다. 담당자는 추천 결과를 확인한 후 올바른 항목을 선택할 수 있습니다.',
  },
  {
    no: '04',
    title: '기업별 전용 사전',
    body:
      '기업이 직접 승인한 사내 용어는 해당 기업의 전용 사전에 저장됩니다. 이후 같은 표현이 들어오면 이전 검수 결과를 바탕으로 자동 매핑됩니다.',
    code: ['우리회사TN → 총질소', '방류수SS   → 부유물질량'],
    note: '기업별 전용 사전은 다른 기업의 사전과 분리되어 관리됩니다.',
  },
]

// 2단계는 '관리자 승인 및 API 키 발급'(문서 초안) 도 '신청 즉시 발급' 도 아니게
// 두었다. 서버는 발급을 관리자 경로에만 열어 두었고(2026-08-21 확인), 기업 담당자가
// 직접 발급받는 경로는 아직 없다. 어느 쪽으로 정해질지 모르는 상태에서 '즉시' 라고
// 써 두면 공개 페이지에 사실이 아닌 약속이 남는다.
const STEPS = [
  'Open API 이용 신청',
  'API 키 발급',
  '컬럼 목록 또는 파일 전송',
  '표준화 결과 확인',
  '필요한 항목 검수',
  '검수 결과를 기업별 사전에 반영',
]

const AUDIENCE = [
  '여러 사업장으로부터 서로 다른 형식의 수질 데이터를 수집하는 기업',
  '수질 엑셀·CSV 데이터를 정기적으로 처리하는 기업',
  '기존 데이터를 표준코드 체계로 변환하려는 기업',
  '반복적인 컬럼 정리와 수작업 검수를 줄이려는 기업',
  '자체 환경관리 시스템에 수질 표준화 기능을 연동하려는 기업',
]

const RESULTS = [
  '원본 컬럼명',
  '표준코드 및 표준명',
  '자동 매핑 상태',
  '매핑 점수',
  '추천 후보',
  '검토 필요 여부',
  '기업 전용 사전 적용 여부',
]
</script>

<template>
  <div :class="$style.viewport" :style="{ height: `${canvasHeight * scale}px` }">
    <div
      ref="canvas"
      :class="$style.canvas"
      :style="{ transform: `translateX(${offsetX}px) scale(${scale})` }"
    >
      <!-- 머리글은 다른 화면과 같은 좌표에 둔다. 흐름 배치로 바꾸면 화면을 옮길 때
           로고와 메뉴가 미세하게 튄다. -->
      <img :class="[$style.wordmark, 'link']" :src="wordmark" alt="물어볼래" @click="router.push('/')" />
      <div :class="[$style.nav, $style.navData, 'link']" @click="router.push('/data')">내 데이터</div>
      <div :class="[$style.nav, $style.navAsk, 'link']" @click="router.push('/ask')">분석하기</div>
      <div :class="[$style.nav, $style.navApi, $style.navOn]">오픈 API 신청</div>
      <AccountMenu />

      <main :class="$style.main">
        <!-- 히어로 -->
        <section :class="$style.hero">
          <div :class="$style.eyebrow">기업용 수질 데이터 표준화 Open API</div>
          <h1 :class="$style.heroTitle">흩어진 수질 데이터를<br />하나의 표준으로</h1>
          <p :class="$style.heroLead">
            기업마다 다르게 작성된 수질 데이터의 컬럼명과 용어를 표준코드로 자동 변환해 보세요.
            엑셀·CSV 파일 또는 컬럼 목록을 API로 전송하면 표준화 결과와 검토가 필요한 항목을 반환합니다.
          </p>
          <div :class="$style.ctaRow">
            <button type="button" :class="[$style.cta, $style.ctaFill, 'btn', 'btn-fill']" @click="goToApply">
              Open API 이용 신청
            </button>
            <a
              :class="[$style.cta, $style.ctaOutline, 'btn', 'btn-outline']"
              :href="API_DOCS_URL"
              target="_blank"
              rel="noopener noreferrer"
            >API 문서 보기 ↗</a>
          </div>
        </section>

        <!-- 기능 -->
        <section :class="$style.section">
          <h2 :class="$style.sectionTitle">어떤 기능을 제공하나요?</h2>
          <div :class="$style.featureGrid">
            <article v-for="feature in FEATURES" :key="feature.no" :class="$style.featureCard">
              <div :class="$style.featureNo">{{ feature.no }}</div>
              <h3 :class="$style.featureTitle">{{ feature.title }}</h3>
              <p :class="$style.featureBody">{{ feature.body }}</p>
              <pre v-if="feature.code" :class="$style.code">{{ feature.code.join('\n') }}</pre>
              <ul v-if="feature.facts" :class="$style.factList">
                <li v-for="fact in feature.facts" :key="fact">{{ fact }}</li>
              </ul>
              <p v-if="feature.note" :class="$style.featureNote">{{ feature.note }}</p>
            </article>
          </div>
        </section>

        <!-- 사용 절차 -->
        <section :class="$style.section">
          <h2 :class="$style.sectionTitle">어떻게 사용하나요?</h2>
          <ol :class="$style.stepList">
            <li v-for="(step, i) in STEPS" :key="step" :class="$style.step">
              <span :class="$style.stepNo">{{ i + 1 }}</span>
              <span :class="$style.stepLabel">{{ step }}</span>
            </li>
          </ol>
          <p :class="$style.sectionBody">
            키가 발급되면 기업의 자체 시스템, 데이터 처리 프로그램 또는 서버에서 바로 연동할 수
            있습니다. 키는 <code>X-API-Key</code> 헤더에 실어 보냅니다.
          </p>
          <!-- 문서가 굵게 강조한 주의사항. 신청서 화면에서도 같은 내용을 확인받는다. -->
          <div :class="$style.warn">
            API 키는 공개된 프런트엔드 코드에 포함하지 말고 기업의 백엔드 서버 또는 비밀 저장소에서
            관리해야 합니다.
          </div>
        </section>

        <!-- 대상 · 결과 -->
        <section :class="$style.section">
          <div :class="$style.twoUp">
            <div>
              <h2 :class="$style.sectionTitle">이런 기업에 적합합니다</h2>
              <ul :class="$style.checkList">
                <li v-for="item in AUDIENCE" :key="item">{{ item }}</li>
              </ul>
            </div>
            <div>
              <h2 :class="$style.sectionTitle">API를 통해 받을 수 있는 결과</h2>
              <ul :class="$style.chipList">
                <li v-for="item in RESULTS" :key="item" :class="$style.chip">{{ item }}</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- 이용 안내 -->
        <section :class="$style.section">
          <h2 :class="$style.sectionTitle">이용 안내</h2>
          <div :class="$style.noticeBox">
            <p :class="$style.noticeLine">
              본 Open API는 수질 측정 데이터를 대신 제공하는 API가 아닙니다. 기업이 보유한 수질
              데이터의 용어와 컬럼을 분석하여 표준화하는 API입니다.
            </p>
            <p :class="$style.noticeLine">
              업로드된 파일은 표준화 처리에만 사용되며 처리 완료 후 삭제됩니다. 기업별 사전과 API
              사용 기록은 다른 기업과 분리되어 관리됩니다.
            </p>
          </div>
        </section>

        <!-- 마무리 -->
        <section :class="$style.closing">
          <h2 :class="$style.closingTitle">수질 데이터 표준화를 시작해 보세요</h2>
          <p :class="$style.closingLead">
            반복적인 데이터 정리 작업은 줄이고, 기업의 수질 데이터를 일관된 표준체계로 관리할 수 있습니다.
          </p>
          <button type="button" :class="[$style.cta, $style.ctaFill, 'btn', 'btn-fill']" @click="goToApply">
            Open API 이용 신청하기
          </button>
        </section>
      </main>

      <div :class="$style.footer" />
    </div>
  </div>
</template>

<style module>
.viewport {
  width: 100%;
  overflow: hidden;
  position: relative;
}
/* 높이를 주지 않는다 — 안쪽 내용이 쌓인 만큼 늘고, useCanvasHeight 가 그걸 잰다. */
.canvas {
  width: 1920px;
  position: relative;
  background-color: #f8f9fc;
  text-align: left;
  font-size: var(--font-body-03);
  color: #455772;
  font-family: Pretendard;
  transform-origin: top left;
}

/* ── 머리글 ─────────────────────────────────────────────── */
.wordmark {
  position: absolute;
  top: 82px;
  left: 50px;
  width: 144px;
  height: 35px;
}
.nav {
  position: absolute;
  top: 85px;
  font-size: var(--font-body-02);
  font-weight: 500;
  color: #00559e;
}
.navData {
  left: calc(50% - 676px);
}
.navAsk {
  left: calc(50% - 536px);
}
.navApi {
  left: calc(50% - 386px);
}
/* 지금 보고 있는 자리. 다른 화면들이 '분석하기' 를 이렇게 표시한다. */
.navOn {
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 6px;
}

/* ── 본문 ───────────────────────────────────────────────── */
.main {
  padding: 240px 210px 160px;
  display: flex;
  flex-direction: column;
  gap: 160px;
  /* 한글은 낱말 단위로 끊어야 읽힌다. 기본값은 글자 단위라 줄 끝이 어색해진다. */
  word-break: keep-all;
}
.section {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

/* ── 히어로 ─────────────────────────────────────────────── */
.hero {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 28px;
}
.eyebrow {
  font-size: var(--font-body-02);
  font-weight: 700;
  color: #0053e3;
}
.heroTitle {
  margin: 0;
  font-size: var(--font-display);
  line-height: 1.24;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #002f5f;
}
.heroLead {
  margin: 0;
  max-width: 1100px;
  font-size: var(--font-body-01);
  line-height: 1.6;
  font-weight: 500;
  color: #6b7280;
}
.ctaRow {
  display: flex;
  gap: 20px;
  margin-top: 20px;
}
/* 버튼 두 개가 같은 크기여야 나란히 놓였을 때 어긋나 보이지 않는다. */
.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 76px;
  padding: 0 48px;
  border: none;
  border-radius: 12px;
  box-sizing: border-box;
  font-family: inherit;
  font-size: var(--font-body-01);
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}
.ctaFill {
  background-color: #0053e3;
  color: #fff;
}
.ctaOutline {
  background-color: transparent;
  border: 2px solid #0053e3;
  color: #0053e3;
}

/* ── 기능 ───────────────────────────────────────────────── */
.sectionTitle {
  margin: 0;
  font-size: var(--font-title-02);
  font-weight: 700;
  letter-spacing: -0.015em;
  color: #002f5f;
}
.sectionBody code {
  padding: 2px 10px;
  border-radius: 4px;
  background-color: #f2f8ff;
  border: 1px solid #d6e8fa;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
  color: #00559e;
}
.sectionBody {
  margin: 0;
  font-size: var(--font-body-02);
  line-height: 1.6;
  font-weight: 500;
  color: #6b7280;
}
.featureGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
}
.featureCard {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 44px 48px 48px;
  box-sizing: border-box;
  border-radius: 20px;
  background-color: #fff;
  border: 2px solid #e6e7eb;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
}
.featureNo {
  font-size: var(--font-body-02);
  font-weight: 700;
  color: #0053e3;
}
.featureTitle {
  margin: 0;
  font-size: var(--font-title-03);
  font-weight: 700;
  color: #002f5f;
}
.featureBody {
  margin: 0;
  font-size: var(--font-body-02);
  line-height: 1.6;
  font-weight: 500;
  color: #6b7280;
}
/* 변환 예시. 모노스페이스는 같은 크기에서 더 작게 읽혀 --font-code 를 쓴다. */
.code {
  margin: 0;
  padding: 24px 28px;
  border-radius: 12px;
  background-color: #f2f8ff;
  border: 1px solid #d6e8fa;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: var(--font-code);
  line-height: 1.8;
  color: #00559e;
  white-space: pre;
  overflow-x: auto;
}
.factList,
.checkList,
.chipList,
.stepList {
  margin: 0;
  padding: 0;
  list-style: none;
}
.factList {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: var(--font-body-02);
  font-weight: 600;
  color: #455772;
}
.factList li::before {
  content: '·';
  margin-right: 10px;
  color: #0053e3;
  font-weight: 700;
}
.featureNote {
  margin: 0;
  font-size: var(--font-body-03);
  line-height: 1.6;
  font-weight: 500;
  color: #9ca3af;
}

/* ── 사용 절차 ──────────────────────────────────────────── */
.stepList {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px 32px;
}
.step {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 26px 32px;
  box-sizing: border-box;
  border-radius: 16px;
  background-color: #fff;
  border: 2px solid #d6e8fa;
}
.stepNo {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background-color: #0053e3;
  color: #fff;
  font-size: var(--font-body-02);
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.stepLabel {
  font-size: var(--font-body-02);
  font-weight: 600;
  color: #1f2937;
}
/* 문서가 인용문으로 강조한 주의. 색보다 왼쪽 띠로 무게를 준다. */
.warn {
  padding: 28px 36px;
  border-radius: 12px;
  border-left: 6px solid #a86504;
  background-color: #fdf0da;
  font-size: var(--font-body-02);
  line-height: 1.6;
  font-weight: 600;
  color: #6b4a05;
}

/* ── 대상 · 결과 ────────────────────────────────────────── */
.twoUp {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
}
.twoUp > div {
  display: flex;
  flex-direction: column;
  gap: 40px;
}
.checkList {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.checkList li {
  position: relative;
  padding-left: 40px;
  font-size: var(--font-body-02);
  line-height: 1.55;
  font-weight: 500;
  color: #455772;
}
.checkList li::before {
  content: '✓';
  position: absolute;
  left: 0;
  top: 0;
  color: #0053e3;
  font-weight: 700;
}
.chipList {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-content: flex-start;
}
.chip {
  padding: 14px 26px;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d0d0d0;
  font-size: var(--font-body-03);
  font-weight: 600;
  color: #1f2937;
  white-space: nowrap;
}

/* ── 이용 안내 ──────────────────────────────────────────── */
.noticeBox {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 44px 48px;
  border-radius: 20px;
  background-color: #fcfcfc;
  border: 2px solid #e6e7eb;
}
.noticeLine {
  margin: 0;
  font-size: var(--font-body-02);
  line-height: 1.65;
  font-weight: 500;
  color: #6b7280;
}

/* ── 마무리 ─────────────────────────────────────────────── */
.closing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 100px 60px 110px;
  border-radius: 30px;
  background: linear-gradient(-10.99deg, #fff, #f9fbff 36.03%, #f2f8ff);
  border: 2px solid #d6e8fb;
  text-align: center;
}
.closingTitle {
  margin: 0;
  font-size: var(--font-title-01);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #002f5f;
}
.closingLead {
  margin: 0;
  max-width: 900px;
  font-size: var(--font-body-01);
  line-height: 1.6;
  font-weight: 500;
  color: #6b7280;
}

/* 창 끝까지 닿는 띠. 캔버스 좌우 여백(100px)을 넘어 뻗는다 — 다른 화면과 같다. */
.footer {
  margin-left: -100px;
  width: 2120px;
  height: 244px;
  background-color: #f3f3f3;
}
</style>
