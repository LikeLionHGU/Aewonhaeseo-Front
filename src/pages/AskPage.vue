<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import logo from "../assets/logo.png";
import searchIcon from "../assets/search.png";
import { useDesignScale } from "../composables/useDesignScale";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 2181;

const { scale, offsetX } = useDesignScale(DESIGN_WIDTH);
const router = useRouter();

const PLACEHOLDER = "예: 낙동강 BOD 지난 1년 월별 평균을 보여줘";
const query = ref("");
const canSubmit = computed(() => query.value.trim().length > 0);

// 질문이 비어 있으면 다음 단계로 넘기지 않는다.
function submit() {
  if (!canSubmit.value) return;
  router.push("/conditions");
}
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
      <div :class="$style.div2">
        투명한 기술 검증으로 가장 믿을 수 있는 분석 환경을 만듭니다.
      </div>
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
      <div
        :class="[$style.caAaca4862A5402b585a54a82eParent, 'link']"
        @click="router.push('/')"
      >
        <img
          :class="$style.caAaca4862A5402b585a54a82eIcon"
          :src="logo"
          alt="로고"
        />
        <b :class="$style.b5">물</b>
        <b :class="$style.b6">볼래</b>
        <b :class="$style.b7">ㅓ</b>
      </div>
      <div :class="$style.profile" />
      <b :class="$style.b8">최근 분석 기록</b>
      <div :class="$style.div4">전체 기록 보기 →</div>
      <div :class="$style.inner" />
      <div :class="$style.child2" />
      <div :class="$style.child3" />
      <div :class="$style.child4" />
      <b :class="$style.bod">낙동강 BOD 월별 평균 추세 (2023.01~2023.12)</b>
      <b :class="$style.bod2">낙동강 BOD 월별 평균 추세 (2023.01~2023.12)</b>
      <b :class="$style.bod3">낙동강 BOD 월별 평균 추세 (2023.01~2023.12)</b>
      <b :class="$style.bod4">낙동강 BOD 월별 평균 추세 (2023.01~2023.12)</b>
      <div :class="$style.inner2">
        <div :class="$style.rectangleParent2">
          <div :class="$style.groupChild2" />
          <b :class="$style.b9">집계 완료</b>
        </div>
      </div>
      <div :class="$style.inner3">
        <div :class="$style.rectangleParent2">
          <div :class="$style.groupChild2" />
          <b :class="$style.b9">집계 완료</b>
        </div>
      </div>
      <div :class="$style.inner4">
        <div :class="$style.rectangleParent2">
          <div :class="$style.groupChild2" />
          <b :class="$style.b9">집계 완료</b>
        </div>
      </div>
      <div :class="$style.inner5">
        <div :class="$style.rectangleParent2">
          <div :class="$style.groupChild2" />
          <b :class="$style.b9">집계 완료</b>
        </div>
      </div>
      <div :class="$style.rectangleParent6">
        <div :class="$style.groupChild6" />
        <b :class="$style.v241">규칙 v2.4.1</b>
      </div>
      <div :class="$style.rectangleParent7">
        <div :class="$style.groupChild6" />
        <b :class="$style.v241">규칙 v2.4.1</b>
      </div>
      <div :class="$style.rectangleParent8">
        <div :class="$style.groupChild6" />
        <b :class="$style.v241">규칙 v2.4.1</b>
      </div>
      <div :class="$style.rectangleParent9">
        <div :class="$style.groupChild6" />
        <b :class="$style.v241">규칙 v2.4.1</b>
      </div>
      <div :class="$style.div5">2024.06.10 14:32 실행</div>
      <div :class="$style.div6">2024.06.10 14:32 실행</div>
      <div :class="$style.div7">2024.06.10 14:32 실행</div>
      <div :class="$style.div8">2024.06.10 14:32 실행</div>
      <div
        :class="[$style.rectangleParent10, 'btn']"
        role="button"
        @click="router.push('/results')"
      >
        <div :class="[$style.groupChild10, 'btn-fill']" />
        <b :class="$style.b13">결과 보기</b>
      </div>
      <div
        :class="[$style.rectangleParent11, 'btn']"
        role="button"
        @click="router.push('/results')"
      >
        <div :class="[$style.groupChild10, 'btn-fill']" />
        <b :class="$style.b13">결과 보기</b>
      </div>
      <div
        :class="[$style.rectangleParent12, 'btn']"
        role="button"
        @click="router.push('/results')"
      >
        <div :class="[$style.groupChild10, 'btn-fill']" />
        <b :class="$style.b13">결과 보기</b>
      </div>
      <div
        :class="[$style.rectangleParent13, 'btn']"
        role="button"
        @click="router.push('/results')"
      >
        <div :class="[$style.groupChild10, 'btn-fill']" />
        <b :class="$style.b13">결과 보기</b>
      </div>
      <div :class="$style.child5" />
      <img :class="$style.vectorIcon" alt="" />
      <img :class="$style.child6" alt="" />
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
        @click="router.push('/conditions')"
      >
        <div :class="[$style.groupChild14, 'btn-fill']" />
        <b :class="$style.b9">사용</b>
      </div>
      <div
        :class="[$style.rectangleParent15, 'btn']"
        role="button"
        @click="router.push('/conditions')"
      >
        <div :class="[$style.groupChild14, 'btn-fill']" />
        <b :class="$style.b9">사용</b>
      </div>
      <div
        :class="[$style.rectangleParent16, 'btn']"
        role="button"
        @click="router.push('/conditions')"
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
/* 원본은 calc(50% - 텍스트폭/2) 로 중앙을 맞춰서 글자 크기가 바뀌면 밀렸다.
   left/right 0 + fit-content + auto 여백으로 블록만 가운데 놓는다. text-align 을
   건드리지 않으므로 여러 줄 텍스트의 줄 내부 정렬은 원본 그대로 유지된다. */
