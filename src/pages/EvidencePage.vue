<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import logo from '../assets/logo.png'
import { useDesignScale } from '../composables/useDesignScale'

const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 4143

const scale = useDesignScale(DESIGN_WIDTH)
const router = useRouter()

// 카드 안을 가로지르는 구분선들 — 원본은 전부 빈 <img> 였다.
const dividers = [634, 832, 1176, 2276, 2379, 2542, 2615, 2688]

// 쉬운 말 | SQL | 둘 다 — 선택 하이라이트가 해당 구간으로 이동한다.
const viewMode = ref<'쉬운 말' | 'SQL' | '둘 다'>('쉬운 말')
const VIEW_SEGMENT = {
  '쉬운 말': { left: 1475, width: 116, radius: '20px 0px 0px 20px' },
  SQL: { left: 1591, width: 117, radius: '0px' },
  '둘 다': { left: 1708, width: 112, radius: '0px 20px 20px 0px' },
} as const

// SQL 컬럼 ↔ 원본 컬럼 매핑 표 (행 간격 73px)
const MAPPING_TOP = 2483
const MAPPING_STEP = 73
const mappingRows = [
  { sqlCol: '측정일', origCol: '측정일자', badge: '자동 매핑', byHuman: false, confirm: '-' },
  { sqlCol: '측정지점', origCol: '지점명', badge: '자동 매핑', byHuman: false, confirm: '-' },
  { sqlCol: 'bod_mg_l', origCol: 'BOD', badge: '자동 매핑', byHuman: false, confirm: '-' },
  { sqlCol: '수계_구분', origCol: '구분', badge: '사람 확인', byHuman: true, confirm: '박서연 08-08 09:40' },
]
const mappingTop = (i: number) => MAPPING_TOP + i * MAPPING_STEP

// 원본 데이터 행 표 (행 간격 104px)
const RAW_TOP = 3061
const RAW_STEP = 104
const RAW_COL = {
  no: 120,
  date: 298,
  site: 518,
  type: 819,
  bod: 1121,
  temp: 1375,
  vs: 1687,
  vsOver: 1673,
}
const rawRows = [
  { no: '12', date: '1.8', site: '한강대교', type: '하천', bod: '1.5', temp: '4.2', vs: '이내', over: false },
  { no: '37', date: '1.8', site: '한강대교', type: '하천', bod: '1.8', temp: '3.9', vs: '이내', over: false },
  { no: '61', date: '1.8', site: '한강대교', type: '하천', bod: '2.1', temp: '4.5', vs: '이내', over: false },
  { no: '88', date: '1.8', site: '한강대교', type: '하천', bod: '1.8', temp: '5.1', vs: '이내', over: false },
  { no: '114', date: '1.8', site: '한강대교', type: '하천', bod: '1.9', temp: '5.8', vs: '이내', over: false },
  { no: '402', date: '1.8', site: '한강대교', type: '하천', bod: '4.4', temp: '27.3', vs: '+47%', over: true },
  { no: '428', date: '1.8', site: '한강대교', type: '하천', bod: '3.6', temp: '28.1', vs: '+20%', over: true },
]
const rawTop = (i: number) => RAW_TOP + i * RAW_STEP
// 표 안 행 구분선 — 헤더 아래 한 줄 + 각 행 아래 70px 지점.
const rawDividers = [2929, ...rawRows.slice(0, -1).map((_, i) => rawTop(i) + 70)]
const firstOverRow = rawRows.findIndex((r) => r.over)
const rawHighlight = {
  top: rawTop(firstOverRow) - 34,
  height: (rawRows.length - firstOverRow) * RAW_STEP,
}
</script>

