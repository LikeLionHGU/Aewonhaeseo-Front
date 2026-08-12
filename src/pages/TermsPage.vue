<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import logo from '../assets/logo.png'
import checkIcon from '../assets/check.svg'
import { useDesignScale } from '../composables/useDesignScale'

const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 2894

const { scale, offsetX } = useDesignScale(DESIGN_WIDTH)
const router = useRouter()

const stepConnectors = [
  { left: 231, width: 643 },
  { left: 1046, width: 666 },
]

// 확인 필요 목록 — band 는 선택 하이라이트가 덮는 영역.
type BadgeKind = 'low' | 'none' | 'done'
const pendingColumns = ref<{
  name: string
  file: string
  left: number
  nameTop: number
  fileTop: number
  badgeTop: number
  badgeLeft: number
  badgeLabel: string
  badgeKind: BadgeKind
  band: { top: number; height: number }
}[]>([
  {
    name: '구분', file: '인천_수질측정_2025.xlsx', left: 100,
    nameTop: 1090, fileTop: 1126, badgeTop: 1103, badgeLeft: 411,
    badgeLabel: '확신 낮음', badgeKind: 'low', band: { top: 1070, height: 119 },
  },
  {
    name: '비고2', file: '인천_수질측정_2025.xlsx', left: 98,
    nameTop: 1217, fileTop: 1253, badgeTop: 1230, badgeLeft: 409,
    badgeLabel: '매칭 없음', badgeKind: 'none', band: { top: 1191, height: 128 },
  },
  {
    name: 'T-N(mg/L)', file: '제주_수질측정_2025.xslx', left: 98,
    nameTop: 1338, fileTop: 1374, badgeTop: 1351, badgeLeft: 409,
    badgeLabel: '확신 낮음', badgeKind: 'low', band: { top: 1321, height: 127 },
  },
  {
    name: 'BOD', file: '제주_수질측정_2025.xslx', left: 98,
    nameTop: 1472, fileTop: 1508, badgeTop: 1485, badgeLeft: 409,
    badgeLabel: '확인함', badgeKind: 'done', band: { top: 1450, height: 134 },
  },
])
const selected = ref(0)
const listDividers = [1190, 1320, 1449]

// "맞아요" → 현재 항목을 확인함으로 바꾸고 다음 미확인 항목으로.
// 남은 게 없으면 완료 화면으로 넘어간다.
function acceptSuggestion() {
  const current = pendingColumns.value[selected.value]
  current.badgeKind = 'done'
  current.badgeLabel = '확인함'

  const next = pendingColumns.value.findIndex((c) => c.badgeKind !== 'done')
  if (next === -1) router.push('/terms-done')
  else selected.value = next
}

// 실제 값 미리보기 — 헤더와 값의 좌표가 원본에서 조금 다르다.
const previewCols = [
  { header: '측정일', headerLeft: 802, valueLeft: 798 },
  { header: '지점명', headerLeft: 1094, valueLeft: 1094 },
  { header: '구분', headerLeft: 1316, valueLeft: 1316 },
  { header: 'BOD', headerLeft: 1568, valueLeft: 1568 },
]
const previewRows = [
  { top: 1441, values: ['2025-01-15', '한강대교', '하천', '1.8'] },
  { top: 1554, values: ['2025-01-15', '팔당호', '호소', '1.2'] },
  { top: 1673, values: ['2025-02-15', '한강대교', '하천', '2.1'] },
]
const previewDividers = [1509, 1628]
</script>

