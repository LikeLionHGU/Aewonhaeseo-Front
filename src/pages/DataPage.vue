<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import logo from '../assets/logo.png'
import checkIcon from '../assets/check.svg'
import { useDesignScale } from '../composables/useDesignScale'

const DESIGN_WIDTH = 1920
// 원본 캔버스는 2177px 이지만 푸터(1937 + 244)가 4px 잘려서 끝까지 맞춘다.
const DESIGN_HEIGHT = 2181

const { scale, offsetX } = useDesignScale(DESIGN_WIDTH)
const router = useRouter()

// 요약 카드 — 카드 왼쪽에서 51px 들어간 자리에 글이 놓인다.
const TEXT_INSET = 51
const statCards = [
  {
    left: 50,
    label: '연결된 파일',
    value: '5',
    accent: false,
    notes: [
      { text: '기관 3곳', dx: 0 },
      { text: '·', dx: 108 },
      { text: '2024 - 2025', dx: 133 },
    ],
  },
  {
    left: 516,
    label: '전체 컬럼',
    value: '158',
    accent: false,
    notes: [
      { text: '자동 매핑', dx: 0 },
      { text: '·', dx: 108 },
      { text: '사람 확인 3', dx: 133 },
    ],
  },
  {
    left: 982,
    label: '확인 필요',
    value: '3',
    accent: true,
    notes: [{ text: '파일 2개에 분산', dx: 0 }],
  },
  {
    left: 1448,
    label: '처리 실패',
    value: '1',
    accent: true,
    notes: [{ text: '형식 확인 필요', dx: 0 }],
  },
]

// 상태 필터
const filters = ['전체', '확인 필요 3', '완료 2', '실패 1']
const activeFilter = ref('전체')

// 파일 목록 — 행 간격이 원본에서 불규칙해 좌표를 그대로 쓴다.
const COL = { file: 120, period: 588, status: 871, version: 1214, uploaded: 1481, action: 1700 }
const MAPPING_TRACK = 161

type Mapping =
  | { kind: 'partial'; label: string; fill: number }
  | { kind: 'done'; label: string }
  | { kind: 'failed'; label: string }

const fileRows: {
  top: number
  statusTop: number
  name: string
  meta: string
  period: string
  version: string
  uploaded: string
  mapping: Mapping
}[] = [
  {
    top: 1071, statusTop: 1073,
    name: '인천_수질측정_2025.xlsx', meta: '한강유역환경청 · 42개 컬럼',
    period: '2025-01 ~ 12', version: 'v0.9', uploaded: '08-08',
    mapping: { kind: 'partial', label: '확인 필요 2', fill: 150 },
  },
  {
    top: 1210, statusTop: 1212,
    name: '제주_수질측정_2025.xlsx', meta: '제주보건환경연구원 · 38개 컬럼',
    period: '2025-01 ~ 12', version: 'v0.9', uploaded: '08-08',
    mapping: { kind: 'partial', label: '확인 필요 2', fill: 150 },
  },
  {
    top: 1343, statusTop: 1345,
    name: '낙동강_보조측정.CSV', meta: '낙동강유역환경청 · 17개 컬럼',
    period: '2025-01 ~ 06', version: 'v0.9', uploaded: '08-08',
    mapping: { kind: 'partial', label: '확인 필요 2', fill: 150 },
  },
  {
    top: 1482, statusTop: 1484,
    name: '낙동강_보조측정.CSV', meta: '낙동강유역환경청 · 17개 컬럼',
    period: '2025-01 ~ 06', version: 'v0.9', uploaded: '08-08',
    mapping: { kind: 'done', label: '확인 완료' },
  },
  {
    top: 1632, statusTop: 1648,
    name: '영산강_2024_임시.csv', meta: '날짜 컬럼을 찾지 못했어요',
    period: '2025-01 ~ 06', version: 'v0.9', uploaded: '08-08',
    mapping: { kind: 'failed', label: '처리 실패' },
  },
]
const rowDividers = [1170, 1309, 1448, 1587]
</script>

