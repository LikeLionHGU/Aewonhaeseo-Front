<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import logo from '../assets/logo.png'
import caretDownIcon from '../assets/caret-down.svg'
import { useDesignScale } from '../composables/useDesignScale'

const DESIGN_WIDTH = 1920
const BASE_HEIGHT = 2683

const scale = useDesignScale(DESIGN_WIDTH)
const router = useRouter()

// 차트 기하 — Figma 캔버스 좌표 그대로 사용해 축 레이블/월 레이블과 정렬한다.
const AXIS_ZERO_Y = 1835 // 값 0의 y좌표
const AXIS_UNIT_Y = 110.125 // 1 mg/L 당 픽셀
const THRESHOLD = 3.0 // 하천 생활환경기준

const monthX = [
  221.5, 352.5, 488.5, 621.5, 754.5, 890.5,
  1025.5, 1159.5, 1293.5, 1426.5, 1560.5, 1693.5,
]
const monthValue = [
  1.75, 2.13, 1.86, 2.42, 2.89, 3.41,
  3.8, 3.18, 2.57, 2.19, 1.86, 1.74,
]

const toY = (value: number) => AXIS_ZERO_Y - value * AXIS_UNIT_Y

const points = monthX.map((x, i) => ({
  x,
  y: toY(monthValue[i]),
  over: monthValue[i] > THRESHOLD,
}))
const linePath = points.map((p) => `${p.x},${p.y}`).join(' ')
const gridY = [0, 1, 2, 3, 4].map(toY)
const thresholdY = toY(THRESHOLD)

// 집계단위 세그먼트 — 선택 하이라이트가 해당 구간으로 이동한다.
const unit = ref<'월' | '분기' | '연'>('월')
const UNIT_SEGMENT = {
  '월': { left: 156, width: 82, radius: '20px 0px 0px 20px' },
  '분기': { left: 238, width: 100, radius: '0px' },
  '연': { left: 338, width: 78, radius: '0px 20px 20px 0px' },
} as const

// 비교 옵션 (그래프 탭)
const compare = ref('비교 없음')

const activeTab = ref<'graph' | 'table' | 'exceed'>('graph')
// 탭 하단 인디케이터 — 디자인 좌표 그대로.
const TAB_UNDERLINE = {
  graph: { left: 50, width: 137 },
  table: { left: 226, width: 137 },
  exceed: { left: 396, width: 180 },
} as const

// 기준 초과 분석 탭은 표 위에 KPI 카드 한 줄이 들어가면서
// 표부터 하단 전체가 정확히 298px 내려간다.
const EXCEED_OFFSET = 298
const tabOffset = computed(() => (activeTab.value === 'exceed' ? EXCEED_OFFSET : 0))
const designHeight = computed(() => BASE_HEIGHT + tabOffset.value)

// 기준 초과 분석 탭 KPI 카드
const kpiCards = [
  {
    label: '초과 개월',
    value: '3',
    suffix: '/12',
    accent: true,
    note: '6월 · 7월 · 8월 - 연속 3개월',
    cardLeft: 50,
    cardWidth: 565,
    textLeft: 101,
  },
  {
    label: '최고 초과율',
    value: '+27%',
    suffix: '',
    accent: true,
    note: '7월 3.8mg/L (기준 3.0)',
    cardLeft: 677,
    cardWidth: 566,
    textLeft: 729,
  },
  {
    label: '초과 측정 건수',
    value: '7',
    suffix: '/46',
    accent: false,
    note: '개별 측정값 기준 · 15.2%',
    cardLeft: 1305,
    cardWidth: 566,
    textLeft: 1357,
  },
]

// 표 결과 탭 — 행/열 좌표는 Figma 캔버스 기준, 행 간격 104px.
const TABLE_ROW_TOP = 1290
const TABLE_ROW_STEP = 104
const TABLE_COL = {
  month: 120,
  avg: 368,
  count: 588,
  range: 819,
  vsThreshold: 1121,
  lastYear: 1453,
  delta: 1673,
} as const

type TableRow = {
  month: string
  avg: string
  count: string
  range: string
  vsThreshold: string
  lastYear: string
  delta: string
  over: boolean
}

