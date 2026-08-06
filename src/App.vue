<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import logo from './assets/logo.png'

const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 5668

const scale = ref(1)

function updateScale() {
  scale.value = window.innerWidth / DESIGN_WIDTH
}

onMounted(() => {
  updateScale()
  window.addEventListener('resize', updateScale)
})
onUnmounted(() => {
  window.removeEventListener('resize', updateScale)
})
</script>

<template>
  <div :class="$style.viewport" :style="{ height: `${DESIGN_HEIGHT * scale}px` }">
    <div :class="$style.div" :style="{ transform: `scale(${scale})` }">
    <div :class="$style.child" />
    <div :class="$style.item" />
    <b :class="$style.b">엑셀을 여는 순간<br/>지쳐버리는 수질 데이터 분석,</b>
    <b :class="$style.b2">이제 질문 한 줄이면<br/>충분합니다.</b>
    <div :class="$style.div2">복잡한 수질 데이터 취합부터 근거 확인까지, 질문 한 줄로 통계와 원본 출처를 한눈에.</div>
    <div :class="$style.inner" />
    <div :class="$style.rectangleDiv" />
    <div :class="$style.div3">지금 시작하기</div>
    <div :class="$style.div4">기능 더 알아보기</div>
    <img :class="$style.caAaca4862A5402b585a54a82eIcon" :src="logo" alt="로고" />
    <div :class="$style.child2" />
    <b :class="$style.ai">질문부터 검증까지, 3개 AI 레이어의 정밀한 흐름.<br/>데이터 취합부터 출처 검증까지, 3단계로 완성되는 AI 분석.</b>
    <b :class="$style.b3">질문부터 근거 확인까지, 세 단계면 끝.</b>
    <img :class="$style.rectangleIcon" alt="" />
    <img :class="$style.child3" alt="" />
    <img :class="$style.child4" alt="" />
    <b :class="$style.b4">알아서 통일되는 수질 용어</b>
    <b :class="$style.b5">말 한마디로 시작하는 데이터 분석</b>
    <b :class="$style.b6">100% 검증 가능한 원본 출처</b>
    <div :class="$style.div5">기관마다 제각각인 용어와 단위를 <br/>지능형 개념 사전이 알아서 표준 지표로 매핑해 드립니다.</div>
    <div :class="$style.aiDb">"이번 달 초과 지점 알려줘"라고 말만 하면, <br/>AI가 DB 쿼리로 자동 변환해 즉시 통계를 뽑아냅니다.</div>
    <div :class="$style.div6">답변만 던지지 않습니다. <br/>모든 분석 결과에 원본 데이터의 정확한 행과 출처를 <br/>붙여 완벽한 검증을 보장합니다.</div>
    <div :class="$style.ontologyParent">
      <b :class="$style.ontology">ONTOLOGY</b>
      <b :class="$style.b7">01.</b>
    </div>
    <b :class="$style.aboutUs">ABOUT US</b>
    <b :class="$style.howItWorks">HOW IT WORKS</b>
    <div :class="$style.nlSqlParent">
      <b :class="$style.nlSql">NL → SQL</b>
      <b :class="$style.b7">02.</b>
    </div>
    <div :class="$style.evidenceParent">
      <b :class="$style.nlSql">EVIDENCE</b>
      <b :class="$style.b7">03.</b>
    </div>
    <b :class="$style.b10">
      <span>공공 데이터 연동</span>
      <span :class="$style.span">부터 </span>
      <span>실무 검증</span>
      <span :class="$style.span">까지</span>
    </b>
    <div :class="$style.rectangleParent">
      <div :class="$style.groupChild" />
      <b :class="$style.b11">공공 수질 데이터 실시간 연동</b>
      <b :class="$style.ai2">공공데이터포털과 물환경정보시스템의 수질 데이터를 수신해 <br/>AI 분석 파이프라인에 안전하게 연결합니다.</b>
    </div>
    <div :class="$style.child5" />
    <div :class="$style.child6" />
    <div :class="$style.rectangleGroup">
      <div :class="$style.groupChild" />
      <b :class="$style.b11">현장 실무자 맞춤형 워크플로우</b>
      <b :class="$style.b13">월간 보고부터 감사 대응까지, <br/>현장 담당자의 실제 업무 프로세스를 완벽히 반영해 설계했습니다.</b>
    </div>
    <div :class="$style.div7">투명한 기술 검증으로 가장 믿을 수 있는 분석 환경을 만듭니다.</div>
    <div :class="$style.child7" />
    <b :class="$style.b14">숫자 맞추느라 야근하는 날은<br/>이제 끝.</b>
    <b :class="$style.ai3">수질 데이터 AI 에이전트를<br/>먼저 경험해보세요.</b>
    <img :class="$style.vectorIcon" alt="" />
    <img :class="$style.child8" alt="" />
    <img :class="$style.child9" alt="" />
    <div :class="$style.ellipseDiv" />
    <b :class="$style.step1Ask">STEP 1. ASK</b>
    <b :class="$style.step2Analyze">STEP 2. ANALYZE</b>
    <b :class="$style.step3Verify">STEP 3. VERIFY</b>
    <b :class="$style.b15">원하는 조건이나 통계를 <br/>일상적인 언어로 질문하세요.</b>
    <b :class="$style.ai4">AI가 흩어진 공공 수질 데이터를 <br/>자동으로 연결하고 추출합니다.</b>
    <b :class="$style.b16">원본 데이터 출처를 직접 확인하고, <br/>그대로 보고서에 활용하세요.</b>
    <div :class="$style.child10" />
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
  height: 5668px;
  position: relative;
  background-color: #fff;
  overflow: hidden;
  text-align: center;
  font-size: 30px;
  color: #fff;
  font-family: Pretendard;
  transform-origin: top left;
}
.child {
  position: absolute;
  top: 0px;
  left: 0px;
  background: linear-gradient(180deg, #00123f, #000);
  width: 1920px;
  height: 1046px;
  flex-shrink: 0;
}
.item {
  position: absolute;
  top: -445px;
  left: 815px;
  filter: blur(700px);
  border-radius: 50%;
  background-color: #004ec2;
  width: 1025px;
  height: 650px;
  flex-shrink: 0;
}
.b {
  position: absolute;
  top: 250px;
  left: 105px;
  font-size: 70px;
  text-align: left;
  flex-shrink: 0;
}
.b2 {
  position: absolute;
  top: 456px;
  left: 105px;
  font-size: 70px;
  background: linear-gradient(94.87deg, #42a8ff, #00d6f3);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-align: left;
  flex-shrink: 0;
}
.div2 {
  position: absolute;
  top: 676px;
  left: 105px;
  line-height: 45px;
  font-weight: 500;
  text-align: left;
  flex-shrink: 0;
}
.inner {
  position: absolute;
  top: 783px;
  left: 105px;
  border-radius: 20px;
  background-color: #0053e3;
  width: 252px;
  height: 97px;
  flex-shrink: 0;
}
.rectangleDiv {
  position: absolute;
  top: 783px;
  left: 386px;
  border-radius: 20px;
  border: 2px solid #455772;
  box-sizing: border-box;
  width: 353px;
  height: 97px;
  flex-shrink: 0;
}
.div3 {
  position: absolute;
  top: 809px;
  left: 150px;
  line-height: 45px;
  font-weight: 600;
  text-align: left;
  flex-shrink: 0;
}
.div4 {
  position: absolute;
  top: 809px;
  left: calc(50% - 511px);
  line-height: 45px;
  font-weight: 600;
  display: inline-block;
  width: 228px;
  flex-shrink: 0;
}
.caAaca4862A5402b585a54a82eIcon {
  position: absolute;
  top: 49px;
  left: 100px;
  width: 32px;
  height: 40px;
  object-fit: cover;
  flex-shrink: 0;
}
.child2 {
  position: absolute;
  top: 1043px;
  left: 0px;
  background-color: #000;
  width: 1920px;
  height: 3444px;
  flex-shrink: 0;
}
.ai {
  position: absolute;
  top: 1304px;
  left: calc(50% - 459px);
  font-size: 40px;
  line-height: 55px;
  flex-shrink: 0;
}
.b3 {
  position: absolute;
  top: 3431px;
  left: calc(50% - 811px);
  font-size: 40px;
  line-height: 55px;
  text-align: left;
  flex-shrink: 0;
}
.rectangleIcon {
  position: absolute;
  top: 1530px;
  left: 203px;
  filter: blur(4px);
  border-radius: 20px;
  width: 467px;
  height: 561px;
  object-fit: cover;
  flex-shrink: 0;
}
.child3 {
  position: absolute;
  top: 1530px;
  left: 723px;
  filter: blur(4px);
  border-radius: 20px;
  width: 467px;
  height: 561px;
  object-fit: cover;
  flex-shrink: 0;
}
.child4 {
  position: absolute;
  top: 1530px;
  left: 1249px;
  filter: blur(4px);
  border-radius: 20px;
  width: 467px;
  height: 561px;
  object-fit: cover;
  flex-shrink: 0;
}
.b4 {
  position: absolute;
  top: 1770px;
  left: 310px;
  font-size: 25px;
  line-height: 45px;
  color: #00d7f3;
  flex-shrink: 0;
}
.b5 {
  position: absolute;
  top: 1770px;
  left: 794px;
  font-size: 25px;
  line-height: 45px;
  color: #00d7f3;
  flex-shrink: 0;
}
.b6 {
  position: absolute;
  top: 1770px;
  left: 1340px;
  font-size: 25px;
  line-height: 45px;
  color: #00d7f3;
  flex-shrink: 0;
}
.div5 {
  position: absolute;
  top: 1840px;
  left: 218px;
  font-size: 20px;
  line-height: 35px;
  flex-shrink: 0;
}
.aiDb {
  position: absolute;
  top: 1840px;
  left: 751px;
  font-size: 20px;
  line-height: 35px;
  flex-shrink: 0;
}
.div6 {
  position: absolute;
  top: 1840px;
  left: 1281px;
  font-size: 20px;
  line-height: 35px;
  flex-shrink: 0;
}
.ontologyParent {
  position: absolute;
  top: 1712px;
  left: 306px;
  width: 263px;
  height: 45px;
  flex-shrink: 0;
  font-family: 'Gmarket Sans';
}
.ontology {
  position: absolute;
  top: 0px;
  left: 58px;
  line-height: 45px;
}
.b7 {
  position: absolute;
  top: 0px;
  left: 0px;
  line-height: 45px;
}
.aboutUs {
  position: absolute;
  top: 1241px;
  left: calc(50% - 61px);
  font-size: 20px;
  line-height: 45px;
  font-family: 'Gmarket Sans';
  color: #00d7f3;
  flex-shrink: 0;
}
.howItWorks {
  position: absolute;
  top: 3368px;
  left: calc(50% - 811px);
  font-size: 20px;
  line-height: 45px;
  font-family: 'Gmarket Sans';
  color: #00d7f3;
  text-align: left;
  flex-shrink: 0;
}
.nlSqlParent {
  position: absolute;
  top: 1712px;
  left: 846px;
  width: 222px;
  height: 45px;
  flex-shrink: 0;
  font-family: 'Gmarket Sans';
}
.nlSql {
  position: absolute;
  top: 0px;
  left: 64px;
  line-height: 45px;
}
.evidenceParent {
  position: absolute;
  top: 1712px;
  left: 1360px;
  width: 246px;
  height: 45px;
  flex-shrink: 0;
  font-family: 'Gmarket Sans';
}
.b10 {
  position: absolute;
  top: 2415px;
  left: calc(50% - 490px);
  font-size: 70px;
  text-align: left;
  flex-shrink: 0;
  color: #00d7f3;
}
.span {
  color: #fff;
}
.rectangleParent {
  position: absolute;
  top: 2664px;
  left: 149px;
  width: 785px;
  height: 351px;
  flex-shrink: 0;
  text-align: left;
  font-size: 40px;
  color: #00d7f3;
}
.groupChild {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 20px;
  background-color: rgba(66, 168, 255, 0.2);
  border: 2px solid #42a8ff;
  box-sizing: border-box;
  width: 785px;
  height: 351px;
}
.b11 {
  position: absolute;
  top: 85px;
  left: 147px;
}
.ai2 {
  position: absolute;
  top: 176px;
  left: 38px;
  font-size: 30px;
  line-height: 45px;
  color: #f9fafb;
  text-align: center;
}
.child5 {
  position: absolute;
  top: 3621px;
  left: 143px;
  border-radius: 50px;
  background-color: rgba(0, 83, 227, 0.4);
  border: 2px solid #0053e3;
  box-sizing: border-box;
  width: 339px;
  height: 74px;
  flex-shrink: 0;
}
.child6 {
  position: absolute;
  top: 3621px;
  left: 1399px;
  border-radius: 50px;
  background-color: rgba(0, 83, 227, 0.4);
  border: 2px solid #0053e3;
  box-sizing: border-box;
  width: 339px;
  height: 74px;
  flex-shrink: 0;
}
.rectangleGroup {
  position: absolute;
  top: 2664px;
  left: 979px;
  width: 785px;
  height: 351px;
  flex-shrink: 0;
  font-size: 40px;
  color: #00d7f3;
}
.b13 {
  position: absolute;
  top: 176px;
  left: 14px;
  font-size: 30px;
  line-height: 45px;
  color: #f9fafb;
}
.div7 {
  position: absolute;
  top: 2524px;
  left: calc(50% - 365px);
  line-height: 55px;
  font-weight: 500;
  text-align: left;
  flex-shrink: 0;
}
.child7 {
  position: absolute;
  top: 4103px;
  left: 0px;
  background: linear-gradient(180deg, #000, #0d1c46);
  width: 1920px;
  height: 1565px;
  flex-shrink: 0;
}
.b14 {
  position: absolute;
  top: 4429px;
  left: calc(50% - 388px);
  font-size: 70px;
  flex-shrink: 0;
}
.ai3 {
  position: absolute;
  top: 4997px;
  left: calc(50% - 362px);
  font-size: 70px;
  background: linear-gradient(94.87deg, #42a8ff, #00d6f3);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  flex-shrink: 0;
}
.vectorIcon {
  position: absolute;
  top: 4658px;
  left: 958px;
  filter: blur(10px);
  max-width: 100%;
  overflow: hidden;
  height: 235px;
  flex-shrink: 0;
}
.child8 {
  position: absolute;
  top: 3658.5px;
  left: 482px;
  filter: blur(10px);
  width: 290px;
  height: 0.5px;
  object-fit: contain;
  flex-shrink: 0;
}
.child9 {
  position: absolute;
  top: 3658px;
  left: 1111px;
  filter: blur(10px);
  width: 290px;
  height: 0.5px;
  object-fit: contain;
  flex-shrink: 0;
}
.ellipseDiv {
  position: absolute;
  top: 4893px;
  left: 938px;
  filter: blur(40px);
  border-radius: 50%;
  background-color: #0053e3;
  width: 43px;
  height: 43px;
  flex-shrink: 0;
}
.step1Ask {
  position: absolute;
  top: 3636px;
  left: calc(50% - 732px);
  font-size: 25px;
  line-height: 45px;
  font-family: 'Gmarket Sans';
  color: #005dff;
  text-align: left;
  flex-shrink: 0;
}
.step2Analyze {
  position: absolute;
  top: 3636px;
  left: calc(50% - 143px);
  font-size: 25px;
  line-height: 45px;
  font-family: 'Gmarket Sans';
  color: #005dff;
  text-align: left;
  flex-shrink: 0;
}
.step3Verify {
  position: absolute;
  top: 3636px;
  left: calc(50% + 498px);
  font-size: 25px;
  line-height: 45px;
  font-family: 'Gmarket Sans';
  color: #005dff;
  text-align: left;
  flex-shrink: 0;
}
.b15 {
  position: absolute;
  top: 3733px;
  left: calc(50% - 815px);
  line-height: 45px;
  color: #9ca3af;
  flex-shrink: 0;
}
.ai4 {
  position: absolute;
  top: 3733px;
  left: calc(50% - 207px);
  line-height: 45px;
  color: #9ca3af;
  flex-shrink: 0;
}
.b16 {
  position: absolute;
  top: 3733px;
  left: calc(50% + 405px);
  line-height: 45px;
  color: #9ca3af;
  flex-shrink: 0;
}
.child10 {
  position: absolute;
  top: 3621px;
  left: 772px;
  border-radius: 50px;
  background-color: rgba(0, 83, 227, 0.4);
  border: 2px solid #0053e3;
  box-sizing: border-box;
  width: 339px;
  height: 74px;
  flex-shrink: 0;
}
</style>
