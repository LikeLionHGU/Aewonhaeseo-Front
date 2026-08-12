<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import logo from '../assets/logo.png'
import dropdownIcon from '../assets/chevron-down.svg'
import { THRESHOLD_SETS } from '../constants/thresholdSets'
import { useDesignScale } from '../composables/useDesignScale'

const router = useRouter()

// 조건 선택 상태 — 그룹별로 하나씩 고른다.
const period = ref('')
const unit = ref('')
const compare = ref('')

// 직접 입력 기간 — 연/월 선택. input[type=month] 는 Safari 가 지원하지 않아
// 그냥 텍스트 칸으로 떨어지고, 네이티브 피커 팝업은 이 페이지의 scale() 배율을
// 따르지 않아 디자인과도 어긋난다. 그래서 select 로 직접 만든다.
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 11 }, (_, i) => CURRENT_YEAR - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

const fromYear = ref('')
const fromMonth = ref('')
const toYear = ref('')
const toMonth = ref('')

const yearMonth = (y: string, m: string) => (y && m ? `${y}-${m.padStart(2, '0')}` : '')
const customFrom = computed(() => yearMonth(fromYear.value, fromMonth.value))
const customTo = computed(() => yearMonth(toYear.value, toMonth.value))
// "YYYY-MM" 은 사전순 비교가 곧 시간순 비교다.
const rangeInvalid = computed(
  () => Boolean(customFrom.value && customTo.value) && customFrom.value > customTo.value,
)

// period(프리셋 칩)와 상호 배타적인데, 한쪽이 바뀔 때 다른 쪽을 지우는 watcher 를
// 두면 서로 덮어쓰기 쉽다. 그래서 직접 입력을 파생값으로 두고 "양쪽이 다 채워지고
// 순서가 맞으면 프리셋보다 우선" 이라는 한 방향 규칙만 쓴다.
const customPeriod = computed(() =>
  customFrom.value && customTo.value && !rangeInvalid.value
    ? `${customFrom.value} ~ ${customTo.value}`
    : '',
)
const periodLabel = computed(() => customPeriod.value || period.value || '미지정')

// 프리셋 칩을 고르면 직접 입력해 둔 값은 지운다.
function selectPeriod(label: string) {
  period.value = label
  fromYear.value = ''
  fromMonth.value = ''
  toYear.value = ''
  toMonth.value = ''
}

const threshold = ref('')

// select 의 기본 화살표를 지우고 기준치 세트가 쓰는 chevron 을 배경으로 깐다.
// Vite 는 작은 SVG 를 data URI 로 인라인하는데 그 안의 작은따옴표를 인코딩하지
// 않는다. 따옴표 없는 url() 토큰에는 ' 가 들어갈 수 없어 선언이 통째로 버려지므로
// 반드시 큰따옴표로 감싸야 한다.
const caret = { backgroundImage: `url("${dropdownIcon}")` }

const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 2363

const { scale, offsetX } = useDesignScale(DESIGN_WIDTH)
</script>