<template>
  <div :class="$style.viewport" :style="{ height: `${DESIGN_HEIGHT * scale}px` }">
  <div :class="$style.div" :style="{ transform: `scale(${scale})` }">
    <b :class="[$style.b, 'link']" @click="router.push('/main')">내 데이터</b>
    <div :class="[$style.div2, 'link']" @click="router.push('/ask')">분석하기</div>
    <div :class="$style.div3">문의하기</div>
    <b :class="$style.b2">이 결과가 나온 근거</b>
    <div :class="[$style.caAaca4862A5402b585a54a82eParent, 'link']" @click="router.push('/')">
      <img :class="$style.caAaca4862A5402b585a54a82eIcon" :src="logo" alt="로고" />
      <b :class="$style.b3">물</b>
      <b :class="$style.b4">볼래</b>
      <b :class="$style.b5">ㅓ</b>
    </div>
    <div :class="$style.child" />
    <b :class="$style.b17">질문이 어떻게 해석되고, 어떤 데이터에서 어떻게 계산됐는지 전부 볼 수 있어요.</b>

    <!-- ① 질문 → ② 해석 → ③ 데이터 요약 카드 -->
    <div :class="$style.inner" />
    <div v-for="top in dividers" :key="top" :class="$style.divider" :style="{ top: `${top}px` }" />
    <div :class="$style.ellipseParent">
      <div :class="$style.ellipseDiv" />
      <b :class="$style.b31">1</b>
    </div>
    <b :class="$style.b34">사용자 질문</b>
    <b :class="$style.bod3">“작년 인천 지점 BOD 월별 추이 보여줘"</b>
    <div :class="$style.ellipseGroup">
      <div :class="$style.ellipseDiv" />
      <b :class="$style.b32">2</b>
    </div>
    <b :class="$style.b35">시스템 해석</b>
    <div :class="$style.rectangleParent">
      <div :class="$style.groupChild" />
      <div :class="$style.div4">즉청 지점: 한강 수계</div>
    </div>
    <div :class="$style.rectangleContainer">
      <div :class="$style.groupInner" />
      <div :class="$style.bod">측정 항목: BOD</div>
    </div>
    <div :class="$style.groupDiv">
      <div :class="$style.groupChild2" />
      <div :class="$style.div5">기간:2025-01-01 ~ 2025-12-31</div>
    </div>
    <div :class="$style.rectangleParent2">
      <div :class="$style.groupInner" />
      <div :class="$style.div6">집계 단위: 월별 평균</div>
    </div>
    <div :class="$style.rectangleGroup">
      <div :class="$style.groupItem" />
      <div :class="$style.mgl">하천 등급 3.0mg/L</div>
    </div>
    <div :class="$style.ellipseContainer">
      <div :class="$style.ellipseDiv" />
      <b :class="$style.b32">3</b>
    </div>
    <b :class="$style.b36">사용한 데이터</b>
    <b :class="$style.xlsx">인천_수질측정_2025.xlsx · 시트 “측정결과" · 1,240행 중 조건에 맞는 46행</b>

    <!-- 생성된 SQL 카드 -->
    <div :class="$style.rectangleDiv" />
    <b :class="$style.sql">생성된 SQL</b>
    <div :class="$style.child19" />
    <div :class="$style.child20" />
    <div :class="$style.child21" :style="{
      left: `${VIEW_SEGMENT[viewMode].left}px`,
      width: `${VIEW_SEGMENT[viewMode].width}px`,
      borderRadius: VIEW_SEGMENT[viewMode].radius,
    }" />
    <b :class="[$style.b37, viewMode === '쉬운 말' ? $style.viewOn : $style.viewOff, 'link']"
       @click="viewMode = '쉬운 말'">쉬운 말</b>
    <b :class="[$style.sql4, viewMode === 'SQL' ? $style.viewOn : $style.viewOff, 'link']"
       @click="viewMode = 'SQL'">SQL</b>
    <b :class="[$style.b38, viewMode === '둘 다' ? $style.viewOn : $style.viewOff, 'link']"
       @click="viewMode = '둘 다'">둘 다</b>
    <div :class="$style.child22" />
    <b :class="$style.b39">쉬운 말로</b>
    <div :class="$style.bodContainer">
      <span :class="$style.span">인천 </span>
      <b :class="$style.span">한강대교</b>
      <span :class="$style.span"> 지점의 </span>
      <b :class="$style.span">2025년</b>
      <span :class="$style.span"> BOD 측정값을 가져와, </span>
      <b :class="$style.span">월별로 평균</b>
      <span :class="$style.span">을 냈어요. 그리고 각 월 평균이 기준치 </span>
      <b :class="$style.span">3.0 mg/L</b>
      <span :class="$style.span">를 넘는지 표시했어요. <br/>측정값이 비어 있는 행은 평균에서 제외했습니다.</span>
    </div>
    <div :class="$style.sqlBlock">
      <div :class="$style.sqlLine"><span :class="$style.sqlComment">-- 규칙 v1.3 · 사전 v1.0 으로 생성됨</span></div>
      <div :class="$style.sqlLine"><span :class="$style.sqlKeyword">SELECT</span></div>
      <div :class="[$style.sqlLine, $style.sqlSelectRow]">
        <span>DATE_TRUNC(<span :class="$style.sqlString">'month'</span>, 측정일)</span>
        <span><span :class="$style.sqlKeyword">AS</span> 월,</span>
      </div>
      <div :class="[$style.sqlLine, $style.sqlSelectRow]">
        <span>ROUND(AVG(bod_mg_l), 1)</span>
        <span><span :class="$style.sqlKeyword">AS</span> bod_평균,</span>
      </div>
      <div :class="[$style.sqlLine, $style.sqlSelectRow]">
        <span>COUNT(bod_mg_l)</span>
        <span><span :class="$style.sqlKeyword">AS</span> 측정_건수,</span>
      </div>
      <div :class="[$style.sqlLine, $style.sqlSelectRow]">
        <span>AVG(bod_mg_l) &gt; 3.0</span>
        <span><span :class="$style.sqlKeyword">AS</span> 기준_초과</span>
      </div>
      <div :class="[$style.sqlLine, $style.sqlClauseRow]">
        <span :class="$style.sqlKeyword">FROM</span><span>측정결과</span>
      </div>
      <div :class="[$style.sqlLine, $style.sqlClauseRow]">
        <span :class="$style.sqlKeyword">WHERE</span><span>측정지점 = <span :class="$style.sqlString">'한강대교'</span></span>
      </div>
      <div :class="[$style.sqlLine, $style.sqlClauseRow]">
        <span :class="[$style.sqlKeyword, $style.sqlAndIndent]">AND</span><span>측정일 <span :class="$style.sqlKeyword">BETWEEN</span> <span :class="$style.sqlString">'2025-01-01'</span> <span :class="$style.sqlKeyword">AND</span> <span :class="$style.sqlString">'2025-12-31'</span></span>
      </div>
      <div :class="[$style.sqlLine, $style.sqlClauseRow]">
        <span :class="[$style.sqlKeyword, $style.sqlAndIndent]">AND</span><span>bod_mg_l <span :class="$style.sqlKeyword">IS NOT NULL</span><span :class="$style.sqlTrailComment">-- 결측 제외</span></span>
      </div>
      <div :class="$style.sqlLine"><span :class="$style.sqlKeyword">GROUP BY</span> 1</div>
      <div :class="$style.sqlLine"><span :class="$style.sqlKeyword">ORDER BY</span> 1;</div>
    </div>

    <!-- SQL 컬럼 ↔ 원본 컬럼 매핑 -->
    <div :class="$style.child2" />
    <b :class="$style.sql2">이 SQL이 쓴 컬럼이 원본 파일의 어느 컬럼인지</b>
    <b :class="$style.sql3">SQL 컬럼</b>
    <b :class="$style.b28">원본 컬럼</b>
    <b :class="$style.b29">매핑 양식</b>
    <b :class="$style.b30">확인자</b>
    <template v-for="(row, i) in mappingRows" :key="i">
      <b :class="$style.mapSqlCol" :style="{ top: `${mappingTop(i)}px` }">{{ row.sqlCol }}</b>
      <b :class="$style.mapOrigCol" :style="{ top: `${mappingTop(i)}px` }">{{ row.origCol }}</b>
      <div :class="$style.mapBadge" :style="{ top: `${mappingTop(i)}px` }">
        <div :class="row.byHuman ? $style.mapBadgeHuman : $style.mapBadgeAuto" />
        <b :class="[$style.mapBadgeText, row.byHuman && $style.mapBadgeTextHuman]">{{ row.badge }}</b>
      </div>
      <div :class="$style.mapConfirm" :style="{ top: `${mappingTop(i)}px` }">{{ row.confirm }}</div>
    </template>

    <!-- 원본 데이터 행 -->
    <b :class="$style.b18">원본 데이터 행 · 조건 맞는 46행 중 앞 8행</b>
    <div :class="$style.child10" />
    <div :class="$style.item" />
    <div :class="$style.child23"
         :style="{ top: `${rawHighlight.top}px`, height: `${rawHighlight.height}px` }" />
    <div v-for="top in rawDividers" :key="top" :class="$style.rawDivider" :style="{ top: `${top}px` }" />
    <b :class="$style.rawHead" :style="{ left: `${RAW_COL.no}px` }">원본 행</b>
    <b :class="$style.rawHead" :style="{ left: `${RAW_COL.date}px` }">측정일자</b>
    <b :class="$style.rawHead" :style="{ left: '516px' }">지점명</b>
    <b :class="$style.rawHead" :style="{ left: `${RAW_COL.type}px` }">구분</b>
    <b :class="$style.rawHead" :style="{ left: `${RAW_COL.bod}px` }">BOD</b>
    <b :class="$style.rawHead" :style="{ left: `${RAW_COL.temp}px` }">수온</b>
    <b :class="$style.rawHead" :style="{ left: '1673px' }">기준 3.0</b>
    <template v-for="(row, i) in rawRows" :key="i">
      <b :class="$style.rawNo" :style="{ top: `${rawTop(i)}px`, left: `${RAW_COL.no}px` }">{{ row.no }}</b>
      <div :class="$style.rawCell" :style="{ top: `${rawTop(i)}px`, left: `${RAW_COL.date}px` }">{{ row.date }}</div>
      <div :class="$style.rawCell" :style="{ top: `${rawTop(i)}px`, left: `${RAW_COL.site}px` }">{{ row.site }}</div>
      <div :class="$style.rawCell" :style="{ top: `${rawTop(i)}px`, left: `${RAW_COL.type}px` }">{{ row.type }}</div>
      <component :is="row.over ? 'b' : 'div'"
                 :class="row.over ? $style.rawCellOver : $style.rawCell"
                 :style="{ top: `${rawTop(i)}px`, left: `${RAW_COL.bod}px` }">{{ row.bod }}</component>
      <div :class="$style.rawCell" :style="{ top: `${rawTop(i)}px`, left: `${RAW_COL.temp}px` }">{{ row.temp }}</div>
      <!-- 기준 대비: 초과 행만 빨간 25px, 3px 아래로 -->
      <b v-if="row.over" :class="$style.rawVsOver"
         :style="{ top: `${rawTop(i) + 3}px`, left: `${RAW_COL.vsOver}px` }">{{ row.vs }}</b>
      <div v-else :class="$style.rawCell"
           :style="{ top: `${rawTop(i)}px`, left: `${RAW_COL.vs}px` }">{{ row.vs }}</div>
      <!-- 초과 행은 행 전체를 눌러 상세로 들어간다 -->
      <div v-if="row.over" :class="[$style.rawRowHit, 'row-hit']" role="button"
           :style="{ top: `${rawTop(i) - 34}px` }" @click="router.push('/row-detail')" />
    </template>

    <div :class="$style.child18" />
    <div :class="[$style.div37, 'link']" @click="router.push('/results')">←</div>
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
  height: 4143px;
  position: relative;
  background-color: #f8f9fc;
  overflow: hidden;
  text-align: left;
  font-size: 30px;
  color: #6b7280;
  font-family: Pretendard;
  transform-origin: top left;
}
/* 근거 화면은 분석 흐름에 속하므로 현재 섹션은 "분석하기" 다.
   <b> 태그의 기본 굵기를 눌러 비활성으로 되돌린다. */
