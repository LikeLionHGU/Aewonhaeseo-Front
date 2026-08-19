<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import wordmark from '../assets/wordmark.svg'
import { useDesignScale } from '../composables/useDesignScale'
import { useAuth } from '../composables/useAuth'
import { ApiError, getMe, login } from '../api'

// 다른 화면과 같은 1920 캔버스. 카드 하나만 놓이므로 한 화면에 담긴다.
const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080

const { scale, offsetX } = useDesignScale(DESIGN_WIDTH)
const router = useRouter()
const route = useRoute()
const { setUser } = useAuth()

// 다른 화면은 아래로 길어서 위에 붙여 두면 되지만, 로그인은 한 화면짜리라
// 창이 캔버스보다 높으면 카드가 위쪽에 치우쳐 보인다. 남는 높이를 반씩 나눈다.
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
const password = ref('')
const showPassword = ref(false)
const submitting = ref(false)
const errorMessage = ref('')

/**
 * 화면에 그대로 띄울 실패 문구.
 *
 * 서버가 우리말로 설명해 주면(AUTH_INVALID_CREDENTIALS 등) 그게 제일 정확하니
 * 그대로 쓰고, 연결이 끊겼거나 프록시가 502 를 뱉은 것처럼 사람이 읽을 게 없는
 * 실패만 갈아끼운다. UploadPage 와 같은 규칙이다.
 */
function messageOf(error: unknown) {
  if (!(error instanceof ApiError)) return '알 수 없는 오류가 발생했어요'
  if (error.code === 'HTTP_ERROR' || error.code === 'NETWORK_ERROR') {
    return '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요'
  }
  return error.message
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
  // 서버도 걸러내지만, 빈 칸을 굳이 왕복시킬 이유가 없다.
  if (!email.value.trim() || !password.value) {
    errorMessage.value = '이메일과 비밀번호를 입력해 주세요'
    return
  }

  submitting.value = true
  errorMessage.value = ''
  try {
    // 성공하면 서버가 AWON_ACCESS_TOKEN 쿠키를 심어 준다. 프론트가 토큰을
    // 따로 보관할 것은 없다 — 이후 요청에 브라우저가 알아서 붙인다.
    const account = await login({ email: email.value.trim(), password: password.value })
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
      <b :class="$style.cardTitle">로그인</b>
      <div :class="$style.cardSubtitle">물어볼래 계정으로 분석을 이어가세요.</div>

      <!-- form 으로 감싸야 Enter 로 제출되고 브라우저 비밀번호 저장이 뜬다.
           display: contents 라 상자를 만들지 않으므로 절대좌표는 그대로다.
           novalidate 는 type="email" 의 기본 검증을 끈다 — 켜 두면 제출이 막히면서
           브라우저 기본 툴팁(영문)이 뜨고 우리말 안내가 나오지 못한다. -->
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

      <b :class="$style.label" :style="{ top: '352px' }">비밀번호</b>
      <input
        v-model="password"
        :class="[$style.field, $style.fieldWithAction]"
        :style="{ top: '394px' }"
        :type="showPassword ? 'text' : 'password'"
        autocomplete="current-password"
        placeholder="비밀번호를 입력하세요"
      />
      <div :class="[$style.fieldAction, 'link']" @click="showPassword = !showPassword">
        {{ showPassword ? '숨기기' : '보기' }}
      </div>

      <!-- 서버가 주는 쿠키는 8시간 고정이라 "로그인 상태 유지" 선택지가 없다.
           고를 수 없는 걸 체크박스로 두는 대신 유효시간을 알려 준다. -->
      <div :class="$style.keepNote">로그인은 8시간 동안 유지돼요</div>

      <button type="submit" :class="[$style.submit, !submitting && 'btn']" :disabled="submitting">
        <div :class="[$style.submitBg, !submitting && 'btn-fill']" />
        <b :class="[$style.submitLabel, 'btn-label']">{{ submitting ? '로그인 중…' : '로그인' }}</b>
      </button>
      <div v-if="errorMessage" :class="$style.formError">{{ errorMessage }}</div>
      </form>

      <div :class="$style.signup">
        <span>아직 계정이 없으신가요?</span>
        <span :class="[$style.signupLink, 'link']" @click="router.push('/signup')">회원가입</span>
      </div>
    </div>

    <div :class="[$style.back, 'link']" @click="router.push('/')">←</div>
  </div>
  </div>
</template>

<style module>
/* 캔버스(1080px)보다 창이 높아도 배경이 화면 끝까지 이어지도록 100vh 로 깔고,
   캔버스는 그 안에서 세로 가운데에 놓는다. */
.viewport {
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  position: relative;
  background-color: #f8f9fc;
}
/* 배경은 뷰포트가 깔고 캔버스는 내용만 얹는다 — 창이 캔버스보다 높아도
   아래에 빈 띠가 생기지 않는다. */
.div {
  width: 1920px;
  height: 1080px;
  position: relative;
  text-align: left;
  font-size: var(--font-body-03);
  color: #1f2937;
  font-family: Pretendard;
  transform-origin: top left;
}


/* ── 로그인 카드 ────────────────────────────────
   오른쪽 영역(860~2020)의 가운데 1440 에 폭 600 카드를 놓는다. */
/* 워드마크(98~133)와 카드를 합친 884px 를 캔버스(1080) 가운데에 둔다.
   가로도 캔버스 중심(960) 기준이라 좌우 여백까지 포함해 가운데로 놓인다. */
.wordmark {
  position: absolute;
  top: 98px;
  left: 888px;
  width: 144px;
  height: 35px;
}
.card {
  position: absolute;
  top: 198px;
  left: 660px;
  width: 600px;
  height: 784px;
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
.label {
  position: absolute;
  left: 48px;
  line-height: 30px;
  color: #455772;
}
/* 입력칸 — 폰트를 지정하지 않으면 브라우저 기본 글꼴로 떨어진다. */
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
/* "보기" 자리를 비워 둔다 */
.fieldWithAction {
  padding-right: 92px;
}
.fieldAction {
  position: absolute;
  top: 394px;
  left: 460px;
  width: 72px;
  height: 64px;
  line-height: 64px;
  text-align: right;
  font-weight: 600;
  color: #0053e3;
}

.keepNote {
  position: absolute;
  top: 486px;
  left: 48px;
  height: 30px;
  line-height: 30px;
  font-weight: 500;
  color: #6b7280;
}

/* 상자를 만들지 않는 래퍼. 안쪽 절대좌표가 카드 기준 그대로 유지된다. */
.form {
  display: contents;
}
/* button 기본값(테두리·배경·폰트)을 지운다 */
.submit {
  border: none;
  background: none;
  padding: 0;
  font-family: inherit;
  position: absolute;
  top: 556px;
  left: 48px;
  width: 504px;
  height: 64px;
  color: #fff;
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
.submit:disabled {
  cursor: progress;
  opacity: 0.6;
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

/* 로그인 버튼(556~620) 바로 아래. 나타났다 사라져도 회원가입 줄(700)이 밀리지
   않도록 자리를 비워 뒀다. */
.formError {
  position: absolute;
  top: 632px;
  left: 48px;
  width: 504px;
  line-height: 30px;
  font-weight: 600;
  text-align: center;
  color: #d92d20;
}


.signup {
  position: absolute;
  top: 700px;
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
