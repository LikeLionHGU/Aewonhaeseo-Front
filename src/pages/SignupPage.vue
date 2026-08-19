<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import wordmark from '../assets/wordmark.svg'
import { useDesignScale } from '../composables/useDesignScale'
import { useAuth } from '../composables/useAuth'
import { ApiError, getMe, register } from '../api'

// 로그인보다 칸이 두 개 많아 캔버스를 그만큼 길게 잡는다.
const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1200

const { scale, offsetX } = useDesignScale(DESIGN_WIDTH)
const router = useRouter()
const route = useRoute()
const { setUser } = useAuth()

// 로그인 화면과 같은 이유로 세로 가운데에 놓는다.
const windowHeight = ref(0)
function measure() {
  windowHeight.value = window.innerHeight
}
onMounted(() => {
  measure()
  window.addEventListener('resize', measure)
})
onUnmounted(() => window.removeEventListener('resize', measure))
const offsetY = computed(() =>
  Math.max(0, (windowHeight.value - DESIGN_HEIGHT * scale.value) / 2),
)

const email = ref('')
const displayName = ref('')
const password = ref('')
const passwordConfirm = ref('')
const showPassword = ref(false)
const submitting = ref(false)
const errorMessage = ref('')

// 서버 규칙(2026-08-19 확인) — 비밀번호 8~72자, 이메일 형식 검사.
const PASSWORD_MIN = 8
const PASSWORD_MAX = 72

/**
 * 서버 검증 실패(VALIDATION_FAILED)의 상세를 우리말로 옮긴다.
 *
 * 요청 필드는 snake_case(display_name)인데 상세의 키는 camelCase(displayName)로
 * 온다. 영문 문구("must not be blank")를 그대로 보여줄 수 없으니 칸 이름만
 * 뽑아 안내한다.
 */
const FIELD_NAMES: Record<string, string> = {
  email: '이메일',
  password: '비밀번호',
  displayName: '이름',
}

function messageOf(error: unknown) {
  if (!(error instanceof ApiError)) return '알 수 없는 오류가 발생했어요'
  if (error.code === 'HTTP_ERROR' || error.code === 'NETWORK_ERROR') {
    return '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요'
  }
  if (error.code === 'VALIDATION_FAILED' && error.detail) {
    const fields = Object.keys(error.detail)
      .map((key) => FIELD_NAMES[key] ?? key)
      .join(' · ')
    if (fields) return `${fields} 을(를) 다시 확인해 주세요`
  }
  return error.message
}

/** 왕복하지 않고 걸러낼 수 있는 것만 먼저 본다. 진짜 판정은 서버가 한다. */
function localProblem() {
  if (!email.value.trim()) return '이메일을 입력해 주세요'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    return '이메일 형식이 올바르지 않아요'
  }
  if (!displayName.value.trim()) return '이름을 입력해 주세요'
  if (password.value.length < PASSWORD_MIN) {
    return `비밀번호는 ${PASSWORD_MIN}자 이상이어야 해요`
  }
  if (password.value.length > PASSWORD_MAX) {
    return `비밀번호는 ${PASSWORD_MAX}자를 넘을 수 없어요`
  }
  if (password.value !== passwordConfirm.value) return '비밀번호가 서로 달라요'
  return ''
}

/**
 * 로그인을 마치고 갈 곳.
 *
 * 가드가 붙여 준 ?redirect= 를 따라간다. 다른 사이트로 튕겨 보내지 못하도록
 * 같은 사이트 경로("/"로 시작하고 "//"가 아닌 것)만 받는다.
 */
function redirectTarget() {
  const to = route.query.redirect
  if (typeof to === 'string' && to.startsWith('/') && !to.startsWith('//')) return to
  return '/main'
}