const tableRows: TableRow[] = [
  { month: '2025-01', avg: '1.8', count: '4', range: '1.5~2.1', vsThreshold: '이내', lastYear: '1.9', delta: '-0.1', over: false },
  { month: '2025-01', avg: '1.8', count: '4', range: '1.5~2.1', vsThreshold: '이내', lastYear: '1.9', delta: '+0.1', over: false },
  { month: '2025-01', avg: '1.8', count: '4', range: '1.5~2.1', vsThreshold: '이내', lastYear: '1.9', delta: '-0.3', over: false },
  { month: '2025-01', avg: '1.8', count: '4', range: '1.5~2.1', vsThreshold: '이내', lastYear: '1.9', delta: '+0.1', over: false },
  { month: '2025-01', avg: '1.8', count: '4', range: '1.5~2.1', vsThreshold: '이내', lastYear: '1.9', delta: '+0.3', over: false },
  { month: '2025-01', avg: '1.8', count: '4', range: '1.5~2.1', vsThreshold: '초과 +13%', lastYear: '1.9', delta: '+0.5', over: true },
  { month: '2025-01', avg: '1.8', count: '4', range: '1.5~2.1', vsThreshold: '초과 +27%', lastYear: '1.9', delta: '+0.7', over: true },
]

const rowTop = (i: number) => TABLE_ROW_TOP + i * TABLE_ROW_STEP + tabOffset.value
// 행 구분선은 각 행 아래 70px 지점 (마지막 행 제외).
const rowDividerTop = computed(() => tableRows.slice(0, -1).map((_, i) => rowTop(i) + 70))
// 기준 초과 행들을 감싸는 붉은 하이라이트.
const firstOverRow = tableRows.findIndex((r) => r.over)
const overHighlight = computed(() => ({
  top: rowTop(firstOverRow) - 33,
  height: (tableRows.length - firstOverRow) * TABLE_ROW_STEP,
}))
</script>