<template>
  <div :class="$style.viewport" :style="{ height: `${DESIGN_HEIGHT * scale}px` }">
  <div :class="$style.div" :style="{ transform: `translateX(${offsetX}px) scale(${scale})` }">
    <b :class="[$style.b, 'link']" @click="router.push('/data')">내 데이터</b>
    <div :class="[$style.div2, 'link']" @click="router.push('/ask')">분석하기</div>
    <div :class="$style.div3">문의하기</div>
    <div :class="[$style.caAaca4862A5402b585a54a82eParent, 'link']" @click="router.push('/')">
      <img :class="$style.caAaca4862A5402b585a54a82eIcon" :src="logo" alt="로고" />
      <b :class="$style.b4">물</b>
      <b :class="$style.b5">볼래</b>
      <b :class="$style.b6">ㅓ</b>
    </div>
    <div :class="$style.profile" />
    <b :class="$style.b3">내 데이터</b>
    <b :class="$style.b2">업로드한 파일과 용어 표준화 상태를 확인할 수 있어요.</b>

    <!-- 업로드 — 전용 페이지로 이동 -->
    <div :class="[$style.rectangleParent7, 'btn']" role="button" @click="router.push('/upload')">
      <div :class="[$style.groupChild15, 'btn-fill']" />
      <b :class="$style.csv4">엑셀 · CSV 파일 업로드</b>
    </div>

    <!-- 요약 카드 -->
    <template v-for="card in statCards" :key="card.label">
      <div :class="$style.statCard" :style="{ left: `${card.left}px` }" />
      <b :class="$style.statLabel" :style="{ left: `${card.left + TEXT_INSET}px` }">{{ card.label }}</b>
      <b :class="[$style.statValue, card.accent && $style.statValueAccent]"
         :style="{ left: `${card.left + TEXT_INSET}px` }">{{ card.value }}</b>
      <div v-for="note in card.notes" :key="note.text + note.dx" :class="$style.statNote"
           :style="{ left: `${card.left + TEXT_INSET + note.dx}px` }">{{ note.text }}</div>
    </template>

    <!-- 상태 필터 + 검색 -->
    <div :class="$style.filterRow">
      <div v-for="f in filters" :key="f" role="button"
           :class="[$style.filterPill, 'btn',
                    activeFilter === f ? [$style.filterPillOn, 'btn-fill'] : 'btn-outline']"
           @click="activeFilter = f">{{ f }}</div>
    </div>
    <div :class="$style.rectangleParent">
      <div :class="$style.groupChild" />
      <div :class="$style.div15">파일명 · 기관 · 항목 검색</div>
    </div>

    <!-- 파일 목록 -->
    <div :class="$style.child6" />
    <div :class="$style.child7" />
    <div v-for="top in rowDividers" :key="top" :class="$style.rowDivider" :style="{ top: `${top}px` }" />
    <b :class="$style.tableHead" :style="{ left: `${COL.file}px` }">파일</b>
    <b :class="$style.tableHead" :style="{ left: `${COL.period}px` }">기간</b>
    <b :class="$style.tableHead" :style="{ left: '866px' }">매핑 상태</b>
    <b :class="$style.tableHead" :style="{ left: `${COL.version}px` }">사전 버전</b>
    <b :class="$style.tableHead" :style="{ left: `${COL.uploaded}px` }">업로드</b>

    <template v-for="(row, i) in fileRows" :key="i">
      <div :class="$style.fileCell" :style="{ top: `${row.top}px`, left: `${COL.file}px` }">
        <b :class="$style.fileName">{{ row.name }}</b>
        <div :class="$style.fileMeta">{{ row.meta }}</div>
      </div>
      <div :class="$style.cell" :style="{ top: `${row.top + 18}px`, left: `${COL.period}px` }">{{ row.period }}</div>
      <div :class="$style.cell" :style="{ top: `${row.top + 18}px`, left: `${COL.version}px` }">{{ row.version }}</div>
      <div :class="$style.cell" :style="{ top: `${row.top + 18}px`, left: `${COL.uploaded}px` }">{{ row.uploaded }}</div>
      <b :class="[$style.action, 'link']" :style="{ top: `${row.top + 21}px`, left: `${COL.action}px` }">확인하기 →</b>

      <!-- 매핑 상태: 진행 중이면 막대 + 알약, 완료면 꽉 찬 막대 + 체크, 실패면 붉은 알약만 -->
      <div :class="$style.mappingCell" :style="{ top: `${row.statusTop}px`, left: `${COL.status}px` }">
        <template v-if="row.mapping.kind !== 'failed'">
          <div :class="$style.barTrack" />
          <div :class="row.mapping.kind === 'done' ? $style.barFillDone : $style.barFill"
               :style="{ width: `${row.mapping.kind === 'done' ? MAPPING_TRACK : row.mapping.fill}px` }" />
          <div :class="$style.pill" />
          <template v-if="row.mapping.kind === 'done'">
            <img :class="$style.pillCheck" :src="checkIcon" alt="" />
            <b :class="[$style.pillLabel, $style.pillLabelDone]">{{ row.mapping.label }}</b>
          </template>
          <template v-else>
            <div :class="$style.pillDot" />
            <b :class="$style.pillLabel">{{ row.mapping.label }}</b>
          </template>
        </template>
        <template v-else>
          <div :class="$style.pillFailed" />
          <b :class="[$style.pillLabel, $style.pillLabelFailed]">{{ row.mapping.label }}</b>
        </template>
      </div>
    </template>

    <div :class="$style.child12" />
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
  height: 2181px;
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
  top: 82px;
  left: 50px;
  width: 144px;
  height: 35px;
  text-align: center;
  font-size: var(--font-body-01);
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
.b4 {
  position: absolute;
  top: 0px;
  left: 0px;
  line-height: 35px;
}
.b5 {
  position: absolute;
  top: 0px;
  left: 81px;
  line-height: 35px;
}
.b6 {
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
.b3 {
  position: absolute;
  top: 299px;
  left: calc(50% - 866px);
  font-size: var(--font-title-02);
  color: #0053e3;
}
.b2 {
  position: absolute;
  top: 347px;
  left: calc(50% - 866px);
  font-size: var(--font-body-03);
  line-height: 45px;
}
.rectangleParent7 {
  position: absolute;
  top: 288px;
  left: calc(50% + 580px);
  width: 320px;
  height: 56px;
  text-align: center;
  font-size: var(--font-body-03);
  color: #fff;
}
.groupChild15 {
  position: absolute;
  top: 0px;
  left: calc(50% - 160px);
  border-radius: 10px;
  background-color: #004ec2;
  width: 320px;
  height: 56px;
}
.csv4 {
  position: absolute;
  top: 0px;
  left: 27px;
  line-height: 56px;
  display: inline-block;
  width: 266px;
  height: 45px;
}
/* ── 요약 카드 ──────────────────────────────── */
.statCard {
  position: absolute;
  top: 426px;
  border-radius: 20px;
  background-color: rgba(214, 232, 250, 0.3);
  border: 2px solid #d6e8fb;
  box-sizing: border-box;
  width: 420px;
  height: 240px;
}
.statLabel {
  position: absolute;
  top: 457px;
  font-size: var(--font-body-03);
  line-height: 45px;
  color: #00559e;
}
.statValue {
  position: absolute;
  top: 510px;
  font-size: var(--font-metric);
  color: #0053e3;
}
.statValueAccent {
  color: #ff0000;
}
.statNote {
  position: absolute;
  top: 590px;
  font-size: var(--font-body-03);
  line-height: 45px;
  font-weight: 500;
}
/* 상태 필터 알약 — 원본은 알약마다 좌표와 폭을 박아둬서 좌우 패딩이 57~65px
   까지 벌어져 있었다(높이 44px 보다 큼). flex 행으로 바꿔 내용에 맞게 줄이고
   패딩을 20px 로 통일한다. */
.filterRow {
  position: absolute;
  top: 854px;
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
.rectangleParent {
  position: absolute;
  top: 848px;
  left: calc(50% - 121px);
  width: 1030px;
  height: 56px;
  font-size: var(--font-body-03);
  color: #a0a0a0;
}
.groupChild {
  position: absolute;
  top: 0px;
  left: calc(50% - 515px);
  border-radius: 10px;
  background-color: #fff;
  border: 2px solid #c2ddf5;
  box-sizing: border-box;
  width: 1030px;
  height: 56px;
}
.div15 {
  position: absolute;
  top: 0px;
  left: 26.97px;
  line-height: 56px;
  display: inline-block;
  width: 347.8px;
  height: 45px;
}
/* ── 파일 목록 ──────────────────────────────── */
.child6 {
  position: absolute;
  top: 930px;
  left: 50px;
  border-radius: 20px;
  background-color: #f8f9fc;
  border: 2px solid #d1d5db;
  box-sizing: border-box;
  width: 1820px;
  height: 816px;
}
.child7 {
  position: absolute;
  top: 930px;
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
  top: 965px;
  font-size: var(--font-body-03);
  line-height: 30px;
}
.fileCell {
  position: absolute;
  width: 323px;
  height: 72px;
  color: #000;
}
/* 표 본문 — 헤더(.tableHead 25px)와 크기를 맞춘다. line-height 는 이전 줄 상자
   높이(30px 의 normal ≈ 36px)를 그대로 유지해 세로 위치가 밀리지 않게 한다. */
.fileName {
  position: absolute;
  top: 0px;
  left: 0px;
  font-size: var(--font-body-03);
  line-height: 36px;
}
.fileMeta {
  position: absolute;
  top: 42px;
  left: 0px;
  font-size: var(--font-body-03);
  line-height: 30px;
  font-weight: 500;
  color: #9ca3af;
  display: inline-block;
  width: 323px;
}
.cell {
  position: absolute;
  font-size: var(--font-body-03);
  line-height: 36px;
  font-weight: 500;
}
.action {
  position: absolute;
  font-size: var(--font-body-03);
  line-height: 30px;
}
/* ── 매핑 상태 위젯 ─────────────────────────── */
.mappingCell {
  position: absolute;
  width: 161px;
  height: 68px;
  font-size: var(--font-body-03);
  color: #00559e;
}
.barTrack {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 40px;
  background-color: #d9d9d9;
  width: 161px;
  height: 17px;
}
.barFill {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 40px;
  background-color: #00559e;
  height: 17px;
}
.barFillDone {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 40px;
  background-color: #0053e3;
  height: 17px;
}
.pill {
  position: absolute;
  top: 27px;
  left: 0px;
  border-radius: 50px;
  background-color: #e5f3ff;
  width: 161px;
  height: 41px;
}
.pillFailed {
  position: absolute;
  top: 16px;
  left: 0px;
  border-radius: 50px;
  background-color: rgba(255, 0, 0, 0.18);
  width: 161px;
  height: 41px;
}
.pillDot {
  position: absolute;
  top: 37px;
  left: 21px;
  border-radius: 50%;
  background-color: #00559e;
  width: 22px;
  height: 22px;
}
.pillCheck {
  position: absolute;
  top: 37px;
  left: 20px;
  width: 20px;
  height: 20px;
}
.pillLabel {
  position: absolute;
  top: 36px;
  left: 50px;
}
.pillLabelDone {
  left: 46px;
  color: #0053e3;
}
.pillLabelFailed {
  top: 25px;
  left: 44px;
  color: #ff0000;
}
.child12 {
  position: absolute;
  top: 1937px;
  left: -100px;
  background-color: #f3f3f3;
  width: 2120px;
  height: 244px;
}
</style>
