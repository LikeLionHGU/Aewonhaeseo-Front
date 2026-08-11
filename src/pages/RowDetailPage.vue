<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import logo from '../assets/logo.png'
import { useDesignScale } from '../composables/useDesignScale'

const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 2940

const scale = useDesignScale(DESIGN_WIDTH)
const router = useRouter()

// 원본 데이터 행 표 — 행/구분선 간격이 원본에서 불규칙해 좌표를 그대로 쓴다.
const RAW_COL = {
  no: 105,
  date: 262,
  site: 531,
  type: 761,
  bod: 974,
  cod: 1204,
  temp: 1430,
  note: 1690,
}
const rawRows = [
  { top: 715, no: '401', date: '2025-07-10', site: '팔당호', type: '호소', bod: '2.1', cod: '4.0', temp: '26.8', note: '-' },
  { top: 795, no: '402', date: '2025-07-10', site: '한강대효', type: '하천', bod: '4.4', cod: '7.2', temp: '27.3', note: '강우 후' },
  { top: 879, no: '403', date: '2025-07-10', site: '시화호', type: '호소', bod: '3.0', cod: '6.1', temp: '27.9', note: '-' },
]
const rawDividers = [588, 681.75, 772, 856]

// 초과 판정 과정 — 네 단계 박스. 안쪽 텍스트는 모두 좌측 47px.
const verdictSteps = [
  { left: 93, width: 295, label: '원본 값', value: '4.4', note: '402행 · BOD 열', danger: false },
  { left: 471, width: 295, label: '단위 확인', value: 'mg/L', note: '변환 없음', danger: false },
  { left: 849, width: 295, label: '기준치', value: '3.0', note: '하천 등급', danger: false },
  { left: 1227, width: 334, label: '판정', value: '초과 +47%', note: '4.4+3.0=1.47', danger: true },
]
const arrowLeft = [411, 789, 1167]

// SQL 컬럼 ↔ 원본 컬럼 매핑 (행 간격 73px)
const MAPPING_TOP = 2229
const MAPPING_STEP = 73
const mappingRows = [
  { sqlCol: '측정일', origCol: '측정일자', badge: '자동 매핑', byHuman: false, confirm: '-' },
  { sqlCol: '측정지점', origCol: '지점명', badge: '자동 매핑', byHuman: false, confirm: '-' },
  { sqlCol: 'bod_mg_l', origCol: 'BOD', badge: '자동 매핑', byHuman: false, confirm: '-' },
  { sqlCol: '수계_구분', origCol: '구분', badge: '사람 확인', byHuman: true, confirm: '박서연 08-08 09:40' },
]
const mappingTop = (i: number) => MAPPING_TOP + i * MAPPING_STEP

const cardDividers = [1788, 2022, 2125, 2288, 2361, 2434]

// 쉬운 말 | SQL | 둘 다 — 선택 하이라이트가 해당 구간으로 이동한다.
const viewMode = ref<'쉬운 말' | 'SQL' | '둘 다'>('쉬운 말')
const VIEW_SEGMENT = {
  '쉬운 말': { left: 1475, width: 116, radius: '20px 0px 0px 20px' },
  SQL: { left: 1591, width: 117, radius: '0px' },
  '둘 다': { left: 1708, width: 112, radius: '0px 20px 20px 0px' },
} as const
</script>