<template>
  <div :class="$style.viewport" :style="{ height: `${DESIGN_HEIGHT * scale}px` }">
  <div :class="$style.div" :style="{ transform: `translateX(${offsetX}px) scale(${scale})` }">
    <div :class="$style.child" />
    <div :class="$style.item" />
    <div :class="$style.inner" />
    <div :class="$style.rectangleDiv" />
    <b :class="$style.b">분석 조건 확인</b>
    <b :class="$style.b2">누락된 조건을 선택해주세요.</b>
    <b :class="$style.b3">분석 기간</b>
    <div :class="$style.div2">선택한 기간의 수질 측정 데이터를 원하는 시간 단위로 집계하여 평균과 추세를 확인합니다.</div>
    <div :class="$style.div3">분석 결과를 비교할 기준을 선택합니다.</div>
    <div :class="$style.div4">분석 결과를 비교할 수질 기준을 선택합니다.</div>
    <div :class="$style.div5">분석에 사용할 데이터의 조회 기간을 설정합니다.</div>
    <b :class="$style.b4">집계 단위</b>
    <b :class="$style.b5">비교 옵션</b>
    <b :class="$style.b6">적용 기준치</b>
    <div :class="$style.div6">직접 입력 (예: 2023년 1월 ~ 2023년 2월)</div>
    <div :class="$style.child2">
      <div :class="$style.ymGroup">
        <select v-model="fromYear" :class="[$style.ymSelect, $style.ymYear, !fromYear && $style.ymEmpty]"
                :style="caret" aria-label="시작 연도">
          <option value="" disabled>연도</option>
          <option v-for="y in YEARS" :key="y" :value="String(y)">{{ y }}년</option>
        </select>
        <select v-model="fromMonth" :class="[$style.ymSelect, $style.ymMonth, !fromMonth && $style.ymEmpty]"
                :style="caret" aria-label="시작 월">
          <option value="" disabled>월</option>
          <option v-for="m in MONTHS" :key="m" :value="String(m)">{{ m }}월</option>
        </select>
      </div>
      <span :class="$style.periodTilde">~</span>
      <div :class="$style.ymGroup">
        <select v-model="toYear" :class="[$style.ymSelect, $style.ymYear, !toYear && $style.ymEmpty]"
                :style="caret" aria-label="종료 연도">
          <option value="" disabled>연도</option>
          <option v-for="y in YEARS" :key="y" :value="String(y)">{{ y }}년</option>
        </select>
        <select v-model="toMonth" :class="[$style.ymSelect, $style.ymMonth, !toMonth && $style.ymEmpty]"
                :style="caret" aria-label="종료 월">
          <option value="" disabled>월</option>
          <option v-for="m in MONTHS" :key="m" :value="String(m)">{{ m }}월</option>
        </select>
      </div>
      <span v-if="rangeInvalid" :class="$style.rangeHint" role="alert">시작이 종료보다 늦어요</span>
    </div>
    <div :class="$style.div7">투명한 기술 검증으로 가장 믿을 수 있는 분석 환경을 만듭니다.</div>
    <div :class="$style.child3" />
    <div :class="$style.wrapper">
      <b :class="$style.b7">입력된 질문</b>
    </div>
    <b :class="$style.bod">한강 수계 BOD 수치가 기준치를 초과한 구간을 알려줘</b>
    <div :class="[$style.rectangleGroup, 'btn']" role="button" @click="selectPeriod('최근 1개월')">
      <div :class="[$style.groupItem, !customPeriod && period === '최근 1개월' && $style.chipOn, 'btn-fill']" />
      <div :class="$style.div9">최근 1개월</div>
    </div>
    <div :class="[$style.rectangleContainer, 'btn']" role="button" @click="unit = '월별'">
      <div :class="[$style.groupInner, unit === '월별' && $style.chipOn, 'btn-fill']" />
      <div :class="$style.div10">월별</div>
    </div>
    <div :class="[$style.groupDiv, 'btn']" role="button" @click="compare = '전년 동기 비교'">
      <div :class="[$style.groupChild2, compare === '전년 동기 비교' && $style.chipOn, 'btn-fill']" />
      <div :class="$style.div11">전년 동기 비교</div>
    </div>
    <div :class="[$style.rectangleParent2, 'btn']" role="button" @click="compare = '다중 지점 비교'">
      <div :class="[$style.groupChild2, compare === '다중 지점 비교' && $style.chipOn, 'btn-fill']" />
      <div :class="$style.div11">다중 지점 비교</div>
    </div>
    <div :class="[$style.rectangleParent3, 'btn']" role="button" @click="compare = '비교 없음'">
      <div :class="[$style.groupChild4, compare === '비교 없음' && $style.chipOn, 'btn-fill']" />
      <div :class="$style.div13">비교 없음</div>
    </div>
    <div :class="[$style.rectangleParent4, 'btn']" role="button" @click="unit = '연별'">
      <div :class="[$style.groupInner, unit === '연별' && $style.chipOn, 'btn-fill']" />
      <div :class="$style.div10">연별</div>
    </div>
    <div :class="[$style.rectangleParent5, 'btn']" role="button" @click="unit = '분기별'">
      <div :class="[$style.groupInner, unit === '분기별' && $style.chipOn, 'btn-fill']" />
      <div :class="$style.div15">분기별</div>
    </div>
    <div :class="[$style.rectangleParent6, 'btn']" role="button" @click="selectPeriod('최근 3개월')">
      <div :class="[$style.groupItem, !customPeriod && period === '최근 3개월' && $style.chipOn, 'btn-fill']" />
      <div :class="$style.div9">최근 3개월</div>
    </div>
    <div :class="[$style.rectangleParent7, 'btn']" role="button" @click="selectPeriod('최근 1년')">
      <div :class="[$style.groupItem, !customPeriod && period === '최근 1년' && $style.chipOn, 'btn-fill']" />
      <div :class="$style.div11">최근 1년</div>
    </div>
    <div :class="[$style.rectangleParent8, 'btn']" role="button" @click="selectPeriod('최근 3년')">
      <div :class="[$style.groupItem, !customPeriod && period === '최근 3년' && $style.chipOn, 'btn-fill']" />
      <div :class="$style.div11">최근 3년</div>
    </div>
    <!-- 요약 칩 — 고른 조건이 그대로 반영된다 -->
    <div :class="$style.summaryRow">
      <div :class="[$style.summaryChip, $style.summaryChipWide]">즉청 지점: 한강 수계</div>
      <div :class="$style.summaryChip">측정 항목: BOD</div>
      <div :class="$style.summaryChip">기간: {{ periodLabel }}</div>
      <div :class="$style.summaryChip">집계 단위: {{ unit || '미지정' }}</div>
    </div>
    <div :class="$style.div21">기준치 세트 선택</div>
    <select v-model="threshold" :class="[$style.thresholdSelect, !threshold && $style.ymEmpty]"
            :style="caret" aria-label="적용 기준치 세트">
      <option value="" disabled>Select ..</option>
      <optgroup v-for="group in THRESHOLD_SETS" :key="group.label" :label="group.label">
        <option v-for="name in group.options" :key="name" :value="name">{{ name }}</option>
      </optgroup>
    </select>
    <div :class="[$style.rectangleParent13, 'btn']" role="button" @click="router.push('/results')">
      <div :class="[$style.groupChild14, 'btn-fill']" />
      <b :class="$style.b8">분석 시작하기</b>
    </div>
    <div :class="$style.child4" />
    <div :class="[$style.caAaca4862A5402b585a54a82eParent, 'link']" @click="router.push('/')">
      <img :class="$style.caAaca4862A5402b585a54a82eIcon" :src="logo" alt="로고" />
      <b :class="$style.b9">물</b>
      <b :class="$style.b10">볼래</b>
      <b :class="$style.b11">ㅓ</b>
    </div>
    <div :class="$style.profile" />
    <div :class="[$style.div22, 'link']" @click="router.push('/data')">내 데이터</div>
    <div :class="[$style.div23, 'link']" @click="router.push('/ask')">분석하기</div>
    <div :class="$style.div24">문의하기</div>
    <div :class="[$style.div25, 'link']" @click="router.push('/ask')">←</div>
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
  height: 2363px;
  position: relative;
  background-color: #f8f9fc;
  text-align: left;
  font-size: var(--font-body-03);
  color: #455772;
  font-family: Pretendard;
  transform-origin: top left;
}
.child {
  position: absolute;
  top: 705px;
  left: 184px;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
  border-radius: 20px;
  background-color: #fcfcfc;
  border: 2px solid #d6e8fa;
  box-sizing: border-box;
  width: 1552px;
  height: 454px;
  flex-shrink: 0;
}
.item {
  position: absolute;
  top: 1176px;
  left: 184px;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
  border-radius: 20px;
  background-color: #fcfcfc;
  border: 2px solid #d6e8fa;
  box-sizing: border-box;
  width: 1552px;
  height: 223px;
  flex-shrink: 0;
}
.inner {
  position: absolute;
  top: 1416px;
  left: 184px;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
  border-radius: 20px;
  background-color: #fcfcfc;
  border: 2px solid #d6e8fa;
  box-sizing: border-box;
  width: 1552px;
  height: 223px;
  flex-shrink: 0;
}
/* 요약 칩 — 원본은 251px 고정 폭 상자에 텍스트를 하드코딩된 left 로 밀어넣어
   가운데를 맞췄다. 내용이 바뀌면 그 좌표가 무너지므로 flex 행으로 바꿔 칩이
   내용에 맞게 늘어나게 한다. 원본의 시작 좌표(247)와 간격(15px)은 그대로다. */
