<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import logo from '../assets/logo.png'
import dropdownIcon from '../assets/chevron-down.svg'
import { useDesignScale } from '../composables/useDesignScale'

const router = useRouter()

// 조건 선택 상태 — 그룹별로 하나씩 고른다.
const period = ref('')
const unit = ref('')
const compare = ref('')

const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 2242

const scale = useDesignScale(DESIGN_WIDTH)
</script>

<template>
  <div :class="$style.viewport" :style="{ height: `${DESIGN_HEIGHT * scale}px` }">
  <div :class="$style.div" :style="{ transform: `scale(${scale})` }">
    <div :class="$style.child" />
    <div :class="$style.item" />
    <div :class="$style.inner" />
    <div :class="$style.rectangleDiv" />
    <div :class="$style.child2" />
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
    <div :class="$style.div7">투명한 기술 검증으로 가장 믿을 수 있는 분석 환경을 만듭니다.</div>
    <div :class="$style.child3" />
    <div :class="$style.wrapper">
      <b :class="$style.b7">입력된 질문</b>
    </div>
    <b :class="$style.bod">한강 수계 BOD 수치가 기준치를 초과한 구간을 알려줘</b>
    <div :class="$style.rectangleParent">
      <div :class="$style.groupChild" />
      <div :class="$style.div8">즉청 지점: 한강 수계</div>
    </div>
    <div :class="[$style.rectangleGroup, 'btn']" role="button" @click="period = '최근 1개월'">
      <div :class="[$style.groupItem, period === '최근 1개월' && $style.chipOn, 'btn-fill']" />
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
    <div :class="[$style.rectangleParent6, 'btn']" role="button" @click="period = '최근 3개월'">
      <div :class="[$style.groupItem, period === '최근 3개월' && $style.chipOn, 'btn-fill']" />
      <div :class="$style.div9">최근 3개월</div>
    </div>
    <div :class="[$style.rectangleParent7, 'btn']" role="button" @click="period = '최근 1년'">
      <div :class="[$style.groupItem, period === '최근 1년' && $style.chipOn, 'btn-fill']" />
      <div :class="$style.div11">최근 1년</div>
    </div>
    <div :class="[$style.rectangleParent8, 'btn']" role="button" @click="period = '최근 3년'">
      <div :class="[$style.groupItem, period === '최근 3년' && $style.chipOn, 'btn-fill']" />
      <div :class="$style.div11">최근 3년</div>
    </div>
    <div :class="$style.rectangleParent9">
      <div :class="$style.groupChild10" />
      <div :class="$style.bod2">측정 항목: BOD</div>
    </div>
    <div :class="$style.rectangleParent10">
      <div :class="$style.groupChild10" />
      <div :class="$style.div19">기간: 미지정</div>
    </div>
    <div :class="$style.rectangleParent11">
      <div :class="$style.groupChild10" />
      <div :class="$style.div20">집계 단위: 미지정</div>
    </div>
    <div :class="$style.div21">기준치 세트 선택</div>
    <div :class="$style.rectangleParent12">
      <div :class="$style.groupChild13" />
      <div :class="$style.select">Select ..</div>
      <img :class="$style.vectorIcon" :src="dropdownIcon" alt="" />
    </div>
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
    <div :class="$style.ellipseDiv" />
    <div :class="[$style.div22, 'link']" @click="router.push('/main')">내 데이터</div>
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
  height: 2242px;
  position: relative;
  background-color: #f8f9fc;
  overflow: hidden;
  text-align: left;
  font-size: 20px;
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
}
.b {
  position: absolute;
  top: 234px;
  left: 210px;
  font-size: 30px;
  color: #002f5f;
  flex-shrink: 0;
}
.b2 {
  position: absolute;
  top: 650px;
  left: 219px;
  font-size: 30px;
  color: #002f5f;
  flex-shrink: 0;
}
.b3 {
  position: absolute;
  top: 731px;
  left: 219px;
  font-size: 25px;
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
  font-size: 25px;
  line-height: 45px;
  color: #00559e;
  flex-shrink: 0;
}
.b5 {
  position: absolute;
  top: 1442px;
  left: 219px;
  font-size: 25px;
  line-height: 45px;
  color: #00559e;
  flex-shrink: 0;
}
.b6 {
  position: absolute;
  top: 1683px;
  left: 219px;
  font-size: 25px;
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
.div7 {
  position: absolute;
  top: 2524px;
  left: calc(50% - 365px);
  font-size: 30px;
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
  font-size: 30px;
  line-height: 45px;
  display: inline-block;
  color: #00559e;
  width: 655px;
  height: 45px;
  flex-shrink: 0;
}
.rectangleParent {
  position: absolute;
  top: 468px;
  left: 247px;
  width: 363px;
  height: 54px;
  flex-shrink: 0;
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
.div8 {
  position: absolute;
  top: 5px;
  left: 103px;
  line-height: 45px;
  font-weight: 600;
}
.rectangleGroup {
  position: absolute;
  top: 849px;
  left: 219px;
  width: 170px;
  height: 54px;
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
  height: 54px;
}
.div9 {
  position: absolute;
  top: 5px;
  left: 43px;
  line-height: 45px;
  font-weight: 600;
  text-shadow: 1px 0 0 #d6e8fa, 0 1px 0 #d6e8fa, -1px 0 0 #d6e8fa, 0 -1px 0 #d6e8fa;
}
.rectangleContainer {
  position: absolute;
  top: 1320px;
  left: 219px;
  width: 119px;
  height: 54px;
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
  height: 54px;
}
.div10 {
  position: absolute;
  top: 5px;
  left: 42px;
  line-height: 45px;
  font-weight: 600;
  text-shadow: 1px 0 0 #d6e8fa, 0 1px 0 #d6e8fa, -1px 0 0 #d6e8fa, 0 -1px 0 #d6e8fa;
}
.groupDiv {
  position: absolute;
  top: 1560px;
  left: 219px;
  width: 217px;
  height: 54px;
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
  height: 54px;
}
.div11 {
  position: absolute;
  top: 5px;
  left: 52px;
  line-height: 45px;
  font-weight: 600;
  text-shadow: 1px 0 0 #d6e8fa, 0 1px 0 #d6e8fa, -1px 0 0 #d6e8fa, 0 -1px 0 #d6e8fa;
}
.rectangleParent2 {
  position: absolute;
  top: 1560px;
  left: 448px;
  width: 217px;
  height: 54px;
  flex-shrink: 0;
}
.rectangleParent3 {
  position: absolute;
  top: 1560px;
  left: 677px;
  width: 174px;
  height: 54px;
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
  height: 54px;
}
.div13 {
  position: absolute;
  top: 5px;
  left: 50px;
  line-height: 45px;
  font-weight: 600;
  text-shadow: 1px 0 0 #d6e8fa, 0 1px 0 #d6e8fa, -1px 0 0 #d6e8fa, 0 -1px 0 #d6e8fa;
}
.rectangleParent4 {
  position: absolute;
  top: 1320px;
  left: 481px;
  width: 119px;
  height: 54px;
  flex-shrink: 0;
}
.rectangleParent5 {
  position: absolute;
  top: 1320px;
  left: 350px;
  width: 119px;
  height: 54px;
  flex-shrink: 0;
}
.div15 {
  position: absolute;
  top: 5px;
  left: 34px;
  line-height: 45px;
  font-weight: 600;
  text-shadow: 1px 0 0 #d6e8fa, 0 1px 0 #d6e8fa, -1px 0 0 #d6e8fa, 0 -1px 0 #d6e8fa;
}
.rectangleParent6 {
  position: absolute;
  top: 849px;
  left: 401px;
  width: 170px;
  height: 54px;
  flex-shrink: 0;
}
.rectangleParent7 {
  position: absolute;
  top: 849px;
  left: 583px;
  width: 170px;
  height: 54px;
  flex-shrink: 0;
}
.rectangleParent8 {
  position: absolute;
  top: 849px;
  left: 765px;
  width: 170px;
  height: 54px;
  flex-shrink: 0;
}
.rectangleParent9 {
  position: absolute;
  top: 468px;
  left: 625px;
  width: 251px;
  height: 54px;
  flex-shrink: 0;
}
.groupChild10 {
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
.bod2 {
  position: absolute;
  top: 5px;
  left: 63px;
  line-height: 45px;
  font-weight: 600;
}
.rectangleParent10 {
  position: absolute;
  top: 468px;
  left: 891px;
  width: 251px;
  height: 54px;
  flex-shrink: 0;
}
.div19 {
  position: absolute;
  top: 5px;
  left: 77px;
  line-height: 45px;
  font-weight: 600;
}
.rectangleParent11 {
  position: absolute;
  top: 468px;
  left: 1157px;
  width: 251px;
  height: 54px;
  flex-shrink: 0;
}
.div20 {
  position: absolute;
  top: 5px;
  left: 58px;
  line-height: 45px;
  font-weight: 600;
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
.rectangleParent12 {
  position: absolute;
  top: 1801px;
  left: 219px;
  width: 1482px;
  height: 57px;
  flex-shrink: 0;
  color: #9ca3af;
}
.groupChild13 {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 10px;
  background-color: #fff;
  border: 2px solid #d6e8fa;
  box-sizing: border-box;
  width: 1482px;
  height: 57px;
}
.select {
  position: absolute;
  top: 6px;
  left: 15px;
  line-height: 45px;
  font-weight: 500;
}
.vectorIcon {
  position: absolute;
  top: 23px;
  left: 1426px;
  width: 24px;
  height: 11px;
}
.rectangleParent13 {
  position: absolute;
  top: 1925px;
  left: calc(50% + 533px);
  width: 243.2px;
  height: 61px;
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
  height: 61px;
}
.b8 {
  position: absolute;
  top: 8px;
  left: 49px;
  line-height: 45px;
  display: inline-block;
  width: 145px;
  height: 45px;
}
.child4 {
  position: absolute;
  top: 2072px;
  left: 3px;
  background-color: #d9d9d9;
  width: 1920px;
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
.ellipseDiv {
  position: absolute;
  top: 50px;
  left: 1770px;
  border-radius: 50%;
  background-color: #d9d9d9;
  width: 100px;
  height: 100px;
  flex-shrink: 0;
}
.div22 {
  position: absolute;
  top: 85px;
  left: calc(50% - 676px);
  font-size: 25px;
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
  font-size: 25px;
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
  font-size: 25px;
  font-weight: 500;
  color: #00559e;
  flex-shrink: 0;
}
.div25 {
  position: absolute;
  top: 228px;
  left: 50px;
  font-size: 40px;
  font-weight: 600;
  color: #00559e;
  text-align: center;
  flex-shrink: 0;
}
</style>