async function submit() {
  if (submitting.value) return
  const problem = localProblem()
  if (problem) {
    errorMessage.value = problem
    return
  }

  submitting.value = true
  errorMessage.value = ''
  try {
    // 가입에 성공하면 로그인과 똑같이 쿠키가 발급된다 — 따로 로그인할 필요 없다.
    const account = await register({
      email: email.value.trim(),
      password: password.value,
      display_name: displayName.value.trim(),
    })
    // 로그인이 200 이어도 브라우저가 쿠키를 버렸을 수 있다. 평문 http 에서
    // WebKit 계열(사파리·Orion)은 Secure 쿠키를 조용히 버린다. 그러면 다음
    // 요청부터 401 이라, 화면만 넘어갔다가 새로고침하면 로그인 화면으로 돌아오는
    // 고리에 빠진다 — 사용자는 왜인지 알 길이 없다. 한 번 물어봐서 확실히 한다.
    try {
      await getMe()
    } catch (error) {
      errorMessage.value =
        error instanceof ApiError && error.status === 401
          ? '로그인은 됐지만 브라우저가 로그인 정보를 저장하지 못했어요. 쿠키 차단 설정을 확인해 주세요'
          : messageOf(error)
      return
    }
    setUser(account)
    router.push(redirectTarget())
  } catch (error) {
    errorMessage.value = messageOf(error)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div :class="$style.viewport" :style="{ height: `${DESIGN_HEIGHT * scale}px` }">
  <div
    :class="$style.div"
    :style="{ transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})` }"
  >
    <img :class="[$style.wordmark, 'link']" :src="wordmark" alt="물어볼래" @click="router.push('/')" />

    <div :class="$style.card">
      <b :class="$style.cardTitle">회원가입</b>
      <div :class="$style.cardSubtitle">이메일로 가입하고 바로 분석을 시작하세요.</div>

      <form :class="$style.form" novalidate @submit.prevent="submit">
      <b :class="$style.label" :style="{ top: '210px' }">이메일</b>
      <input
        v-model="email"
        :class="$style.field"
        :style="{ top: '252px' }"
        type="email"
        autocomplete="email"
        placeholder="name@example.com"
      />

      <b :class="$style.label" :style="{ top: '352px' }">이름</b>
      <input
        v-model="displayName"
        :class="$style.field"
        :style="{ top: '394px' }"
        type="text"
        autocomplete="name"
        placeholder="보고서에 표시될 이름"
      />

      <b :class="$style.label" :style="{ top: '494px' }">비밀번호</b>
      <div :class="$style.labelHint" :style="{ top: '494px' }">8자 이상</div>
      <input
        v-model="password"
        :class="[$style.field, $style.fieldWithAction]"
        :style="{ top: '536px' }"
        :type="showPassword ? 'text' : 'password'"
        autocomplete="new-password"
        placeholder="비밀번호를 입력하세요"
      />
      <div :class="[$style.fieldAction, 'link']" @click="showPassword = !showPassword">
        {{ showPassword ? '숨기기' : '보기' }}
      </div>

      <b :class="$style.label" :style="{ top: '636px' }">비밀번호 확인</b>
      <input
        v-model="passwordConfirm"
        :class="$style.field"
        :style="{ top: '678px' }"
        :type="showPassword ? 'text' : 'password'"
        autocomplete="new-password"
        placeholder="한 번 더 입력하세요"
      />

      <div v-if="errorMessage" :class="$style.formError">{{ errorMessage }}</div>

      <button type="submit" :class="[$style.submit, !submitting && 'btn']" :disabled="submitting">
        <div :class="[$style.submitBg, !submitting && 'btn-fill']" />
        <b :class="[$style.submitLabel, 'btn-label']">
          {{ submitting ? '가입하는 중…' : '가입하고 시작하기' }}
        </b>
      </button>
      </form>

      <div :class="$style.signup">
        <span>이미 계정이 있으신가요?</span>
        <span :class="[$style.signupLink, 'link']" @click="router.push('/login')">로그인</span>
      </div>
    </div>

    <div :class="[$style.back, 'link']" @click="router.push('/login')">←</div>
  </div>
  </div>
</template>

<style module>
.viewport {
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  position: relative;
  background-color: #f8f9fc;
}
/* 배경은 뷰포트가 깔고 캔버스는 내용만 얹는다. */
.div {
  width: 1920px;
  height: 1200px;
  position: relative;
  text-align: left;
  font-size: var(--font-body-03);
  color: #1f2937;
  font-family: Pretendard;
  transform-origin: top left;
}

/* ── 가입 카드 ───────────────────────────────
   워드마크(60~95)와 카드를 합친 1080px 를 캔버스(1200) 가운데에 둔다.
   로그인 화면과 같은 규칙이라 두 화면을 오가도 위치가 튀지 않는다. */
.wordmark {
  position: absolute;
  top: 60px;
  left: 888px;
  width: 144px;
  height: 35px;
}
.card {
  position: absolute;
  top: 160px;
  left: 660px;
  width: 600px;
  height: 980px;
  box-sizing: border-box;
  border-radius: 30px;
  background-color: #fff;
  border: 2px solid #e6e7eb;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
}
.cardTitle {
  position: absolute;
  top: 64px;
  left: 48px;
  font-size: var(--font-title-02);
  line-height: 55px;
  color: #0053e3;
}
.cardSubtitle {
  position: absolute;
  top: 132px;
  left: 48px;
  line-height: 36px;
  font-weight: 500;
  color: #6b7280;
}
/* 상자를 만들지 않는 래퍼 — 안쪽 절대좌표가 카드 기준 그대로 유지된다. */
.form {
  display: contents;
}
.label {
  position: absolute;
  left: 48px;
  line-height: 30px;
  color: #455772;
}
/* 라벨 오른쪽 끝에 붙는 규칙 안내 */
.labelHint {
  position: absolute;
  left: 48px;
  width: 504px;
  line-height: 30px;
  text-align: right;
  font-weight: 500;
  color: #9ca3af;
}
.field {
  position: absolute;
  left: 48px;
  width: 504px;
  height: 64px;
  box-sizing: border-box;
  padding: 0 20px;
  border-radius: 12px;
  border: 2px solid #d1d5db;
  background-color: #f8f9fc;
  font-family: Pretendard;
  font-size: var(--font-body-03);
  color: #1f2937;
  outline: none;
}
.field::placeholder {
  color: #9ca3af;
}
.field:focus {
  border-color: #0053e3;
  background-color: #fff;
}
.fieldWithAction {
  padding-right: 92px;
}
.fieldAction {
  position: absolute;
  top: 536px;
  left: 460px;
  width: 72px;
  height: 64px;
  line-height: 64px;
  text-align: right;
  font-weight: 600;
  color: #0053e3;
}
/* 마지막 칸(678~742)과 버튼(806) 사이. 실패했을 때만 나타난다. */
.formError {
  position: absolute;
  top: 748px;
  left: 48px;
  width: 504px;
  line-height: 30px;
  font-weight: 600;
  text-align: center;
  color: #d92d20;
}
.submit {
  border: none;
  background: none;
  padding: 0;
  font-family: inherit;
  position: absolute;
  top: 806px;
  left: 48px;
  width: 504px;
  height: 64px;
  color: #fff;
}
.submit:disabled {
  cursor: progress;
  opacity: 0.6;
}
.submitBg {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 504px;
  height: 64px;
  border-radius: 12px;
  background-color: #0053e3;
}
.submitLabel {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 504px;
  height: 64px;
  line-height: 64px;
  font-size: var(--font-body-02);
  text-align: center;
}
.signup {
  position: absolute;
  top: 900px;
  left: 0px;
  width: 600px;
  display: flex;
  justify-content: center;
  gap: 10px;
  line-height: 36px;
  font-weight: 500;
  color: #6b7280;
}
.signupLink {
  font-weight: 600;
  color: #0053e3;
}
.back {
  position: absolute;
  top: 50px;
  left: 50px;
  font-size: var(--font-title-02);
  font-weight: 600;
  color: #00559e;
}
</style>