<template>
  <div :class="$style.viewport" :style="{ height: `${DESIGN_HEIGHT * scale}px` }">
  <div :class="$style.div" :style="{ transform: `translateX(${offsetX}px) scale(${scale})` }">
    <b :class="[$style.b, 'link']" @click="router.push('/data')">내 데이터</b>
    <div :class="[$style.div2, 'link']" @click="router.push('/ask')">분석하기</div>
    <div :class="$style.div3">문의하기</div>
    <div :class="[$style.caAaca4862A5402b585a54a82eParent, 'link']" @click="router.push('/')">
      <img :class="$style.caAaca4862A5402b585a54a82eIcon" :src="logo" alt="로고" />
      <b :class="$style.b5">물</b>
      <b :class="$style.b6">볼래</b>
      <b :class="$style.b7">ㅓ</b>
    </div>
    <div :class="$style.profile" />
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
      <span :class="$style.span">97개 중 96개 매핑 완료, </span>
      <span :class="$style.span2">1개 확인 필요</span>
    </b>
    <div :class="$style.v09">인천 · 제주 파일 합계 · 사전 v0.9 기준</div>

    <!-- 왼쪽: 확인 필요 목록 -->
    <div :class="$style.listCard" />
    <div :class="$style.listHeaderBg" />
    <b :class="$style.b24">확인 필요 목록</b>
    <div :class="$style.listSelected"
         :style="{ top: `${pendingColumns[selected].band.top}px`, height: `${pendingColumns[selected].band.height}px` }" />
    <div v-for="top in listDividers" :key="top" :class="$style.listDivider" :style="{ top: `${top}px` }" />
    <template v-for="(col, i) in pendingColumns" :key="col.name">
      <b :class="[$style.listName, 'link']"
         :style="{ top: `${col.nameTop}px`, left: `${col.left}px` }" @click="selected = i">{{ col.name }}</b>
      <div :class="[$style.listFile, 'link']"
           :style="{ top: `${col.fileTop}px`, left: `${col.left}px` }" @click="selected = i">{{ col.file }}</div>
      <div :class="$style.badge" :style="{ top: `${col.badgeTop}px`, left: `${col.badgeLeft}px` }">
        <div :class="{
          [$style.badgeBgLow]: col.badgeKind === 'low',
          [$style.badgeBgNone]: col.badgeKind === 'none',
          [$style.badgeBgDone]: col.badgeKind === 'done',
        }" />
        <b :class="{
          [$style.badgeLabel]: true,
          [$style.badgeLabelLow]: col.badgeKind === 'low',
          [$style.badgeLabelNone]: col.badgeKind === 'none',
          [$style.badgeLabelDone]: col.badgeKind === 'done',
        }">{{ col.badgeLabel }}</b>
      </div>
    </template>

    <!-- 오른쪽: 이 컬럼은 무엇인가요? -->
    <div :class="$style.detailCard" />
    <b :class="$style.b25">이 컬럼은 무엇인가요?</b>
    <b :class="$style.b3">구분</b>
    <div :class="$style.xlsxC">인천_수질측정_2025.xlsx · C열 · 텍스트 · 값 1,240개</div>

    <!-- 실제 값 미리보기 -->
    <div :class="$style.previewCard" />
    <div :class="$style.previewHeaderBg" />
    <b :class="$style.b13">실제 값 미리보기</b>
    <div :class="$style.previewColHeaderBg" />
    <div :class="$style.previewColHighlight" />
    <b v-for="col in previewCols" :key="col.header" :class="$style.previewHead"
       :style="{ left: `${col.headerLeft}px` }">{{ col.header }}</b>
    <div v-for="top in previewDividers" :key="top" :class="$style.previewDivider" :style="{ top: `${top}px` }" />
    <template v-for="row in previewRows" :key="row.top">
      <div v-for="(value, c) in row.values" :key="c" :class="$style.previewCell"
           :style="{ top: `${row.top}px`, left: `${previewCols[c].valueLeft}px` }">{{ value }}</div>
    </template>
    <div :class="$style.previewFooterBg" />
    <b :class="$style.b14">값 종류 2개 - 하천 812개 (65%) · 호소 426개(35%)</b>

    <!-- 추천 용어 -->
    <b :class="$style.b26">추천 용어</b>
    <div :class="$style.suggestCard" />
    <b :class="$style.b4">수계 구분</b>
    <div :class="$style.badge" :style="{ top: '2025px', left: '1579px' }">
      <div :class="$style.badgeBgConfidence" />
      <b :class="[$style.badgeLabel, $style.badgeLabelConfidence]">확신도 62%</b>
    </div>
    <div :class="$style.div16">표준 사전 ·  하천/호소/해역을 나누는 분류 항목</div>

    <!-- 액션 -->
    <div :class="[$style.actionPrimary, 'btn']" role="button" @click="acceptSuggestion">
      <div :class="[$style.actionPrimaryBg, 'btn-fill']" />
      <b :class="$style.actionPrimaryLabel">맞아요</b>
    </div>
    <div :class="[$style.actionSecondary, 'btn']" role="button" :style="{ left: '1180px' }">
      <div :class="[$style.actionSecondaryBg, 'btn-outline']" />
      <b :class="$style.actionSecondaryLabel">아니에요</b>
    </div>
    <div :class="[$style.actionSecondary, 'btn']" role="button" :style="{ left: '1504.21px' }">
      <div :class="[$style.actionSecondaryBg, 'btn-outline']" />
      <b :class="$style.actionSecondaryLabel">다른 항목 선택</b>
    </div>

    <div :class="$style.child19" />
    <div :class="[$style.div17, 'link']" @click="router.push('/mapping')">←</div>
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
.caAaca4862A5402b585a54a82eParent {
  position: absolute;
  font-size: var(--font-body-01);
  top: 82px;
  left: 50px;
  width: 144px;
  height: 35px;
  text-align: center;
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
.b5 {
  position: absolute;
  top: 0px;
  left: 0px;
  line-height: 35px;
}
.b6 {
  position: absolute;
  top: 0px;
  left: 81px;
  line-height: 35px;
}
.b7 {
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
.v09 {
  position: absolute;
  top: 785px;
  left: 103px;
  font-size: var(--font-body-03);
  line-height: 45px;
  font-weight: 500;
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
.listName {
  position: absolute;
  font-size: var(--font-body-02);
  line-height: 36px;
  color: #000;
}
.listFile {
  position: absolute;
  font-size: var(--font-body-03);
  line-height: 45px;
  font-weight: 500;
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
.badgeLabel {
  position: absolute;
  top: 0px;
  left: 25.19px;
  line-height: 45px;
  display: inline-block;
  width: 108.8px;
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
  font-size: var(--font-body-01);
  line-height: 54px;
  color: #0053e3;
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
.previewHead {
  position: absolute;
  line-height: 36px;
  top: 1343px;
  display: inline-block;
  width: 86px;
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
  width: 170px;
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
.b14 {
  position: absolute;
  line-height: 36px;
  top: 1771px;
  left: 802px;
  display: inline-block;
  width: 718px;
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
  font-size: var(--font-body-01);
  line-height: 54px;
  color: #0053e3;
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
.child19 {
  position: absolute;
  top: 2650px;
  left: -100px;
  background-color: #f3f3f3;
  width: 2120px;
  height: 244px;
}
</style>