.b {
  position: absolute;
  top: 85px;
  left: calc(50% - 676px);
  font-size: 25px;
  font-weight: 500;
  color: #00559e;
  text-align: center;
}
.div2 {
  position: absolute;
  top: 85px;
  left: calc(50% - 528px);
  font-size: 25px;
  font-weight: 700;
  text-decoration: underline;
  color: #00559e;
  text-align: center;
}
.div3 {
  position: absolute;
  top: 85px;
  left: calc(50% - 386px);
  font-size: 25px;
  font-weight: 500;
  color: #00559e;
}
.b2 {
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
.child {
  position: absolute;
  top: 50px;
  left: 1770px;
  border-radius: 50%;
  background-color: #d9d9d9;
  width: 100px;
  height: 100px;
}
.b17 {
  position: absolute;
  top: 364px;
  left: calc(50% - 866px);
  font-size: 26px;
  line-height: 45px;
}
.inner {
  position: absolute;
  top: 451px;
  left: 50px;
  border-radius: 20px;
  background-color: #fbfbfb;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1819px;
  height: 560px;
}
/* 카드 내부 가로 구분선 (원본은 빈 img) */
.divider {
  position: absolute;
  left: 50px;
  width: 1819px;
  height: 1px;
  background-color: #d1d5db;
}
.ellipseParent {
  position: absolute;
  top: 498px;
  left: 94px;
  width: 45px;
  height: 45px;
  font-size: 25px;
}
.ellipseDiv {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 50%;
  background-color: #e4e4e4;
  width: 45px;
  height: 45px;
}
.b31 {
  position: absolute;
  top: 0px;
  left: 16px;
  line-height: 45px;
}
.ellipseGroup {
  position: absolute;
  top: 674px;
  left: 94px;
  width: 45px;
  height: 45px;
  text-align: center;
  font-size: 25px;
}
.b32 {
  position: absolute;
  top: 0px;
  left: 14px;
  line-height: 45px;
}
.ellipseContainer {
  position: absolute;
  top: 872px;
  left: 93px;
  width: 45px;
  height: 45px;
  text-align: center;
  font-size: 25px;
}
.b34 {
  position: absolute;
  top: 498px;
  left: 169px;
  font-size: 25px;
  line-height: 45px;
}
.b35 {
  position: absolute;
  top: 674px;
  left: 169px;
  font-size: 25px;
  line-height: 45px;
}
.b36 {
  position: absolute;
  top: 872px;
  left: 168px;
  font-size: 25px;
  line-height: 45px;
}
.bod3 {
  position: absolute;
  top: 543px;
  left: 169px;
  line-height: 45px;
  color: #000;
}
.xlsx {
  position: absolute;
  top: 916px;
  left: 168px;
  line-height: 45px;
  color: #000;
}
.rectangleParent {
  position: absolute;
  top: 736px;
  left: 169px;
  width: 279px;
  height: 54px;
  font-size: 20px;
  color: #455772;
}
.groupChild {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d0d0d0;
  box-sizing: border-box;
  width: 279px;
  height: 54px;
}
.div4 {
  position: absolute;
  top: 5px;
  left: 60px;
  line-height: 45px;
  font-weight: 600;
}
.rectangleGroup {
  position: absolute;
  top: 738px;
  left: 1404px;
  width: 259px;
  height: 54px;
  font-size: 20px;
  color: #455772;
}
.groupItem {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d0d0d0;
  box-sizing: border-box;
  width: 259px;
  height: 54px;
}
.mgl {
  position: absolute;
  top: 5px;
  left: 51px;
  line-height: 45px;
  font-weight: 600;
}
.rectangleContainer {
  position: absolute;
  top: 736px;
  left: 461px;
  width: 251px;
  height: 54px;
  font-size: 20px;
  color: #455772;
}
.groupInner {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d0d0d0;
  box-sizing: border-box;
  width: 251px;
  height: 54px;
}
.bod {
  position: absolute;
  top: 5px;
  left: 63px;
  line-height: 45px;
  font-weight: 600;
}
.groupDiv {
  position: absolute;
  top: 736px;
  left: 725px;
  width: 402px;
  height: 54px;
  font-size: 20px;
  color: #455772;
}
.groupChild2 {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d0d0d0;
  box-sizing: border-box;
  width: 402px;
  height: 54px;
}
.div5 {
  position: absolute;
  top: 5px;
  left: 59px;
  line-height: 45px;
  font-weight: 600;
}
.rectangleParent2 {
  position: absolute;
  top: 737px;
  left: 1140px;
  width: 251px;
  height: 54px;
  font-size: 20px;
  color: #455772;
}
.div6 {
  position: absolute;
  top: 5px;
  left: 46px;
  line-height: 45px;
  font-weight: 600;
}
.rectangleDiv {
  position: absolute;
  top: 1051px;
  left: 50px;
  border-radius: 20px;
  background-color: #f4f4f4;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1819px;
  height: 1710px;
}
.sql {
  position: absolute;
  top: 1090px;
  left: 105px;
  line-height: 45px;
  display: inline-block;
  width: 143px;
}
.child19 {
  position: absolute;
  top: 1082px;
  left: 1475px;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 345px;
  height: 62px;
}
.child20 {
  position: absolute;
  top: 1082px;
  left: 1475px;
  border-radius: 20px 0px 0px 20px;
  background-color: #f8f9fc;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 233px;
  height: 62px;
}
.child21 {
  position: absolute;
  top: 1082px;
  left: 1475px;
  border-radius: 20px 0px 0px 20px;
  background-color: #6b7280;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 116px;
  height: 62px;
}
.b37 {
  position: absolute;
  top: 1090px;
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
.sql4 {
  position: absolute;
  top: 1090px;
  left: 1628px;
  font-size: 20px;
  line-height: 45px;
}
.b38 {
  position: absolute;
  top: 1090px;
  left: 1742px;
  font-size: 20px;
  line-height: 45px;
}
.child22 {
  position: absolute;
  top: 1177px;
  left: 52px;
  background-color: #eff5fe;
  width: 1815px;
  height: 230px;
}
.b39 {
  position: absolute;
  top: 1210px;
  left: 105px;
  font-size: 25px;
  line-height: 45px;
  color: #42a8ff;
}
.bodContainer {
  position: absolute;
  top: 1272px;
  left: 105px;
  line-height: 45px;
  color: #000;
}
.span {
  line-height: 45px;
}
/* 생성된 SQL — 원본은 스크린샷 이미지였으나 실제 텍스트로 렌더한다 */
.sqlBlock {
  position: absolute;
  top: 1486px;
  left: 121px;
  width: 975px;
  height: 724px;
  box-sizing: border-box;
  margin: 0;
  padding: 36px 40px;
  border-radius: 12px;
  background-color: #fafafa;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'D2Coding', monospace;
  font-size: 28px;
  line-height: 54px;
  color: #374151;
  overflow: hidden;
}
.sqlLine {
  white-space: pre;
}
/* 정렬은 전부 CSS로 잡는다 — Vue 템플릿 컴파일러가 연속 공백을 한 칸으로 접기 때문.
   ch 단위는 monospace 한 글자 폭이라 원본의 칸 수를 그대로 옮길 수 있다. */
.sqlSelectRow {
  display: grid;
  grid-template-columns: 600px 1fr;
  padding-left: 4ch;
}
.sqlClauseRow {
  display: grid;
  grid-template-columns: 8ch 1fr;
}
.sqlAndIndent {
  padding-left: 2ch;
}
.sqlTrailComment {
  padding-left: 8ch;
  color: #9ca3af;
}
.sqlKeyword {
  color: #4338ca;
  font-weight: 700;
}
.sqlString {
  color: #15803d;
}
.sqlComment {
  color: #9ca3af;
}
.child2 {
  position: absolute;
  top: 2467px;
  left: 52px;
  border-radius: 0px 0px 18px 18px;
  background-color: #fbfbfb;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1815px;
  height: 294px;
}
.sql2 {
  position: absolute;
  top: 2307px;
  left: 105px;
  line-height: 45px;
  display: inline-block;
  width: 607px;
}
.sql3 {
  position: absolute;
  top: 2396px;
  left: 105px;
  line-height: 45px;
  display: inline-block;
  width: 126px;
}
.b28 {
  position: absolute;
  top: 2396px;
  left: 424px;
  line-height: 45px;
  display: inline-block;
  width: 126px;
}
.b29 {
  position: absolute;
  top: 2396px;
  left: 766px;
  line-height: 45px;
  display: inline-block;
  width: 126px;
}
.b30 {
  position: absolute;
  top: 2396px;
  left: 1136px;
  line-height: 45px;
  display: inline-block;
  text-align: center;
  width: 126px;
}
.mapSqlCol {
  position: absolute;
  left: 105px;
  line-height: 45px;
  display: inline-block;
  color: #000;
  width: 196px;
}
.mapOrigCol {
  position: absolute;
  left: 424px;
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
/* "-" 와 "박서연 08-08 09:40" 이 같은 중심(1199px)에 오도록 넓게 잡고 가운데 정렬 */
.mapConfirm {
  position: absolute;
  left: 1057px;
  line-height: 45px;
  color: #000;
  text-align: center;
  display: inline-block;
  width: 284px;
}
.b18 {
  position: absolute;
  top: 2852px;
  left: 105px;
  line-height: 45px;
  display: inline-block;
  width: 607px;
}
.child10 {
  position: absolute;
  top: 2818px;
  left: 50px;
  border-radius: 20px 20px 0px 0px;
  background-color: #f1f7ff;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1819px;
  height: 202px;
}
.item {
  position: absolute;
  top: 2921px;
  left: 50px;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1819px;
  height: 837px;
}
.child23 {
  position: absolute;
  left: 52px;
  border-radius: 0px 0px 18px 18px;
  background-color: rgba(255, 0, 0, 0.06);
  width: 1815px;
}
.rawDivider {
  position: absolute;
  left: 50px;
  width: 1819px;
  height: 1px;
  background-color: #d1d5db;
}
.rawHead {
  position: absolute;
  top: 2959px;
  font-size: 25px;
}
.rawNo {
  position: absolute;
  color: #000;
}
.rawCell {
  position: absolute;
  font-weight: 500;
}
.rawCellOver {
  position: absolute;
  color: #ff0000;
}
.rawVsOver {
  position: absolute;
  font-size: 25px;
  color: #ff0000;
}
/* 초과 행 클릭 영역 — 셀들 위에 투명하게 덮는다 */
.rawRowHit {
  position: absolute;
  left: 52px;
  width: 1815px;
  height: 104px;
}
.child18 {
  position: absolute;
  top: 3899px;
  left: 0px;
  background-color: #f3f3f3;
  width: 1920px;
  height: 244px;
}
.div37 {
  position: absolute;
  top: 210px;
  left: 50px;
  font-size: 40px;
  font-weight: 600;
  color: #00559e;
  text-align: center;
}
</style>