.summaryRow {
  position: absolute;
  top: 468px;
  left: 247px;
  display: flex;
  gap: 15px;
  flex-shrink: 0;
}
.summaryChip {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 251px;
  height: 54px;
  padding: 0 24px;
  box-sizing: border-box;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d0d0d0;
  font-weight: 600;
  white-space: nowrap;
}
.summaryChipWide {
  min-width: 363px;
}
/* 선택된 조건 칩 — 테두리와 배경만 강조 (텍스트는 그대로) */
.chipOn {
  background-color: #d6e8fa;
  border-color: #0053e3;
}
.rectangleDiv {
  position: absolute;
  top: 1657px;
  left: 184px;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
  border-radius: 20px;
  background-color: #fcfcfc;
  border: 2px solid #d6e8fa;
  box-sizing: border-box;
  width: 1552px;
  height: 226px;
  flex-shrink: 0;
}
/* 직접 입력 영역 — Figma 는 이 상자를 내용 없이 내보냈다. 같은 페이지의
   단일 입력 필드(기준치 세트)가 1482×57 인데 이건 162px 이라, 한 줄짜리
   필드가 아니라 시작·종료 두 필드를 담는 영역으로 보고 채운다. */
.child2 {
  position: absolute;
  top: 972px;
  left: 219px;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
  border-radius: 10px;
  background-color: #fff;
  border: 2px solid #e6e7eb;
  box-sizing: border-box;
  width: 1482px;
  height: 162px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 40px;
}
.ymGroup {
  display: flex;
  gap: 12px;
}
/* select 는 폰트를 상속하지 않고 기본 화살표도 붙으므로 둘 다 직접 지정한다.
   화살표 자리(오른쪽 44px)를 padding 으로 비워 둔다. */