<template>
  <div :class="$style.viewport" :style="{ height: `${designHeight * scale}px` }">
  <div :class="$style.div" :style="{ transform: `scale(${scale})`, height: `${designHeight}px` }">
    <b :class="[$style.b, 'clickable']" @click="router.push('/main')">내 데이터</b>
    <div :class="[$style.div2, 'clickable']" @click="router.push('/ask')">분석하기</div>
    <div :class="$style.div3">문의하기</div>
    <b :class="$style.bod">“작년 인천 지점 BOD 월별 추이 보여줘"</b>
    <div :class="[$style.caAaca4862A5402b585a54a82eParent, 'clickable']" @click="router.push('/')">
      <img :class="$style.caAaca4862A5402b585a54a82eIcon" :src="logo" alt="로고" />
      <b :class="$style.b2">물</b>
      <b :class="$style.b3">볼래</b>
      <b :class="$style.b4">ㅓ</b>
    </div>
    <div :class="$style.child" />
    <div :class="$style.item" />
    <b :class="$style.bod25">2025년 인천 지점 BOD 월평균 2.5 mg/L, 기준치 3.0 초과 3개월</b>
    <div :class="$style.mgl">6 · 7· 8월 연속 초과 · 최고치 7월 3.8mg/L (기준 대비 + 27%)</div>
    <div :class="$style.div4">초과 개월</div>
    <div :class="$style.inner" :style="{ top: `${2439 + tabOffset}px` }" />
    <div :class="$style.rectangleParent">
      <div :class="$style.groupChild" />
      <div :class="$style.div5">
        <span :class="$style.span">지점</span>
        <span :class="$style.span2"> </span>
        <span :class="$style.span3">인천(한강대교)</span>
      </div>
    </div>
    <div :class="$style.rectangleGroup">
      <div :class="$style.groupItem" />
      <div :class="$style.div6">
        <span :class="$style.span">기준치 </span>
        <span :class="$style.span3">하천 생활환경기준 등급</span>
      </div>
    </div>
    <div :class="$style.rectangleContainer">
      <div :class="$style.groupChild" />
      <div :class="$style.div5">
        <span :class="$style.span">기간</span>
        <span :class="$style.span2"> </span>
        <span :class="$style.span3">2025-01~12</span>
      </div>
    </div>
    <div :class="$style.groupDiv">
      <div :class="$style.rectangleDiv" />
      <div :class="$style.div8">
        <span :class="$style.span">집계</span>
        <span :class="$style.span2"> </span>
        <span :class="$style.span3">월별 평균</span>
      </div>
    </div>
    <div :class="$style.rectangleParent2">
      <div :class="$style.groupChild2" />
      <div :class="$style.bod2">
        <span :class="$style.span">항목</span>
        <span :class="$style.span2"> </span>
        <span :class="$style.span3">BOD</span>
      </div>
    </div>
    <b :class="$style.b5">3/12</b>
    <b :class="[$style.b6, activeTab === 'graph' ? $style.tabActive : $style.tabIdle, 'clickable']"
       @click="activeTab = 'graph'">추이 그래프</b>
    <b :class="[$style.b7, activeTab === 'table' ? $style.tabActive : $style.tabIdle, 'clickable']"
       @click="activeTab = 'table'">표 결과</b>
    <b :class="[$style.b8, activeTab === 'exceed' ? $style.tabActive : $style.tabIdle, 'clickable']"
       @click="activeTab = 'exceed'">기준 초과 분석</b>
    <div :class="$style.child2" />
    <div :class="$style.child3"
         :style="{ left: `${TAB_UNDERLINE[activeTab].left}px`, width: `${TAB_UNDERLINE[activeTab].width}px` }" />
    <b :class="$style.b9">집계단위</b>
    <b v-if="activeTab === 'exceed'" :class="$style.thresholdSetLabel">기준치 세트</b>
    <b v-else :class="$style.b10">비교</b>
    <div :class="$style.child4" />
    <div :class="$style.child8" />
    <div :class="$style.child9" :style="{
      left: `${UNIT_SEGMENT[unit].left}px`,
      width: `${UNIT_SEGMENT[unit].width}px`,
      borderRadius: UNIT_SEGMENT[unit].radius,
    }" />
    <b :class="[$style.b11, 'clickable']" @click="unit = '월'">월</b>
    <b :class="[$style.b12, 'clickable']" @click="unit = '분기'">분기</b>
    <b :class="[$style.b13, 'clickable']" @click="unit = '연'">연</b>
    <!-- 비교 컨트롤: 그래프 탭은 3지 선택, 표 탭은 단일 드롭다운 -->
    <template v-if="activeTab === 'graph'">
      <div :class="[$style.child5, compare === '비교 없음' && $style.chipOn]" />
      <div :class="[$style.child6, compare === '+전년 동기' && $style.chipOn]" />
      <div :class="[$style.child7, compare === '+다른 지점' && $style.chipOn]" />
      <b :class="[$style.b14, 'clickable']" @click="compare = '비교 없음'">비교 없음</b>
      <b :class="[$style.b15, 'clickable']" @click="compare = '+전년 동기'">+전년 동기</b>
      <b :class="[$style.b16, 'clickable']" @click="compare = '+다른 지점'">+다른 지점</b>
      <img :class="$style.polygonIcon" :src="caretDownIcon" alt="" />
    </template>
    <template v-else-if="activeTab === 'table'">
      <div :class="$style.compareSelect" />
      <b :class="$style.compareSelectLabel">전년 동기 (2024)</b>
      <img :class="$style.compareSelectArrow" :src="caretDownIcon" alt="" />
    </template>
    <template v-else>
      <div :class="$style.thresholdSelect" />
      <b :class="$style.thresholdSelectLabel">하천 생활환경기준 등급</b>
      <img :class="$style.thresholdSelectArrow" :src="caretDownIcon" alt="" />
    </template>
    <b :class="$style.sql" :style="{ top: `${2209 + tabOffset}px` }">이 숫자가 어떻게 나왔는지 확인할 수 있어요 - 생성된 SQL과 원본 데이터 행</b>
    <template v-if="activeTab === 'graph'">
    <div :class="$style.child10" />
    <b :class="$style.bod4">인천 (한강대교) BOD 월평균 - 2025</b>
    <b :class="$style.b17">3.4</b>
    <b :class="$style.b18">3.2</b>
    <b :class="$style.b19">초과 3개월</b>
    <b :class="$style.b20">기준 3.0</b>
    <b :class="$style.b21">3.8</b>
    <div :class="$style.mgl2">단위 mg/L ·  기준선 3.0 (하천 생활환경기준 등급)</div>
    <svg :class="$style.chart" viewBox="200 1370 1560 490" role="img"
         aria-label="인천 한강대교 BOD 월평균 추이 - 2025년, 6·7·8월 기준치 3.0 초과">
      <g :class="$style.grid">
        <line v-for="y in gridY" :key="y" :x1="221" :x2="1743" :y1="y" :y2="y" />
      </g>
      <line :class="$style.thresholdLine" :x1="221" :x2="1743" :y1="thresholdY" :y2="thresholdY" />
      <polyline :class="$style.trendLine" :points="linePath" />
      <circle v-for="(p, i) in points" :key="i" :cx="p.x" :cy="p.y" r="12.5"
              :class="p.over ? $style.dotOver : $style.dot" />
    </svg>
    <div :class="$style.div9">1월</div>
    <div :class="$style.div10">0</div>
    <div :class="$style.div11">1</div>
    <div :class="$style.div12">2</div>
    <div :class="$style.div13">3</div>
    <div :class="$style.div14">4</div>
    <div :class="$style.div15">2월</div>
    <div :class="$style.div16">3월</div>
    <div :class="$style.div17">4월</div>
    <div :class="$style.div18">5월</div>
    <div :class="$style.div19">6월</div>
    <div :class="$style.div20">7월</div>
    <div :class="$style.div21">8월</div>
    <div :class="$style.div22">9월</div>
    <div :class="$style.div23">10월</div>
    <div :class="$style.div24">11월</div>
    <div :class="$style.div25">12월</div>
    <div :class="$style.child37" />
    <div :class="$style.child38" />
    <div :class="$style.child39" />
    <b :class="$style.bod5">BOD 월평균 </b>
    <b :class="$style.mgl3">기준치 3.0 mg/L</b>
    <b :class="$style.b22">기준 초과 (값 직접 표기)</b>
    <b :class="$style.b23">점 위에 마우스를 올리면 측정 건수/결측 여부가 표시됩니다</b>
    </template>

    <!-- 표 결과 / 기준 초과 분석 탭 — 같은 표를 쓰고, 초과 분석 탭에만 KPI 카드가 얹힌다 -->
    <template v-else>
      <template v-if="activeTab === 'exceed'">
        <template v-for="card in kpiCards" :key="card.label">
          <div :class="$style.kpiCard" :style="{ left: `${card.cardLeft}px`, width: `${card.cardWidth}px` }" />
          <b :class="$style.kpiLabel" :style="{ left: `${card.textLeft}px` }">{{ card.label }}</b>
          <b :class="[$style.kpiValue, card.accent && $style.kpiValueAccent]" :style="{ left: `${card.textLeft}px` }">
            <span>{{ card.value }}</span><span v-if="card.suffix" :class="$style.kpiSuffix">{{ card.suffix }}</span>
          </b>
          <div :class="$style.kpiNote" :style="{ left: `${card.textLeft}px` }">{{ card.note }}</div>
        </template>
      </template>

      <div :class="$style.tableCard" :style="{ top: `${1150 + tabOffset}px` }" />
      <div :class="$style.tableHeaderBg" :style="{ top: `${1150 + tabOffset}px` }" />
      <div :class="$style.tableOverHighlight"
           :style="{ top: `${overHighlight.top}px`, height: `${overHighlight.height}px` }" />
      <div v-for="top in rowDividerTop" :key="top" :class="$style.tableDivider" :style="{ top: `${top}px` }" />

      <b :class="$style.tableHead" :style="{ top: `${1185 + tabOffset}px`, left: `${TABLE_COL.month}px` }">월</b>
      <b :class="$style.tableHead" :style="{ top: `${1170 + tabOffset}px`, left: `${TABLE_COL.avg}px` }">BOD 평균<br/>(mg/L)</b>
      <b :class="$style.tableHead" :style="{ top: `${1185 + tabOffset}px`, left: `${TABLE_COL.count}px` }">측정 건수</b>
      <b :class="$style.tableHead" :style="{ top: `${1185 + tabOffset}px`, left: `${TABLE_COL.range}px` }">최소 ~ 최대</b>
      <b :class="$style.tableHead" :style="{ top: `${1185 + tabOffset}px`, left: `${TABLE_COL.vsThreshold}px` }">기준(3.0)대비</b>
      <b :class="$style.tableHead" :style="{ top: `${1185 + tabOffset}px`, left: `${TABLE_COL.lastYear}px` }">2024 동월</b>
      <b :class="$style.tableHead" :style="{ top: `${1185 + tabOffset}px`, left: `${TABLE_COL.delta}px` }">증감</b>

      <template v-for="(row, i) in tableRows" :key="i">
        <b :class="$style.tableMonth" :style="{ top: `${rowTop(i)}px`, left: `${TABLE_COL.month}px` }">{{ row.month }}</b>
        <div :class="$style.tableCell" :style="{ top: `${rowTop(i)}px`, left: `${TABLE_COL.avg}px` }">{{ row.avg }}</div>
        <div :class="$style.tableCell" :style="{ top: `${rowTop(i)}px`, left: `${TABLE_COL.count}px` }">{{ row.count }}</div>
        <div :class="$style.tableCell" :style="{ top: `${rowTop(i)}px`, left: `${TABLE_COL.range}px` }">{{ row.range }}</div>
        <component :is="row.over ? 'b' : 'div'"
                   :class="row.over ? $style.tableCellOver : $style.tableCell"
                   :style="{ top: `${rowTop(i)}px`, left: `${TABLE_COL.vsThreshold}px` }">{{ row.vsThreshold }}</component>
        <div :class="$style.tableCell" :style="{ top: `${rowTop(i)}px`, left: `${TABLE_COL.lastYear}px` }">{{ row.lastYear }}</div>
        <b :class="row.delta.startsWith('-') ? $style.tableDeltaDown : $style.tableDeltaUp"
           :style="{ top: `${rowTop(i) + 3}px`, left: `${TABLE_COL.delta}px` }">{{ row.delta }}</b>
      </template>
    </template>

    <div :class="$style.child40" :style="{ top: `${2132 + tabOffset}px` }" />
    <div :class="[$style.rectangleParent3, 'clickable']" role="button"
         :style="{ top: `${2201 + tabOffset}px` }" @click="router.push('/evidence')">
      <div :class="$style.groupChild3" />
      <b :class="$style.b24">근거 상세 보기 →</b>
    </div>
    <div :class="[$style.div26, 'clickable']" @click="router.push('/conditions')">←</div>
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
  height: 2683px;
  position: relative;
  background-color: #f8f9fc;
  overflow: hidden;
  text-align: left;
  font-size: 25px;
  color: #6b7280;
  font-family: Pretendard;
  transform-origin: top left;
}
.b {
  position: absolute;
  top: 85px;
  left: calc(50% - 676px);
  text-decoration: underline;
  color: #00559e;
  text-align: center;
}
.div2 {
  position: absolute;
  top: 85px;
  left: calc(50% - 528px);
  font-weight: 500;
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
.bod {
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
.item {
  position: absolute;
  top: 592px;
  left: 50px;
  box-shadow: 3px 3px 20px 3px rgba(0, 83, 227, 0.1);
  border-radius: 30px;
  background-color: #f9fcff;
  width: 1820px;
  height: 199px;
}
.bod25 {
  position: absolute;
  top: 647px;
  left: 103px;
  font-size: 35px;
  line-height: 45px;
  color: #000;
}
.mgl {
  position: absolute;
  top: 694px;
  left: 103px;
  line-height: 45px;
  font-weight: 500;
}
.div4 {
  position: absolute;
  top: 694px;
  left: 1713px;
  line-height: 45px;
  font-weight: 500;
}
.inner {
  position: absolute;
  top: 2439px;
  left: 0px;
  background-color: #f3f3f3;
  width: 1920px;
  height: 244px;
}
.rectangleParent {
  position: absolute;
  top: 373px;
  left: 93px;
  width: 363px;
  height: 54px;
  font-size: 23px;
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
  width: 363px;
  height: 54px;
}
.div5 {
  position: absolute;
  top: 4px;
  left: 89px;
  line-height: 45px;
}
.span {
  line-height: 45px;
}
.span2 {
  font-weight: 300;
  line-height: 45px;
}
.span3 {
  font-weight: 800;
  line-height: 45px;
}
.rectangleGroup {
  position: absolute;
  top: 453px;
  left: 93px;
  width: 443px;
  height: 54px;
  text-align: center;
  font-size: 23px;
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
  width: 443px;
  height: 54px;
}
.div6 {
  position: absolute;
  top: 4px;
  left: 31px;
  line-height: 45px;
  display: inline-block;
  width: 381px;
}
.rectangleContainer {
  position: absolute;
  top: 373px;
  left: 674px;
  width: 363px;
  height: 54px;
  font-size: 23px;
  color: #455772;
}
.groupDiv {
  position: absolute;
  top: 373px;
  left: 1051px;
  width: 228px;
  height: 54px;
  font-size: 23px;
  color: #455772;
}
.rectangleDiv {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d0d0d0;
  box-sizing: border-box;
  width: 228px;
  height: 54px;
}
.div8 {
  position: absolute;
  top: 4px;
  left: 49px;
  line-height: 45px;
}
.rectangleParent2 {
  position: absolute;
  top: 373px;
  left: 470px;
  width: 190px;
  height: 54px;
  font-size: 23px;
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
  width: 190px;
  height: 54px;
}
.bod2 {
  position: absolute;
  top: 4px;
  left: 48px;
  line-height: 45px;
}
.b5 {
  position: absolute;
  top: 645px;
  left: calc(50% + 762px);
  font-size: 40px;
  color: #0053e3;
}
.b6 {
  position: absolute;
  top: 931px;
  left: 50px;
  font-size: 30px;
  line-height: 45px;
}
.b7 {
  position: absolute;
  top: 931px;
  left: 251px;
  font-size: 30px;
  line-height: 45px;
}
.b8 {
  position: absolute;
  top: 931px;
  left: 402px;
  font-size: 30px;
  line-height: 45px;
}
/* 선택된 비교 옵션 */
.chipOn {
  background-color: #d6e8fa;
  border-color: #0053e3;
}
.tabActive {
  color: #0053e3;
}
.tabIdle {
  color: #9ca3af;
}
.child2 {
  position: absolute;
  top: 993px;
  left: 50px;
  background-color: #d9d9d9;
  width: 1820px;
  height: 2px;
}
.child3 {
  position: absolute;
  top: 992px;
  left: 50px;
  background-color: #0053e3;
  width: 137px;
  height: 4px;
}
.b9 {
  position: absolute;
  top: 1039px;
  left: 50px;
  line-height: 45px;
}
.b10 {
  position: absolute;
  top: 1039px;
  left: 508px;
  line-height: 45px;
  text-align: center;
}
.child4 {
  position: absolute;
  top: 1031px;
  left: 156px;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 260px;
  height: 62px;
}
.child5 {
  position: absolute;
  top: 1031px;
  left: 593px;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 174px;
  height: 62px;
}
.child6 {
  position: absolute;
  top: 1031px;
  left: 779px;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 174px;
  height: 62px;
}
.child7 {
  position: absolute;
  top: 1031px;
  left: 965px;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 174px;
  height: 62px;
}
.child8 {
  position: absolute;
  top: 1031px;
  left: 156px;
  border-radius: 20px 0px 0px 20px;
  background-color: #f8f9fc;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 182px;
  height: 62px;
}
.child9 {
  position: absolute;
  top: 1031px;
  left: 156px;
  border-radius: 20px 0px 0px 20px;
  background-color: #d6e8fa;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 82px;
  height: 62px;
}
.b11 {
  position: absolute;
  top: 1039px;
  left: 186px;
  line-height: 45px;
}
.b12 {
  position: absolute;
  top: 1039px;
  left: 264px;
  line-height: 45px;
}
.b13 {
  position: absolute;
  top: 1039px;
  left: 364px;
  line-height: 45px;
}
.b14 {
  position: absolute;
  top: 1039px;
  left: 623px;
  line-height: 45px;
  text-align: center;
}
.b15 {
  position: absolute;
  top: 1039px;
  left: 812px;
  line-height: 45px;
  text-align: center;
}
.b16 {
  position: absolute;
  top: 1039px;
  left: 998px;
  line-height: 45px;
  text-align: center;
}
.polygonIcon {
  position: absolute;
  top: 1066px;
  left: 728px;
  width: 9px;
  height: 9px;
}

/* ── 표 결과 탭 ─────────────────────────────── */
/* 비교 컨트롤 (단일 드롭다운) */
.compareSelect {
  position: absolute;
  top: 1031px;
  left: 593px;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 252px;
  height: 62px;
}
.compareSelectLabel {
  position: absolute;
  top: 1039px;
  left: 620px;
  font-size: 25px;
  line-height: 45px;
  text-align: center;
}
.compareSelectArrow {
  position: absolute;
  top: 1066px;
  left: 809px;
  width: 9px;
  height: 9px;
}
/* 표 본체 */
.tableCard {
  position: absolute;
  left: 50px;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1819px;
  height: 837px;
}
.tableHeaderBg {
  position: absolute;
  left: 50px;
  border-radius: 20px 20px 0px 0px;
  background-color: #f1f7ff;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1819px;
  height: 99px;
}
.tableOverHighlight {
  position: absolute;
  left: 52px;
  border-radius: 0px 0px 18px 18px;
  background-color: rgba(255, 0, 0, 0.06);
  width: 1815px;
}
.tableDivider {
  position: absolute;
  left: 50px;
  width: 1819px;
  height: 1px;
  background-color: #d1d5db;
}
.tableHead {
  position: absolute;
  font-size: 25px;
}
.tableMonth {
  position: absolute;
  font-size: 30px;
  color: #000;
}
.tableCell {
  position: absolute;
  font-size: 30px;
  font-weight: 500;
}
.tableCellOver {
  position: absolute;
  font-size: 30px;
  color: #ff0000;
}
.tableDeltaUp {
  position: absolute;
  font-size: 25px;
  color: #ff0000;
}
.tableDeltaDown {
  position: absolute;
  font-size: 25px;
  color: #00a26a;
}

/* ── 기준 초과 분석 탭 ──────────────────────── */
/* 기준치 세트 드롭다운 */
.thresholdSetLabel {
  position: absolute;
  top: 1039px;
  left: 473px;
  font-size: 25px;
  line-height: 45px;
  text-align: center;
}
.thresholdSelect {
  position: absolute;
  top: 1031px;
  left: 613px;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 1px solid #d1d5db;
  box-sizing: border-box;
  width: 299px;
  height: 62px;
}
.thresholdSelectLabel {
  position: absolute;
  top: 1039px;
  left: 636px;
  font-size: 25px;
  line-height: 45px;
  text-align: center;
}
.thresholdSelectArrow {
  position: absolute;
  top: 1066px;
  left: 879px;
  width: 9px;
  height: 9px;
}
/* KPI 카드 */
.kpiCard {
  position: absolute;
  top: 1147px;
  box-shadow: 3px 4px 10px 5px rgba(0, 0, 0, 0.2);
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  height: 240px;
  opacity: 0.2;
}
.kpiLabel {
  position: absolute;
  top: 1178px;
  font-size: 26px;
  line-height: 45px;
}
.kpiValue {
  position: absolute;
  top: 1231px;
  font-size: 60px;
  color: #000;
}
.kpiValueAccent {
  color: #ff0000;
}
.kpiSuffix {
  font-size: 40px;
  color: #6b7280;
}
.kpiNote {
  position: absolute;
  top: 1311px;
  font-size: 26px;
  line-height: 45px;
  font-weight: 500;
}

.child10 {
  position: absolute;
  top: 1148px;
  left: 50px;
  box-shadow: 3px 4px 10px 10px rgba(214, 232, 250, 0.2);
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 2px solid #d6e8fa;
  box-sizing: border-box;
  width: 1820px;
  height: 922px;
}
.bod4 {
  position: absolute;
  top: 1199px;
  left: 101px;
  font-size: 30px;
  line-height: 45px;
  color: #000;
}
.sql {
  position: absolute;
  top: 2209px;
  left: 103px;
  font-size: 30px;
  line-height: 45px;
  color: #9ca3af;
}
.b17 {
  position: absolute;
  top: 1394px;
  left: 868px;
  font-size: 30px;
  line-height: 45px;
  color: #ff0000;
}
.b18 {
  position: absolute;
  top: 1420px;
  left: 1137px;
  font-size: 30px;
  line-height: 45px;
  color: #ff0000;
}
.b19 {
  position: absolute;
  top: 1291px;
  left: 959px;
  font-size: 30px;
  line-height: 45px;
  color: #ff0000;
}
.b20 {
  position: absolute;
  top: 1459px;
  left: 1655px;
  line-height: 45px;
  color: #9ca3af;
}
.b21 {
  position: absolute;
  top: 1342px;
  left: 1001px;
  font-size: 30px;
  line-height: 45px;
  color: #ff0000;
}
.mgl2 {
  position: absolute;
  top: 1246px;
  left: 103px;
  line-height: 45px;
  font-weight: 500;
  white-space: pre-wrap;
}
.chart {
  position: absolute;
  top: 1370px;
  left: 200px;
  width: 1560px;
  height: 490px;
  overflow: visible;
  pointer-events: none;
}
.grid line {
  stroke: #e5e7eb;
  stroke-width: 2;
}
.thresholdLine {
  stroke: #9ca3af;
  stroke-width: 2;
  stroke-dasharray: 12 10;
}
.trendLine {
  fill: none;
  stroke: #00559e;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.dot {
  fill: #00559e;
}
.dotOver {
  fill: #ff0000;
}
.div9 {
  position: absolute;
  top: 1843px;
  left: 201px;
  line-height: 45px;
  font-weight: 500;
}
.div10 {
  position: absolute;
  top: 1813px;
  left: 178px;
  line-height: 45px;
  font-weight: 500;
}
.div11 {
  position: absolute;
  top: 1706px;
  left: 182px;
  line-height: 45px;
  font-weight: 500;
}
.div12 {
  position: absolute;
  top: 1590px;
  left: 179px;
  line-height: 45px;
  font-weight: 500;
}
.div13 {
  position: absolute;
  top: 1483px;
  left: 179px;
  line-height: 45px;
  font-weight: 500;
}
.div14 {
  position: absolute;
  top: 1372px;
  left: 179px;
  line-height: 45px;
  font-weight: 500;
}
.div15 {
  position: absolute;
  top: 1843px;
  left: 336px;
  line-height: 45px;
  font-weight: 500;
}
.div16 {
  position: absolute;
  top: 1844px;
  left: 470px;
  line-height: 45px;
  font-weight: 500;
}
.div17 {
  position: absolute;
  top: 1843px;
  left: 602px;
  line-height: 45px;
  font-weight: 500;
}
.div18 {
  position: absolute;
  top: 1843px;
  left: 735px;
  line-height: 45px;
  font-weight: 500;
}
.div19 {
  position: absolute;
  top: 1843px;
  left: 872px;
  line-height: 45px;
  font-weight: 500;
}
.div20 {
  position: absolute;
  top: 1843px;
  left: 1006px;
  line-height: 45px;
  font-weight: 500;
}
.div21 {
  position: absolute;
  top: 1843px;
  left: 1141px;
  line-height: 45px;
  font-weight: 500;
}
.div22 {
  position: absolute;
  top: 1843px;
  left: 1274px;
  line-height: 45px;
  font-weight: 500;
}
.div23 {
  position: absolute;
  top: 1843px;
  left: 1402px;
  line-height: 45px;
  font-weight: 500;
}
.div24 {
  position: absolute;
  top: 1843px;
  left: 1536px;
  line-height: 45px;
  font-weight: 500;
}
.div25 {
  position: absolute;
  top: 1843px;
  left: 1671px;
  line-height: 45px;
  font-weight: 500;
}
.child37 {
  position: absolute;
  top: 1966px;
  left: 563px;
  border-radius: 50%;
  background-color: #ff0000;
  width: 23px;
  height: 23px;
}
/* 범례 표식 — 실선(BOD 월평균) / 점선(기준치) */
.child38 {
  position: absolute;
  top: 1978px;
  left: 103px;
  width: 32.5px;
  height: 4px;
  background-color: #00559e;
}
.child39 {
  position: absolute;
  top: 1978px;
  left: 310px;
  width: 32.5px;
  height: 0;
  border-top: 4px dashed #9ca3af;
}
.bod5 {
  position: absolute;
  top: 1955px;
  left: 151px;
  line-height: 45px;
  color: #9ca3af;
}
.mgl3 {
  position: absolute;
  top: 1955px;
  left: 358px;
  line-height: 45px;
  color: #9ca3af;
}
.b22 {
  position: absolute;
  top: 1955px;
  left: 597px;
  line-height: 45px;
  color: #9ca3af;
}
.b23 {
  position: absolute;
  top: 1955px;
  left: 866px;
  line-height: 45px;
  color: #9ca3af;
}
.child40 {
  position: absolute;
  top: 2132px;
  left: 50px;
  filter: drop-shadow(3px 4px 10px rgba(214, 232, 250, 0.2));
  border-radius: 30px;
  border: 2px solid #d6e8fa;
  box-sizing: border-box;
  width: 1820px;
  height: 199px;
}
.rectangleParent3 {
  position: absolute;
  top: 2201px;
  left: calc(50% + 576px);
  width: 243.2px;
  height: 61px;
  text-align: center;
  font-size: 20px;
  color: #fff;
}
.groupChild3 {
  position: absolute;
  top: 0px;
  left: calc(50% - 121.6px);
  border-radius: 10px;
  background-color: #004ec2;
  width: 243.2px;
  height: 61px;
}
.b24 {
  position: absolute;
  top: 8px;
  left: 49px;
  line-height: 45px;
  display: inline-block;
  width: 145px;
  height: 45px;
}
.div26 {
  position: absolute;
  top: 210px;
  left: 50px;
  font-size: 40px;
  font-weight: 600;
  color: #00559e;
  text-align: center;
}
</style>