.div2 {
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
  font-family: "Ria Sans";
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
  flex-shrink: 0;
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
.inner {
  position: absolute;
  top: 956px;
  left: 184px;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
  border-radius: 20px;
  background-color: #fff;
  border: 2px solid #e6e7eb;
  box-sizing: border-box;
  width: 1002px;
  height: 135px;
  flex-shrink: 0;
}
.child2 {
  position: absolute;
  top: 1111px;
  left: 184px;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
  border-radius: 20px;
  background-color: #fff;
  border: 2px solid #e6e7eb;
  box-sizing: border-box;
  width: 1002px;
  height: 135px;
  flex-shrink: 0;
}
.child3 {
  position: absolute;
  top: 1266px;
  left: 184px;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
  border-radius: 20px;
  background-color: #fff;
  border: 2px solid #e6e7eb;
  box-sizing: border-box;
  width: 1002px;
  height: 135px;
  flex-shrink: 0;
}
.child4 {
  position: absolute;
  top: 1421px;
  left: 184px;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
  border-radius: 20px;
  background-color: #fff;
  border: 2px solid #e6e7eb;
  box-sizing: border-box;
  width: 1002px;
  height: 135px;
  flex-shrink: 0;
}
.bod {
  position: absolute;
  top: 979px;
  left: 226px;
  line-height: 45px;
  color: #1f2937;
  flex-shrink: 0;
}
.bod2 {
  position: absolute;
  top: 1134px;
  left: 226px;
  line-height: 45px;
  color: #1f2937;
  flex-shrink: 0;
}
.bod3 {
  position: absolute;
  top: 1289px;
  left: 226px;
  line-height: 45px;
  color: #1f2937;
  flex-shrink: 0;
}
.bod4 {
  position: absolute;
  top: 1444px;
  left: 226px;
  line-height: 45px;
  color: #1f2937;
  flex-shrink: 0;
}
.inner2 {
  position: absolute;
  top: 1024px;
  left: 226px;
  width: 116px;
  height: 45px;
  flex-shrink: 0;
  color: #00a26a;
}
.rectangleParent2 {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 116px;
  height: 45px;
}
.groupChild2 {
  position: absolute;
  top: 4px;
  left: 0px;
  border-radius: 10px;
  background-color: #e2f8f0;
  width: 116px;
  height: 37px;
}
.b9 {
  position: absolute;
  top: 0px;
  left: 21px;
  line-height: 45px;
}
.inner3 {
  position: absolute;
  top: 1179px;
  left: 226px;
  width: 116px;
  height: 45px;
  flex-shrink: 0;
  color: #00a26a;
}
.inner4 {
  position: absolute;
  top: 1334px;
  left: 226px;
  width: 116px;
  height: 45px;
  flex-shrink: 0;
  color: #00a26a;
}
.inner5 {
  position: absolute;
  top: 1489px;
  left: 226px;
  width: 116px;
  height: 45px;
  flex-shrink: 0;
  color: #00a26a;
}
.rectangleParent6 {
  position: absolute;
  top: 1024px;
  left: 352px;
  width: 139px;
  height: 45px;
  flex-shrink: 0;
}
.groupChild6 {
  position: absolute;
  top: 4px;
  left: 0px;
  border-radius: 10px;
  background-color: #f1f7ff;
  border: 1px solid #d6e8fa;
  box-sizing: border-box;
  width: 139px;
  height: 37px;
}
.v241 {
  position: absolute;
  top: 0px;
  left: 22px;
  line-height: 45px;
}
.rectangleParent7 {
  position: absolute;
  top: 1179px;
  left: 352px;
  width: 139px;
  height: 45px;
  flex-shrink: 0;
}
.rectangleParent8 {
  position: absolute;
  top: 1334px;
  left: 352px;
  width: 139px;
  height: 45px;
  flex-shrink: 0;
}
.rectangleParent9 {
  position: absolute;
  top: 1489px;
  left: 352px;
  width: 139px;
  height: 45px;
  flex-shrink: 0;
}
.div5 {
  position: absolute;
  top: 1024px;
  left: 501px;
  line-height: 45px;
  font-weight: 500;
  color: #9ca3af;
  flex-shrink: 0;
}
.div6 {
  position: absolute;
  top: 1179px;
  left: 501px;
  line-height: 45px;
  font-weight: 500;
  color: #9ca3af;
  flex-shrink: 0;
}
.div7 {
  position: absolute;
  top: 1334px;
  left: 501px;
  line-height: 45px;
  font-weight: 500;
  color: #9ca3af;
  flex-shrink: 0;
}
.div8 {
  position: absolute;
  top: 1489px;
  left: 501px;
  line-height: 45px;
  font-weight: 500;
  color: #9ca3af;
  flex-shrink: 0;
}
.rectangleParent10 {
  position: absolute;
  top: 996px;
  left: 994px;
  width: 131px;
  height: 44px;
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
.rectangleParent11 {
  position: absolute;
  top: 1151px;
  left: 994px;
  width: 131px;
  height: 44px;
  flex-shrink: 0;
}
.rectangleParent12 {
  position: absolute;
  top: 1306px;
  left: 994px;
  width: 131px;
  height: 44px;
  flex-shrink: 0;
}
.rectangleParent13 {
  position: absolute;
  top: 1461px;
  left: 994px;
  width: 131px;
  height: 44px;
  flex-shrink: 0;
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
.vectorIcon {
  position: absolute;
  top: 1179px;
  left: 1256px;
  max-height: 100%;
  width: 439.5px;
  flex-shrink: 0;
}
.child6 {
  position: absolute;
  top: 1313px;
  left: 1256px;
  max-height: 100%;
  width: 439.5px;
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
