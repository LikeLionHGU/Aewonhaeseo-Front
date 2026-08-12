<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import logo from '../assets/logo.png'
import checkIcon from '../assets/check.svg'
import { useDesignScale } from '../composables/useDesignScale'

const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 2341

const { scale, offsetX } = useDesignScale(DESIGN_WIDTH)
const router = useRouter()

// 진행 단계 — 1단계는 완료(체크), 2단계가 현재, 3단계는 대기.
const stepConnectors = [
  { left: 231, width: 643 },
  { left: 1046, width: 666 },
]

// 상태 필터
const filters = ['전체 42', '사람 확인 3', '자동 매핑 37', '확인 필요 2']
const activeFilter = ref('전체 42')

// 컬럼 매핑 표 — 행 간격이 원본에서 불규칙해 좌표를 그대로 쓴다.
const COL = { source: 120, standard: 458, status: 871, checker: 1214, checkedAt: 1491 }

type Status = 'needsCheck' | 'humanChecked' | 'noMatch'

const termRows: {
  top: number
  badgeTop: number
  source: string
  standard: string
  status: Status
  statusLabel: string
  checker: string
  checkedAt: string
}[] = [
  { top: 1206, badgeTop: 1204, source: '구분', standard: '-미정', status: 'needsCheck', statusLabel: '확인 필요', checker: '-', checkedAt: '-' },
  { top: 1345, badgeTop: 1343, source: '비고2', standard: '-매칭 없음', status: 'needsCheck', statusLabel: '확인 필요', checker: '-', checkedAt: '-' },
  { top: 1484, badgeTop: 1481, source: 'T-N', standard: '총질소', status: 'needsCheck', statusLabel: '확인 필요', checker: '-', checkedAt: '08-08 09:40' },
  { top: 1618, badgeTop: 1616, source: '측정 일자', standard: '측정일', status: 'humanChecked', statusLabel: '사람 확인', checker: '박서연', checkedAt: '08-08 09:40' },
  { top: 1771, badgeTop: 1768, source: 'BOD', standard: '생물화확적산소요구량', status: 'noMatch', statusLabel: '! 매칭 없음', checker: '-', checkedAt: '08-08 09:40' },
]
const rowDividers = [1288, 1427, 1566, 1705]
</script>