<template>
  <div :class="$style.viewport" :style="{ height: `${DESIGN_HEIGHT * scale}px` }">
  <div :class="$style.div" :style="{ transform: `scale(${scale})` }">
    <b :class="[$style.b, 'clickable']" @click="router.push('/main')">내 데이터</b>
    <div :class="[$style.div2, 'clickable']" @click="router.push('/ask')">분석하기</div>
    <div :class="$style.div3">문의하기</div>
    <b :class="$style.mgl">2025-07-10 · 4.4mg/L의 근거</b>
    <div :class="[$style.caAaca4862A5402b585a54a82eParent, 'clickable']" @click="router.push('/')">
      <img :class="$style.caAaca4862A5402b585a54a82eIcon" :src="logo" alt="로고" />
      <b :class="$style.b2">물</b>
      <b :class="$style.b3">볼래</b>
      <b :class="$style.b4">ㅓ</b>
    </div>
    <div :class="$style.child" />
    <b :class="$style.b35">이 한 건이 어디서 왔고, 어떻게 초과로 판정됐는지 보여드려요</b>

    <!-- 원본 데이터 행 -->
    <div :class="$style.item" />
    <div :class="$style.inner" />
    <b :class="$style.xlsx">원본 데이터 행 - 인천_수질측정_2025.xlsx · 시트 “측정결과" · 402행</b>
    <div v-for="top in rawDividers" :key="top" :class="$style.divider" :style="{ top: `${top}px` }" />
    <b :class="$style.rawHead" :style="{ left: `${RAW_COL.no}px` }">원본 행</b>
    <b :class="$style.rawHead" :style="{ left: `${RAW_COL.date}px` }">측정일자</b>
    <b :class="$style.rawHead" :style="{ left: `${RAW_COL.site}px` }">지점명</b>
    <b :class="$style.rawHead" :style="{ left: `${RAW_COL.type}px` }">구분</b>
    <b :class="$style.rawHead" :style="{ left: `${RAW_COL.bod}px` }">BOD</b>
    <b :class="$style.rawHead" :style="{ left: `${RAW_COL.cod}px` }">COD</b>
    <b :class="$style.rawHead" :style="{ left: `${RAW_COL.temp}px` }">수온</b>
    <b :class="$style.rawHead" :style="{ left: `${RAW_COL.note}px` }">비고</b>
    <template v-for="row in rawRows" :key="row.no">
      <b :class="$style.rawCell" :style="{ top: `${row.top}px`, left: `${RAW_COL.no}px` }">{{ row.no }}</b>
      <b :class="$style.rawCell" :style="{ top: `${row.top}px`, left: `${RAW_COL.date}px` }">{{ row.date }}</b>
      <b :class="$style.rawCell" :style="{ top: `${row.top}px`, left: `${RAW_COL.site}px` }">{{ row.site }}</b>
      <b :class="$style.rawCell" :style="{ top: `${row.top}px`, left: `${RAW_COL.type}px` }">{{ row.type }}</b>
      <b :class="$style.rawCell" :style="{ top: `${row.top}px`, left: `${RAW_COL.bod}px` }">{{ row.bod }}</b>
      <b :class="$style.rawCell" :style="{ top: `${row.top}px`, left: `${RAW_COL.cod}px` }">{{ row.cod }}</b>
      <b :class="$style.rawCell" :style="{ top: `${row.top}px`, left: `${RAW_COL.temp}px` }">{{ row.temp }}</b>
      <b :class="$style.rawCell" :style="{ top: `${row.top}px`, left: `${RAW_COL.note}px` }">{{ row.note }}</b>
    </template>

    <!-- 초과 판정 과정 -->
    <div :class="$style.child17" />
    <b :class="$style.b61">이 값이 초과로 판정된 과정</b>
    <template v-for="step in verdictSteps" :key="step.label">
      <div :class="$style.stepBox" :style="{ left: `${step.left}px`, width: `${step.width}px` }">
        <div :class="step.danger ? $style.stepBoxBgDanger : $style.stepBoxBg" />
        <b :class="$style.stepLabel">{{ step.label }}</b>
        <b :class="[$style.stepValue, step.danger && $style.stepValueDanger]">{{ step.value }}</b>
        <div :class="$style.stepNote">{{ step.note }}</div>
      </div>
    </template>
    <div v-for="left in arrowLeft" :key="left" :class="$style.stepArrow" :style="{ left: `${left}px` }">→</div>
    <div :class="$style.divider" :style="{ top: '1386px' }" />
    <b :class="$style.mgl3">이 값은 7월 월평균 3.8mg/L 계산에도 포함됐어요 (7월 4건 중 1건)</b>

    <!-- 이 행을 가져온 조건 -->
    <div :class="$style.rectangleDiv" />
    <b :class="$style.b36">이 행을 가져온 조건</b>
    <div :class="$style.child9" />
    <div :class="$style.child10" />
    <div :class="$style.child11" :style="{
      left: `${VIEW_SEGMENT[viewMode].left}px`,
      width: `${VIEW_SEGMENT[viewMode].width}px`,
      borderRadius: VIEW_SEGMENT[viewMode].radius,
    }" />
    <b :class="[$style.b48, viewMode === '쉬운 말' ? $style.viewOn : $style.viewOff, 'clickable']"
       @click="viewMode = '쉬운 말'">쉬운 말</b>
    <b :class="[$style.sql2, viewMode === 'SQL' ? $style.viewOn : $style.viewOff, 'clickable']"
       @click="viewMode = 'SQL'">SQL</b>
    <b :class="[$style.b49, viewMode === '둘 다' ? $style.viewOn : $style.viewOff, 'clickable']"
       @click="viewMode = '둘 다'">둘 다</b>
    <div :class="$style.child12" />
    <b :class="$style.b50">쉬운 말로</b>
    <div :class="$style.bod3">한강대교 지점에서 2025년에 측정한 BOD 값 중, 기준치 3.0을 넘는 것만 골랐어요. 그 결과 7건이 나왔고, 이 행은 그 중 하나입니다.</div>
    <div :class="$style.child2" />
    <div v-for="top in cardDividers" :key="top" :class="$style.divider" :style="{ top: `${top}px` }" />
    <b :class="$style.b37">이 판정에 쓰인 컬럼</b>
    <b :class="$style.mapHead" :style="{ left: '105px' }">SQL 컬럼</b>
    <b :class="$style.mapHead" :style="{ left: '424px' }">원본 컬럼</b>
    <b :class="$style.mapHead" :style="{ left: '766px' }">매핑 양식</b>
    <b :class="[$style.mapHead, $style.mapHeadCenter]" :style="{ left: '1136px' }">확인자</b>
    <div :class="$style.child19" />
    <template v-for="(row, i) in mappingRows" :key="i">
      <b :class="$style.mapSqlCol" :style="{ top: `${mappingTop(i)}px` }">{{ row.sqlCol }}</b>
      <b :class="$style.mapOrigCol" :style="{ top: `${mappingTop(i)}px` }">{{ row.origCol }}</b>
      <div :class="$style.mapBadge" :style="{ top: `${mappingTop(i)}px` }">
        <div :class="row.byHuman ? $style.mapBadgeHuman : $style.mapBadgeAuto" />
        <b :class="[$style.mapBadgeText, row.byHuman && $style.mapBadgeTextHuman]">{{ row.badge }}</b>
      </div>
      <div :class="$style.mapConfirm" :style="{ top: `${mappingTop(i)}px` }">{{ row.confirm }}</div>
    </template>

    <div :class="$style.child8" />
    <div :class="[$style.div4, 'clickable']" @click="router.push('/evidence')">←</div>
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
  height: 2940px;
  position: relative;
  background-color: #f8f9fc;
  overflow: hidden;
  text-align: left;
  font-size: 25px;
  color: #6b7280;
  font-family: Pretendard;
  transform-origin: top left;
}
/* 근거 상세도 분석 흐름에 속하므로 현재 섹션은 "분석하기" 다.
   <b> 태그의 기본 굵기를 눌러 비활성으로 되돌린다. */
