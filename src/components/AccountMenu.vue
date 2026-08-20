<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import profileIcon from '../assets/profile.svg'
import { useAuth } from '../composables/useAuth'

/**
 * 헤더 오른쪽 끝의 프로필 자리.
 *
 * 11개 화면이 같은 좌표(1822, 76)에 같은 아이콘을 두고 있어서 한 곳으로 모았다.
 * 페이지의 디자인 캔버스 안에 놓이므로 좌표는 1920 기준 그대로 쓴다.
 */
const router = useRouter()
const { user, ensureLoaded, signOut } = useAuth()

const open = ref(false)
const signingOut = ref(false)

// 가드가 이미 불러 놨을 때가 대부분이지만, 공개 화면에서 들어오면 비어 있다.
onMounted(() => {
  void ensureLoaded()
  document.addEventListener('click', closeOnOutside)
})
onUnmounted(() => document.removeEventListener('click', closeOnOutside))

const root = ref<HTMLElement | null>(null)
function closeOnOutside(event: MouseEvent) {
  if (!open.value) return
  if (root.value && !root.value.contains(event.target as Node)) open.value = false
}

/** 말풍선을 닫고 옮긴다. 같은 화면을 다시 눌러도 말풍선은 닫혀야 한다. */
function goTo(path: string) {
  open.value = false
  router.push(path)
}

async function onSignOut() {
  if (signingOut.value) return
  signingOut.value = true
  await signOut()
  signingOut.value = false
  open.value = false
  router.push('/login')
}
</script>

<template>
  <div ref="root" :class="$style.root">
    <img
      :class="[$style.profile, 'link']"
      :src="profileIcon"
      :alt="user ? `${user.display_name} 메뉴` : '내 프로필'"
      @click="open = !open"
    />

    <div v-if="open" :class="$style.panel">
      <template v-if="user">
        <b :class="$style.name">{{ user.display_name }}</b>
        <div :class="$style.email" :title="user.email">{{ user.email }}</div>
      </template>
      <template v-else>
        <b :class="$style.name">로그인하지 않았어요</b>
        <div :class="$style.email">계정으로 들어오면 기록이 남아요</div>
      </template>

      <div :class="$style.divider" />

      <template v-if="user">
        <div :class="[$style.action, $style.actionPlain, 'row-hit']"
             @click="goTo('/open-api/keys')">
          내 API
        </div>
        <div :class="$style.divider" />
        <div :class="[$style.action, 'row-hit']" @click="onSignOut">
          {{ signingOut ? '로그아웃 중…' : '로그아웃' }}
        </div>
      </template>
      <div v-else :class="[$style.action, $style.actionPrimary, 'row-hit']"
           @click="goTo('/login')">
        로그인
      </div>
    </div>
  </div>
</template>

<style module>
/* 아이콘과 패널을 함께 감싸되 배치는 각각 캔버스 좌표로 잡는다. 이 상자에
   크기를 주면 헤더 위에 투명한 판이 깔려 뒤쪽 클릭을 막는다. */
.root {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
}
.profile {
  position: absolute;
  z-index: 10;
  top: 76px;
  left: 1822px;
  border-radius: 50%;
  width: 48px;
  height: 48px;
}
/* 아이콘 오른쪽 끝(1870)에 맞춰 왼쪽으로 편다.
   페이지 내용은 전부 position: absolute 인데 이 컴포넌트가 헤더 쪽이라 DOM 에서
   앞선다 — z-index 없이는 뒤에 오는 본문(업로드 버튼 등)에 덮인다. */
.panel {
  position: absolute;
  z-index: 10;
  top: 136px;
  left: 1590px;
  width: 280px;
  box-sizing: border-box;
  padding: 24px 0 8px;
  border-radius: 16px;
  background-color: #fff;
  border: 2px solid #e6e7eb;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
  font-size: var(--font-body-03);
  text-align: left;
}
.name {
  display: block;
  padding: 0 24px;
  line-height: 30px;
  color: #1f2937;
}
/* 이메일은 길다(기관 도메인). 넘치면 끝을 줄인다. */
.email {
  padding: 0 24px 16px;
  line-height: 30px;
  font-weight: 500;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.divider {
  height: 1px;
  background-color: #e6e7eb;
}
.action {
  padding: 0 24px;
  line-height: 56px;
  font-weight: 600;
  color: #d92d20;
}
.actionPrimary {
  color: #0053e3;
}
/* 화면을 옮기기만 하는 항목. 빨강(로그아웃)·파랑(로그인)과 무게를 구분한다. */
.actionPlain {
  color: #1f2937;
}
</style>