<template>
  <div :class="$style.viewport" :style="{ height: `${DESIGN_HEIGHT * scale}px` }">
  <div :class="$style.div" :style="{ transform: `translateX(${offsetX}px) scale(${scale})` }">
    <b :class="[$style.b, 'link']" @click="router.push('/data')">내 데이터</b>
    <div :class="[$style.div2, 'link']" @click="router.push('/ask')">분석하기</div>
    <div :class="$style.div3">문의하기</div>
    <div :class="[$style.caAaca4862A5402b585a54a82eParent, 'link']" @click="router.push('/')">
      <img :class="$style.caAaca4862A5402b585a54a82eIcon" :src="logo" alt="로고" />
      <b :class="$style.b2">물</b>
      <b :class="$style.b3">볼래</b>
      <b :class="$style.b4">ㅓ</b>
    </div>
    <div :class="$style.profile" />
    <b :class="$style.csv2">엑셀 · CSV 파일 업로드</b>
    <b :class="$style.csv">기관에서 사용하는 엑셀·CSV 파일을 그대로 올려보세요.<br/>별도의 서식 정리 없이 바로 업로드할 수 있어요.</b>

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

    <!-- 확인 필요 안내 -->
    <div :class="$style.alertCard" />
    <b :class="$style.xlsx">인천_수질측정_2025.xlsx - 확인 필요 3건</b>
    <div :class="$style.div4">파일 2개에서 이름만으로는 판단하기 어려운 컬럼이 나왔어요. 3건만 확인하면 됩니다.</div>
    <div :class="[$style.alertButton, 'btn']" role="button" @click="router.push('/terms')">
      <div :class="[$style.alertButtonBg, 'btn-fill']" />
      <b :class="$style.alertButtonLabel">확인 필요 3건 보러가기 →</b>
    </div>

    <!-- 상태 필터 + 검색 -->
    <div :class="$style.filterRow">
      <div v-for="f in filters" :key="f" role="button"
           :class="[$style.filterPill, 'btn',
                    activeFilter === f ? [$style.filterPillOn, 'btn-fill'] : 'btn-outline']"
           @click="activeFilter = f">{{ f }}</div>
    </div>
    <div :class="$style.searchBox">
      <div :class="$style.searchBoxBg" />
      <div :class="$style.searchPlaceholder">파일명 · 기관 · 항목 검색</div>
    </div>

    <!-- 컬럼 매핑 표 -->
    <div :class="$style.tableCard" />
    <div :class="$style.tableHeaderBg" />
    <div v-for="top in rowDividers" :key="top" :class="$style.rowDivider" :style="{ top: `${top}px` }" />
    <b :class="$style.tableHead" :style="{ left: `${COL.source}px` }">원본 칼럼</b>
    <b :class="$style.tableHead" :style="{ left: `${COL.standard}px` }">표준 용어</b>
    <b :class="$style.tableHead" :style="{ left: '866px' }">상태</b>
    <b :class="$style.tableHead" :style="{ left: `${COL.checker}px` }">확인자</b>
    <b :class="$style.tableHead" :style="{ left: '1531px' }">확인 시각</b>

    <template v-for="(row, i) in termRows" :key="i">
      <b :class="$style.sourceCol" :style="{ top: `${row.top}px` }">{{ row.source }}</b>
      <div :class="$style.standardCol" :style="{ top: `${row.top}px` }">{{ row.standard }}</div>
      <!-- 값이 없는 칸은 좁은 상자에 가운데 정렬, 값이 있으면 왼쪽 정렬 -->
      <div :class="row.checker === '-' ? $style.emptyCell : $style.checkerCol" :style="{ top: `${row.top}px` }">{{ row.checker }}</div>
      <div :class="row.checkedAt === '-' ? $style.emptyCellWide : $style.checkedAtCol" :style="{ top: `${row.top}px` }">{{ row.checkedAt }}</div>

      <div :class="$style.badge" :style="{ top: `${row.badgeTop}px` }">
        <div :class="{
          [$style.badgeBgNeedsCheck]: row.status === 'needsCheck',
          [$style.badgeBgHuman]: row.status === 'humanChecked',
          [$style.badgeBgNoMatch]: row.status === 'noMatch',
        }" />
        <div v-if="row.status === 'needsCheck'" :class="$style.badgeDot" />
        <img v-else-if="row.status === 'humanChecked'" :class="$style.badgeCheck" :src="checkIcon" alt="" />
        <b :class="{
          [$style.badgeLabel]: true,
          [$style.badgeLabelHuman]: row.status === 'humanChecked',
          [$style.badgeLabelNoMatch]: row.status === 'noMatch',
        }">{{ row.statusLabel }}</b>
      </div>
    </template>

    <div :class="[$style.analyzeButton, 'btn']" role="button" @click="router.push('/ask')">
      <div :class="[$style.analyzeButtonBg, 'btn-fill']" />
      <b :class="$style.analyzeButtonLabel">분석하기</b>
    </div>
    <div :class="$style.child15" />
    <div :class="[$style.div24, 'link']" @click="router.push('/upload')">←</div>
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
  height: 2341px;
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
  font-size: var(--font-body-03);
  line-height: 45px;
}
.div24 {
  position: absolute;
  top: 228px;
  left: 50px;
  font-size: var(--font-title-02);
  font-weight: 600;
  color: #00559e;
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
/* ① 완료 — 테두리만 있는 원 안에 체크 */
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
/* ② 진행 중 */
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
/* ③ 대기 */
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
/* ── 확인 필요 안내 ─────────────────────────── */
.alertCard {
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
.xlsx {
  position: absolute;
  top: 735px;
  left: 103px;
  font-size: var(--font-title-03);
  line-height: 45px;
  color: #000;
}
.div4 {
  position: absolute;
  top: 785px;
  left: 103px;
  font-size: var(--font-body-03);
  line-height: 45px;
  font-weight: 500;
}
.alertButton {
  position: absolute;
  top: 745px;
  left: calc(50% + 541px);
  width: 322px;
  height: 56px;
  text-align: center;
  font-size: var(--font-body-03);
  color: #fff;
}
.alertButtonBg {
  position: absolute;
  top: 0px;
  left: 1px;
  border-radius: 10px;
  background-color: #004ec2;
  width: 320px;
  height: 56px;
}
.alertButtonLabel {
  position: absolute;
  top: 0px;
  left: 0px;
  line-height: 56px;
  display: inline-block;
  width: 322px;
  height: 45px;
}
/* 상태 필터 알약 — 원본은 알약마다 좌표와 폭을 박아둬서 좌우 패딩이 57~65px
   까지 벌어져 있었다(높이 44px 보다 큼). flex 행으로 바꿔 내용에 맞게 줄이고
   패딩을 20px 로 통일한다. */
.filterRow {
  position: absolute;
  top: 972px;
  left: 50px;
  display: flex;
  gap: 14px;
}
.filterPill {
  height: 44px;
  padding: 0 20px;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  border-radius: 40px;
  border: 2px solid #0053e3;
  color: #005dff;
  white-space: nowrap;
}
.filterPillOn {
  background-color: #0053e3;
  color: #fff;
}
.searchBox {
  position: absolute;
  top: 966px;
  left: calc(50% - 33px);
  width: 942px;
  height: 56px;
  font-size: var(--font-body-03);
  color: #a0a0a0;
}
.searchBoxBg {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 10px;
  background-color: #fff;
  border: 2px solid #c2ddf5;
  box-sizing: border-box;
  width: 942px;
  height: 56px;
}
.searchPlaceholder {
  position: absolute;
  top: 0px;
  left: 24.66px;
  line-height: 56px;
  display: inline-block;
  width: 318.1px;
  height: 45px;
}
/* ── 컬럼 매핑 표 ───────────────────────────── */
.tableCard {
  position: absolute;
  top: 1048px;
  left: 50px;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1820px;
  height: 816px;
}
.tableHeaderBg {
  position: absolute;
  top: 1048px;
  left: 50px;
  border-radius: 20px 20px 0px 0px;
  background-color: #f1f7ff;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1820px;
  height: 99px;
}
/* 원본은 빈 img 였던 행 구분선 */
.rowDivider {
  position: absolute;
  left: 50px;
  width: 1820px;
  height: 1px;
  background-color: #d1d5db;
}
.tableHead {
  position: absolute;
  top: 1083px;
  font-size: var(--font-body-03);
  line-height: 30px;
}
.sourceCol {
  position: absolute;
  line-height: 36px;
  left: 120px;
  color: #000;
}
.standardCol {
  position: absolute;
  line-height: 36px;
  left: 458px;
  font-weight: 500;
}
.checkerCol {
  position: absolute;
  left: 1214px;
  font-weight: 500;
}
.checkedAtCol {
  position: absolute;
  left: 1491px;
  font-weight: 500;
  display: inline-block;
  width: 193px;
}
.emptyCell {
  position: absolute;
  line-height: 36px;
  left: 1214px;
  font-weight: 500;
  text-align: center;
  display: inline-block;
  width: 61px;
}
.emptyCellWide {
  position: absolute;
  line-height: 36px;
  left: 1534px;
  font-weight: 500;
  text-align: center;
  display: inline-block;
  width: 88px;
}
/* 상태 배지 */
.badge {
  position: absolute;
  left: 871px;
  width: 161px;
  height: 41px;
  font-size: var(--font-body-03);
  color: #00559e;
}
.badgeBgNeedsCheck {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 50px;
  background-color: #e5f3ff;
  width: 161px;
  height: 41px;
}
.badgeBgHuman {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 50px;
  background-color: rgba(0, 83, 227, 0.2);
  width: 161px;
  height: 41px;
}
.badgeBgNoMatch {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 50px;
  background-color: rgba(255, 0, 0, 0.18);
  width: 161px;
  height: 41px;
}
.badgeDot {
  position: absolute;
  top: 10px;
  left: 29px;
  border-radius: 50%;
  background-color: #00559e;
  width: 22px;
  height: 22px;
}
.badgeCheck {
  position: absolute;
  top: 11px;
  left: 29px;
  width: 20px;
  height: 20px;
}
.badgeLabel {
  position: absolute;
  top: 9px;
  left: 58px;
}
.badgeLabelHuman {
  color: #0053e3;
}
.badgeLabelNoMatch {
  left: 44px;
  color: #ff0000;
}
/* ── 하단 ───────────────────────────────────── */
.analyzeButton {
  position: absolute;
  top: 1938px;
  left: 1520px;
  width: 350px;
  height: 56px;
  text-align: center;
  color: #fff;
}
.analyzeButtonBg {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 10px;
  background-color: #0053e3;
  width: 350px;
  height: 56px;
}
.analyzeButtonLabel {
  position: absolute;
  line-height: 56px;
  top: 0px;
  left: 64px;
  display: inline-block;
  width: 222px;
  height: 36px;
}
.child15 {
  position: absolute;
  top: 2097px;
  left: -100px;
  background-color: #f3f3f3;
  width: 2120px;
  height: 244px;
}
</style>