.b {
  position: absolute;
  top: 85px;
  left: calc(50% - 676px);
  font-weight: 500;
  color: #00559e;
  text-align: center;
}
.div2 {
  position: absolute;
  top: 85px;
  left: calc(50% - 528px);
  font-weight: 700;
  text-decoration: underline;
  color: #00559e;
  text-align: center;
}
.div3 {
  position: absolute;
  top: 85px;
  left: calc(50% - 386px);
  font-weight: 500;
  color: #00559e;
}
.mgl {
  position: absolute;
  top: 299px;
  left: calc(50% - 866px);
  font-size: 40px;
  color: #0053e3;
}
.caAaca4862A5402b585a54a82eParent {
  position: absolute;
  top: 82px;
  left: 50px;
  width: 144px;
  height: 35px;
  text-align: center;
  font-size: 30px;
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
.b2 {
  position: absolute;
  top: 0px;
  left: 0px;
  line-height: 35px;
}
.b3 {
  position: absolute;
  top: 0px;
  left: 81px;
  line-height: 35px;
}
.b4 {
  position: absolute;
  top: 0px;
  left: 51px;
  line-height: 35px;
}
.child {
  position: absolute;
  top: 50px;
  left: 1770px;
  border-radius: 50%;
  background-color: #d9d9d9;
  width: 100px;
  height: 100px;
}
.b35 {
  position: absolute;
  top: 364px;
  left: calc(50% - 866px);
  font-size: 26px;
  line-height: 45px;
}
.div4 {
  position: absolute;
  top: 210px;
  left: 50px;
  font-size: 40px;
  font-weight: 600;
  color: #00559e;
  text-align: center;
}
/* 카드 내부 가로 구분선 (원본은 빈 img) */
.divider {
  position: absolute;
  left: 51px;
  width: 1817px;
  height: 1px;
  background-color: #d1d5db;
}
/* ── 원본 데이터 행 ─────────────────────────── */
.item {
  position: absolute;
  top: 451px;
  left: 50px;
  border-radius: 20px;
  background-color: #fbfbfb;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1819px;
  height: 491px;
}
.inner {
  position: absolute;
  top: 453px;
  left: 52px;
  border-radius: 18px 18px 0px 0px;
  background-color: #f4f4f4;
  width: 1815px;
  height: 228px;
}
.xlsx {
  position: absolute;
  top: 494px;
  left: 105px;
  font-size: 30px;
  line-height: 45px;
  display: inline-block;
  width: 864px;
}
.rawHead {
  position: absolute;
  top: 617px;
}
.rawCell {
  position: absolute;
}
/* ── 초과 판정 과정 ─────────────────────────── */
.child17 {
  position: absolute;
  top: 973px;
  left: 48px;
  border-radius: 20px;
  background-color: #fbfbfb;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1819px;
  height: 560px;
}
.b61 {
  position: absolute;
  top: 1020px;
  left: 105px;
  font-size: 30px;
  line-height: 45px;
  display: inline-block;
  width: 864px;
}
.stepBox {
  position: absolute;
  top: 1119px;
  height: 196px;
  font-size: 26px;
  color: #00559e;
}
.stepBoxBg {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 20px;
  background-color: rgba(214, 232, 250, 0.3);
  border: 2px solid #d6e8fb;
  box-sizing: border-box;
  width: 295px;
  height: 196px;
}
.stepBoxBgDanger {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 20px;
  background-color: rgba(255, 0, 0, 0.06);
  border: 2px solid #ff0000;
  box-sizing: border-box;
  width: 295px;
  height: 196px;
}
.stepLabel {
  position: absolute;
  top: 19px;
  left: 47px;
  line-height: 45px;
}
.stepValue {
  position: absolute;
  top: 72px;
  left: 47px;
  font-size: 40px;
  color: #000;
  white-space: nowrap;
}
.stepValueDanger {
  color: #ff0000;
}
.stepNote {
  position: absolute;
  top: 132px;
  left: 47px;
  line-height: 45px;
  font-weight: 500;
  color: #6b7280;
  white-space: nowrap;
}
.stepArrow {
  position: absolute;
  top: 1195px;
  font-size: 40px;
  line-height: 45px;
  font-weight: 500;
  color: #d9d9d9;
  display: inline-block;
  width: 37px;
}
.mgl3 {
  position: absolute;
  top: 1435px;
  left: 105px;
  font-size: 30px;
  line-height: 45px;
  display: inline-block;
  width: 864px;
}
/* ── 이 행을 가져온 조건 ────────────────────── */
.rectangleDiv {
  position: absolute;
  top: 1663px;
  left: 50px;
  border-radius: 20px;
  background-color: #f4f4f4;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1819px;
  height: 845px;
}
.b36 {
  position: absolute;
  top: 1702px;
  left: 105px;
  font-size: 30px;
  line-height: 45px;
  display: inline-block;
  width: 398px;
}
.child9 {
  position: absolute;
  top: 1694px;
  left: 1475px;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 345px;
  height: 62px;
}
.child10 {
  position: absolute;
  top: 1694px;
  left: 1475px;
  border-radius: 20px 0px 0px 20px;
  background-color: #f8f9fc;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 233px;
  height: 62px;
}
.child11 {
  position: absolute;
  top: 1694px;
  left: 1475px;
  border-radius: 20px 0px 0px 20px;
  background-color: #6b7280;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 116px;
  height: 62px;
}
.b48 {
  position: absolute;
  top: 1702px;
  left: 1505px;
  font-size: 20px;
  line-height: 45px;
}
/* 선택된 항목은 어두운 배경 위라 흰 글씨 */
.viewOn {
  color: #fff;
}
.viewOff {
  color: #6b7280;
}
.sql2 {
  position: absolute;
  top: 1702px;
  left: 1628px;
  font-size: 20px;
  line-height: 45px;
}
.b49 {
  position: absolute;
  top: 1702px;
  left: 1742px;
  font-size: 20px;
  line-height: 45px;
}
.child12 {
  position: absolute;
  top: 1789px;
  left: 52px;
  background-color: #eff5fe;
  width: 1815px;
  height: 230px;
}
.b50 {
  position: absolute;
  top: 1822px;
  left: 105px;
  line-height: 45px;
  color: #42a8ff;
}
.bod3 {
  position: absolute;
  top: 1884px;
  left: 105px;
  font-size: 30px;
  line-height: 45px;
  color: #000;
}
.child2 {
  position: absolute;
  top: 2213px;
  left: 52px;
  border-radius: 0px 0px 18px 18px;
  background-color: #fbfbfb;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1817px;
  height: 294px;
}
.b37 {
  position: absolute;
  top: 2053px;
  left: 105px;
  font-size: 30px;
  line-height: 45px;
  display: inline-block;
  width: 607px;
}
.mapHead {
  position: absolute;
  top: 2142px;
  font-size: 30px;
  line-height: 45px;
  display: inline-block;
  width: 126px;
}
.mapHeadCenter {
  text-align: center;
}
/* 마지막 매핑 행(사람 확인)만 배경 강조 */
.child19 {
  position: absolute;
  top: 2435px;
  left: 54px;
  border-radius: 0px 0px 18px 18px;
  background-color: #eff5fe;
  width: 1813px;
  height: 71px;
}
.mapSqlCol {
  position: absolute;
  left: 105px;
  font-size: 30px;
  line-height: 45px;
  display: inline-block;
  color: #000;
  width: 196px;
}
.mapOrigCol {
  position: absolute;
  left: 424px;
  font-size: 30px;
  line-height: 45px;
  display: inline-block;
  color: #000;
  width: 126px;
}
.mapBadge {
  position: absolute;
  left: 764px;
  width: 131px;
  height: 45px;
  font-size: 20px;
}
.mapBadgeAuto {
  position: absolute;
  top: 3px;
  left: 0px;
  border-radius: 20px;
  background-color: #d9d9d9;
  width: 131px;
  height: 39px;
}
.mapBadgeHuman {
  position: absolute;
  top: 3px;
  left: 0px;
  border-radius: 20px;
  background-color: #e2f8f0;
  width: 131px;
  height: 39px;
}
.mapBadgeText {
  position: absolute;
  top: 0px;
  left: 28px;
  line-height: 45px;
}
.mapBadgeTextHuman {
  color: #00a26a;
}
/* "-" 와 "박서연 08-08 09:40" 이 같은 중심에 오도록 넓게 잡고 가운데 정렬 */
.mapConfirm {
  position: absolute;
  left: 1057px;
  font-size: 30px;
  line-height: 45px;
  color: #000;
  text-align: center;
  display: inline-block;
  width: 284px;
}
.child8 {
  position: absolute;
  top: 2696px;
  left: 0px;
  background-color: #f3f3f3;
  width: 1920px;
  height: 244px;
}
</style>
