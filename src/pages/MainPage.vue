<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import wordmark from '../assets/wordmark.svg'
import profileIcon from '../assets/profile.svg'
import uploadIcon from '../assets/upload.svg'
import analyzeIcon from '../assets/analyze.svg'
import { useDesignScale } from '../composables/useDesignScale'

const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1330

const { scale, offsetX } = useDesignScale(DESIGN_WIDTH)
const router = useRouter()

const hasData = ref(false)

function connectSampleData() {
  hasData.value = true
}
</script>

<template>
  <div :class="$style.viewport" :style="{ height: `${DESIGN_HEIGHT * scale}px` }">
  <div :class="$style.div" :style="{ transform: `translateX(${offsetX}px) scale(${scale})` }">
    <b :class="$style.b">무엇부터 시작할까요?</b>
    <b :class="$style.b2">데이터를 먼저 연결하거나, 이미 연결된 데이터로 바로 분석을 시작할 수 있어요.</b>
    <div :class="$style.child" />
    <div :class="$style.item" />
    <div :class="$style.inner" />
    <img :class="$style.groupIcon" :src="uploadIcon" alt="" />
    <b :class="$style.b3">데이터 올리기</b>
    <b :class="$style.b4">분석하기</b>
    <div :class="$style.csv">엑셀·CSV 파일을 업로드하면 <br/>데이터를 자동으로 정리하고 용어를 표준화합니다.</div>
    <div :class="$style.bod">“작년 인천 지점 BOD 월별 추이 보여줘"<br/>궁금한 내용을 입력하면, 근거와 함께 분석 결과를 확인할 수 있어요.</div>
    <img :class="$style.child2" :src="analyzeIcon" alt="" />
    <img :class="[$style.wordmark, 'link']" :src="wordmark" alt="물어볼래" @click="router.push('/')" />
    <img :class="$style.profile" :src="profileIcon" alt="내 프로필" />
    <div :class="[$style.rectangleParent, 'btn']" role="button" @click="router.push('/upload')">
      <div :class="[$style.groupChild, 'btn-fill']" />
      <div :class="$style.csv2">엑셀·CSV 업로드</div>
    </div>
    <template v-if="!hasData">
      <div :class="[$style.rectangleGroup, 'btn']" role="button" @click="connectSampleData">
        <div :class="[$style.groupItem, 'btn-outline']" />
        <div :class="$style.div2">샘플 데이터로 체험</div>
      </div>
      <div :class="$style.rectangleContainer">
        <div :class="$style.groupInner" />
        <div :class="$style.div3">데이터 연결 후 가능</div>
      </div>
    </template>
    <div v-else :class="[$style.rectangleGroupActive, 'btn']" role="button" @click="router.push('/ask')">
      <div :class="[$style.groupChild, 'btn-fill']" />
      <div :class="$style.div2Active">분석 시작하기</div>
    </div>
    <div :class="[$style.div4, 'link']" @click="router.push('/data')">내 데이터</div>
    <div :class="[$style.div5, 'link']" @click="router.push('/ask')">분석하기</div>
    <div :class="$style.div6">문의하기</div>
  </div>
  </div>
</template>

<style module>
/* 서비스 워드로고. 원래는 물방울 아이콘 위에 '물 / 볼래 / ㅓ' 글자를 겹쳐 만들었는데,
   Ria Sans 가 설치되지 않은 환경에서는 글자 폭이 달라져 어긋난다. 한 장으로 바꾼다. */
.wordmark {
  position: absolute;
  top: 82px;
  left: 50px;
  width: 144px;
  height: 35px;
}
.viewport {
  width: 100%;
  overflow: hidden;
  position: relative;
}
.div {
  width: 1920px;
  height: 1330px;
  position: relative;
  background-color: #f8f9fc;
  text-align: center;
  font-size: var(--font-body-03);
  color: #6b7280;
  font-family: Pretendard;
  transform-origin: top left;
}
/* 원본은 calc(50% - 텍스트폭/2) 로 중앙을 맞춰서 글자 크기가 바뀌면 밀렸다.
   left/right 0 + fit-content + auto 여백으로 블록만 가운데 놓는다. text-align 을
   건드리지 않으므로 여러 줄 텍스트의 줄 내부 정렬은 원본 그대로 유지된다. */