.ymSelect {
  height: 60px;
  padding: 0 44px 0 20px;
  box-sizing: border-box;
  border-radius: 10px;
  border: 2px solid #d6e8fa;
  background-color: #fff;
  background-repeat: no-repeat;
  background-position: right 18px center;
  background-size: 24px 11px;
  -webkit-appearance: none;
  appearance: none;
  outline: none;
  font-family: inherit;
  font-size: inherit;
  font-weight: 500;
  color: #1f2937;
  cursor: pointer;
}
.ymSelect:focus {
  border-color: #0053e3;
}
/* 적용 기준치 세트 — 원본은 상자 + 텍스트 + 아이콘 이미지로 된 가짜 드롭다운이었다.
   화살표 위치(오른쪽 32px)는 원본 아이콘 좌표를 그대로 옮긴 값이다. */
.thresholdSelect {
  position: absolute;
  top: 1801px;
  left: 219px;
  width: 1482px;
  height: 57px;
  padding: 0 68px 0 15px;
  box-sizing: border-box;
  border-radius: 10px;
  border: 2px solid #d6e8fa;
  background-color: #fff;
  background-repeat: no-repeat;
  background-position: right 32px center;
  background-size: 24px 11px;
  -webkit-appearance: none;
  appearance: none;
  outline: none;
  font-family: inherit;
  font-size: inherit;
  font-weight: 500;
  color: #1f2937;
  cursor: pointer;
}
.thresholdSelect:focus {
  border-color: #0053e3;
}
/* 아직 안 고른 상태는 placeholder 처럼 회색 */
.ymEmpty {
  color: #9ca3af;
}
.ymYear {
  width: 170px;
}
.ymMonth {
  width: 140px;
}
.periodTilde {
  font-weight: 600;
  color: #9ca3af;
}
.rangeHint {
  font-weight: 600;
  color: #d92d20;
}
.b {
  position: absolute;
  top: 234px;
  left: 210px;
  font-size: var(--font-body-01);
  color: #002f5f;
  flex-shrink: 0;
}
.b2 {
  position: absolute;
  top: 650px;
  left: 219px;
  font-size: var(--font-body-01);
  color: #002f5f;
  flex-shrink: 0;
}
.b3 {
  position: absolute;
  top: 731px;
  left: 219px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #00559e;
  flex-shrink: 0;
}
.div2 {
  position: absolute;
  top: 1247px;
  left: 219px;
  line-height: 45px;
  font-weight: 500;
  color: #9ca3af;
  flex-shrink: 0;
}
.div3 {
  position: absolute;
  top: 1487px;
  left: 219px;
  line-height: 45px;
  font-weight: 500;
  color: #9ca3af;
  flex-shrink: 0;
}
.div4 {
  position: absolute;
  top: 1683px;
  left: 358px;
  line-height: 45px;
  font-weight: 500;
  color: #9ca3af;
  flex-shrink: 0;
}
.div5 {
  position: absolute;
  top: 776px;
  left: 219px;
  line-height: 45px;
  font-weight: 500;
  color: #9ca3af;
  display: inline-block;
  width: 376px;
  height: 45px;
  flex-shrink: 0;
}
.b4 {
  position: absolute;
  top: 1202px;
  left: 219px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #00559e;
  flex-shrink: 0;
}
.b5 {
  position: absolute;
  top: 1442px;
  left: 219px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #00559e;
  flex-shrink: 0;
}
.b6 {
  position: absolute;
  top: 1683px;
  left: 219px;
  font-size: var(--font-body-02);
  line-height: 45px;
  color: #00559e;
  flex-shrink: 0;
}
.div6 {
  position: absolute;
  top: 931px;
  left: 228px;
  line-height: 45px;
  font-weight: 500;
  color: #9ca3af;
  flex-shrink: 0;
}
/* 원본은 calc(50% - 텍스트폭/2) 로 중앙을 맞춰서 글자 크기가 바뀌면 밀렸다.
   left/right 0 + fit-content + auto 여백으로 블록만 가운데 놓는다. text-align 을
   건드리지 않으므로 여러 줄 텍스트의 줄 내부 정렬은 원본 그대로 유지된다. */
