<script setup lang="ts">
import { useRouter } from 'vue-router'
import logo from '../assets/logo.png'
import { useDesignScale } from '../composables/useDesignScale'

const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1292

const { scale, offsetX } = useDesignScale(DESIGN_WIDTH)
const router = useRouter()
</script>

<template>
  <div :class="$style.viewport" :style="{ height: `${DESIGN_HEIGHT * scale}px` }">
  <div :class="$style.div" :style="{ transform: `translateX(${offsetX}px) scale(${scale})` }">
    <b :class="[$style.b, 'link']" @click="router.push('/data')">내 데이터</b>
    <div :class="[$style.div2, 'link']" @click="router.push('/ask')">분석하기</div>
    <div :class="$style.div3">문의하기</div>
    <div :class="[$style.caAaca4862A5402b585a54a82eParent, 'link']" @click="router.push('/')">
      <img :class="$style.caAaca4862A5402b585a54a82eIcon" :src="logo" alt="로고" />
      <b :class="$style.b3">물</b>
      <b :class="$style.b4">볼래</b>
      <b :class="$style.b5">ㅓ</b>
    </div>
    <div :class="$style.profile" />

    <!-- 완료 표시 — 원본은 빈 img 였다 -->
    <svg :class="$style.item" viewBox="0 0 144 144" role="img" aria-label="확인 완료">
      <circle cx="72" cy="72" r="72" fill="#0053E3" />
      <path d="M42 74 L64 96 L104 50" fill="none" stroke="#fff" stroke-width="11"
            stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <b :class="$style.b2">3건 모두 확인했어요</b>
    <b :class="$style.b8">확인해 주신 내용은 표준 사전에 반영됐어요.<br/>다음에 같은 용어가 나오면 자동으로 매핑됩니다.</b>

    <div :class="[$style.rectangleGroup, 'btn']" role="button" @click="router.push('/data')">
      <div :class="[$style.groupItem, 'btn-outline']" />
      <b :class="$style.b7">내 데이터로 돌아가기</b>
    </div>
    <div :class="[$style.rectangleParent, 'btn']" role="button" @click="router.push('/ask')">
      <div :class="[$style.groupChild, 'btn-fill']" />
      <b :class="$style.b6">데이터 분석하러 가기</b>
    </div>

    <div :class="$style.inner" />
    <div :class="[$style.div4, 'link']" @click="router.push('/terms')">←</div>
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
  height: 1292px;
  position: relative;
  background-color: #f8f9fc;
  text-align: center;
  font-size: var(--font-body-03);
  color: #00559e;
  font-family: Pretendard;
  transform-origin: top left;
}
.b {
  position: absolute;
  top: 85px;
  left: calc(50% - 676px);
  font-size: var(--font-body-02);
  text-decoration: underline;
}
.div2 {
  position: absolute;
  top: 85px;
  left: calc(50% - 528px);
  font-size: var(--font-body-02);
  font-weight: 500;
}
.div3 {
  position: absolute;
  top: 85px;
  left: calc(50% - 386px);
  font-size: var(--font-body-02);
  font-weight: 500;
  text-align: left;
}
.caAaca4862A5402b585a54a82eParent {
  position: absolute;
  font-size: var(--font-body-01);
  top: 82px;
  left: 50px;
  width: 144px;
  height: 35px;
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
.item {
  position: absolute;
  top: 328px;
  left: 888px;
  width: 144px;
  height: 144px;
}
/* 원본은 calc(50% - 텍스트폭/2) 로 중앙을 맞춰서 글자 크기가 바뀌면 밀렸다.
   left/right 0 + fit-content + auto 여백으로 블록만 가운데 놓는다. text-align 을
   건드리지 않으므로 여러 줄 텍스트의 줄 내부 정렬은 원본 그대로 유지된다. */
.b2 {
  position: absolute;
  top: 526px;
  left: 0px;
  right: 0px;
  width: fit-content;
  margin-inline: auto;
  font-size: var(--font-title-01);
  color: #0053e3;
  text-align: left;
}
/* 원본은 calc(50% - 텍스트폭/2) 로 중앙을 맞춰서 글자 크기가 바뀌면
   오른쪽으로 밀렸다. 실제 중앙 정렬로 바꿔 크기와 무관하게 고정한다. */
.b8 {
  position: absolute;
  top: 640px;
  left: 0px;
  width: 100%;
  text-align: center;
  line-height: 45px;
  color: #6b7280;
}
.rectangleGroup {
  position: absolute;
  top: 807px;
  left: 497px;
  width: 455px;
  height: 56px;
  color: #0053e3;
}
.groupItem {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 20px;
  border: 2px solid #0053e3;
  box-sizing: border-box;
  width: 455px;
  height: 56px;
}
/* Figma 는 이 두 라벨을 서로 다른 높이(36px / 26px)로 내보냈다. 줄 상자는 둘 다
   36px 이라 26px 로 내보낸 쪽만 글자가 4.5px 아래로 내려간다. 나란히 놓인 버튼이라
   차이가 바로 보이므로, 버튼 높이만큼 line-height 를 줘서 둘 다 정중앙에 맞춘다. */
.b7 {
  position: absolute;
  top: 0px;
  left: 73.11px;
  display: inline-block;
  width: 321.9px;
  height: 56px;
  line-height: 56px;
}
.rectangleParent {
  position: absolute;
  top: 807px;
  left: 964px;
  width: 455px;
  height: 56px;
  color: #fff;
}
.groupChild {
  position: absolute;
  top: 0px;
  left: 0px;
  border-radius: 20px;
  background-color: #0053e3;
  width: 455px;
  height: 56px;
}
.b6 {
  position: absolute;
  top: 0px;
  left: 83.2px;
  display: inline-block;
  width: 288.6px;
  height: 56px;
  line-height: 56px;
}
.inner {
  position: absolute;
  top: 1048px;
  left: -100px;
  background-color: #f3f3f3;
  width: 2120px;
  height: 244px;
}
.div4 {
  position: absolute;
  top: 228px;
  left: 50px;
  font-size: var(--font-title-02);
  font-weight: 600;
}
</style>