.b {
  position: absolute;
  top: 304px;
  left: 0px;
  right: 0px;
  width: fit-content;
  margin-inline: auto;
  font-size: var(--font-title-02);
  background: linear-gradient(-86.07deg, #3482ff, #42a8ff 65.38%, #0053e3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
/* 원본은 calc(50% - 텍스트폭/2) 로 중앙을 맞춰서 글자 크기가 바뀌면
   오른쪽으로 밀렸다. 실제 중앙 정렬로 바꿔 크기와 무관하게 고정한다. */
.b2 {
  position: absolute;
  top: 364px;
  left: 0px;
  width: 100%;
  text-align: center;
  font-size: var(--font-body-02);
  line-height: 45px;
}
.child {
  position: absolute;
  top: 453px;
  left: 360px;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
  border-radius: 20px;
  background-color: #fff;
  border: 2px solid #e6e7eb;
  box-sizing: border-box;
  width: 584px;
  height: 431px;
}
.item {
  position: absolute;
  top: 453px;
  left: 977px;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
  border-radius: 20px;
  background-color: #fff;
  border: 2px solid #e6e7eb;
  box-sizing: border-box;
  width: 584px;
  height: 431px;
}
.inner {
  position: absolute;
  top: 1086px;
  left: -100px;
  background-color: #f3f3f3;
  width: 2120px;
  height: 244px;
}
.groupIcon {
  position: absolute;
  top: 531px;
  left: 630px;
  width: 45px;
  height: 45px;
}
.b3 {
  position: absolute;
  top: 589px;
  left: calc(50% - 389px);
  font-size: var(--font-body-01);
  color: #0053e3;
}
.b4 {
  position: absolute;
  top: 589px;
  left: calc(50% + 257px);
  font-size: var(--font-body-01);
  color: #0053e3;
}
.csv {
  position: absolute;
  top: 651px;
  left: calc(50% - 502px);
  line-height: 35px;
}
.bod {
  position: absolute;
  top: 651px;
  left: calc(50% + 48px);
  line-height: 35px;
}
.child2 {
  position: absolute;
  top: 531px;
  left: 1247px;
  width: 45px;
  height: 45px;
}
/* 프로필 자리 — 헤더 세로중심 100, 오른쪽 여백 50px */
.profile {
  position: absolute;
  top: 76px;
  left: 1822px;
  border-radius: 50%;
  width: 48px;
  height: 48px;
}
.rectangleParent {
  position: absolute;
  top: 750px;
  left: 544px;
  width: 217px;
  height: 41px;
  color: #fff;
}
.groupChild {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 10px;
  background-color: #0053e3;
  width: 217px;
  height: 41px;
}
.csv2 {
  position: absolute;
  top: 9px;
  left: 39px;
  font-weight: 600;
}
.rectangleGroup {
  position: absolute;
  top: 750px;
  left: 1274px;
  width: 217px;
  height: 41px;
  color: #0053e3;
}
.groupItem {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 10px;
  background-color: rgba(0, 83, 227, 0.08);
  border: 1px solid #0053e3;
  box-sizing: border-box;
  width: 217px;
  height: 41px;
}
.div2 {
  position: absolute;
  top: 9px;
  left: 34px;
  font-weight: 600;
  display: inline-block;
  width: 148px;
  height: 24px;
}
.rectangleContainer {
  position: absolute;
  top: 750px;
  left: 1047px;
  width: 217px;
  height: 41px;
}
.groupInner {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 10px;
  background-color: #e5e7eb;
  width: 217px;
  height: 41px;
}
.div3 {
  position: absolute;
  top: 9px;
  left: 25px;
  font-weight: 600;
  display: inline-block;
  width: 166px;
  height: 24px;
}
.rectangleGroupActive {
  position: absolute;
  top: 750px;
  left: 1161px;
  width: 217px;
  height: 41px;
  color: #fff;
}
.div2Active {
  position: absolute;
  top: 9px;
  left: 54px;
  font-weight: 600;
}
.div4 {
  position: absolute;
  top: 85px;
  left: calc(50% - 676px);
  font-size: var(--font-body-02);
  font-weight: 500;
  color: #00559e;
}
.div5 {
  position: absolute;
  top: 85px;
  left: calc(50% - 528px);
  font-size: var(--font-body-02);
  font-weight: 500;
  color: #00559e;
}
.div6 {
  position: absolute;
  top: 85px;
  left: calc(50% - 386px);
  font-size: var(--font-body-02);
  font-weight: 500;
  color: #00559e;
  text-align: left;
}
</style>