.div7 {
  position: absolute;
  top: 2524px;
  left: 0px;
  right: 0px;
  width: fit-content;
  margin-inline: auto;
  font-size: var(--font-body-01);
  line-height: 55px;
  font-weight: 500;
  color: #fff;
  text-align: right;
  flex-shrink: 0;
}
.child3 {
  position: absolute;
  top: 302px;
  left: 184px;
  box-shadow: 3px 3px 10px 1px rgba(179, 179, 179, 0.2);
  border-radius: 30px;
  background: linear-gradient(-10.99deg, #fff, #f9fbff 36.03%, #f2f8ff);
  border: 2px solid #d6e8fb;
  box-sizing: border-box;
  width: 1552px;
  height: 262px;
  flex-shrink: 0;
}
.wrapper {
  position: absolute;
  top: 344px;
  left: 247px;
  width: 92px;
  height: 45px;
  flex-shrink: 0;
  color: #004ec2;
}
.b7 {
  position: absolute;
  top: 0px;
  left: 0px;
  line-height: 45px;
}
.bod {
  position: absolute;
  top: 389px;
  left: 247px;
  font-size: var(--font-body-01);
  line-height: 45px;
  display: inline-block;
  color: #00559e;
  width: 655px;
  height: 45px;
  flex-shrink: 0;
}
.rectangleGroup {
  position: absolute;
  top: 849px;
  left: 219px;
  width: 170px;
  height: 44px;
  flex-shrink: 0;
}
.groupItem {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d6e8fa;
  box-sizing: border-box;
  width: 170px;
  height: 44px;
}
.div9 {
  position: absolute;
  top: 0px;
  left: 43px;
  line-height: 44px;
  font-weight: 600;
  text-shadow: 1px 0 0 #d6e8fa, 0 1px 0 #d6e8fa, -1px 0 0 #d6e8fa, 0 -1px 0 #d6e8fa;
}
.rectangleContainer {
  position: absolute;
  top: 1320px;
  left: 219px;
  width: 119px;
  height: 44px;
  flex-shrink: 0;
}
.groupInner {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d6e8fa;
  box-sizing: border-box;
  width: 119px;
  height: 44px;
}
.div10 {
  position: absolute;
  top: 0px;
  left: 42px;
  line-height: 44px;
  font-weight: 600;
  text-shadow: 1px 0 0 #d6e8fa, 0 1px 0 #d6e8fa, -1px 0 0 #d6e8fa, 0 -1px 0 #d6e8fa;
}
.groupDiv {
  position: absolute;
  top: 1560px;
  left: 219px;
  width: 217px;
  height: 44px;
  flex-shrink: 0;
}
.groupChild2 {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d6e8fa;
  box-sizing: border-box;
  width: 217px;
  height: 44px;
}
.div11 {
  position: absolute;
  top: 0px;
  left: 52px;
  line-height: 44px;
  font-weight: 600;
  text-shadow: 1px 0 0 #d6e8fa, 0 1px 0 #d6e8fa, -1px 0 0 #d6e8fa, 0 -1px 0 #d6e8fa;
}
.rectangleParent2 {
  position: absolute;
  top: 1560px;
  left: 448px;
  width: 217px;
  height: 44px;
  flex-shrink: 0;
}
.rectangleParent3 {
  position: absolute;
  top: 1560px;
  left: 677px;
  width: 174px;
  height: 44px;
  flex-shrink: 0;
}
.groupChild4 {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #d6e8fa;
  box-sizing: border-box;
  width: 174px;
  height: 44px;
}
.div13 {
  position: absolute;
  top: 0px;
  left: 50px;
  line-height: 44px;
  font-weight: 600;
  text-shadow: 1px 0 0 #d6e8fa, 0 1px 0 #d6e8fa, -1px 0 0 #d6e8fa, 0 -1px 0 #d6e8fa;
}
.rectangleParent4 {
  position: absolute;
  top: 1320px;
  left: 481px;
  width: 119px;
  height: 44px;
  flex-shrink: 0;
}
.rectangleParent5 {
  position: absolute;
  top: 1320px;
  left: 350px;
  width: 119px;
  height: 44px;
  flex-shrink: 0;
}
.div15 {
  position: absolute;
  top: 0px;
  left: 34px;
  line-height: 44px;
  font-weight: 600;
  text-shadow: 1px 0 0 #d6e8fa, 0 1px 0 #d6e8fa, -1px 0 0 #d6e8fa, 0 -1px 0 #d6e8fa;
}
.rectangleParent6 {
  position: absolute;
  top: 849px;
  left: 401px;
  width: 170px;
  height: 44px;
  flex-shrink: 0;
}
.rectangleParent7 {
  position: absolute;
  top: 849px;
  left: 583px;
  width: 170px;
  height: 44px;
  flex-shrink: 0;
}
.rectangleParent8 {
  position: absolute;
  top: 849px;
  left: 765px;
  width: 170px;
  height: 44px;
  flex-shrink: 0;
}
.div21 {
  position: absolute;
  top: 1728px;
  left: 219px;
  line-height: 45px;
  font-weight: 600;
  text-shadow: 1px 0 0 #d6e8fa, 0 1px 0 #d6e8fa, -1px 0 0 #d6e8fa, 0 -1px 0 #d6e8fa;
  flex-shrink: 0;
}
.rectangleParent13 {
  position: absolute;
  top: 1925px;
  left: calc(50% + 533px);
  width: 243.2px;
  height: 48px;
  flex-shrink: 0;
  text-align: center;
  color: #fff;
}
.groupChild14 {
  position: absolute;
  top: 0px;
  left: calc(50% - 121.6px);
  border-radius: 10px;
  background-color: #004ec2;
  width: 243.2px;
  height: 48px;
}
.b8 {
  position: absolute;
  top: 0px;
  left: 49px;
  line-height: 48px;
  display: inline-block;
  width: 145px;
  height: 45px;
}
/* 분석 시작하기 버튼(~1986)과 푸터 사이 여백. 원본은 86px 이라 답답해서
   206px 으로 넓혔다. DESIGN_HEIGHT 도 같은 만큼 늘려야 푸터가 잘리지 않는다. */
.child4 {
  position: absolute;
  top: 2192px;
  left: -100px;
  background-color: #d9d9d9;
  width: 2120px;
  height: 171px;
  flex-shrink: 0;
}
.caAaca4862A5402b585a54a82eParent {
  position: absolute;
  top: 82px;
  left: 50px;
  width: 144px;
  height: 35px;
  flex-shrink: 0;
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
.b9 {
  position: absolute;
  top: 0px;
  left: 0px;
  line-height: 35px;
}
.b10 {
  position: absolute;
  top: 0px;
  left: 81px;
  line-height: 35px;
}
.b11 {
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
  flex-shrink: 0;
}
.div22 {
  position: absolute;
  top: 85px;
  left: calc(50% - 676px);
  font-size: var(--font-body-02);
  font-weight: 500;
  color: #00559e;
  text-align: center;
  flex-shrink: 0;
}
/* 내비게이션의 현재 섹션 표시 — 굵게 + 밑줄 */
.div23 {
  position: absolute;
  top: 85px;
  left: calc(50% - 528px);
  font-size: var(--font-body-02);
  font-weight: 700;
  text-decoration: underline;
  color: #00559e;
  text-align: center;
  flex-shrink: 0;
}
.div24 {
  position: absolute;
  top: 85px;
  left: calc(50% - 386px);
  font-size: var(--font-body-02);
  font-weight: 500;
  color: #00559e;
  flex-shrink: 0;
}
.div25 {
  position: absolute;
  top: 228px;
  left: 50px;
  font-size: var(--font-title-02);
  font-weight: 600;
  color: #00559e;
  text-align: center;
  flex-shrink: 0;
}
</style>
