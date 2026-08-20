<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import wordmark from '../assets/wordmark.svg'
import AccountMenu from '../components/AccountMenu.vue'
import { useDesignScale } from '../composables/useDesignScale'
import { useCanvasHeight } from '../composables/useCanvasHeight'
import { useAuth } from '../composables/useAuth'
import {
  ApiError,
  createOpenApiOrganization,
  issueOpenApiKey,
  listOpenApiOrganizations,
  selfIssueOpenApiKey,
} from '../api'
import type { OpenApiIssued } from '../api'
import { OPEN_API_BASE } from '../lib/openApi'

/**
 * Open API 키 발급.
 *
 * 서버가 실제로 발급한다 — 받은 키는 X-API-Key 헤더로 /open-api/v1/* 을 부를 때
 * 그대로 통한다. 예전에는 발급 경로가 없어 브라우저에서 만든 흉내였는데, 백엔드가
 * 붙어서(2026-08-21) 전부 서버 호출로 바꿨다.
 *
 * 담당자가 자기 키를 직접 받는 것이 기본 흐름이다(POST /api/v1/open-api/keys).
 * 그 경로가 서버에 아직 없어서(404) 지금은 관리자 계정으로만 실제 발급이 되고,
 * 담당자에게는 무엇이 없는지 그대로 알려준다. 경로가 생기면 이 화면은 고칠 것이 없다.
 *
 * 관리자로 로그인한 경우에는 관리자 경로를 쓴다 — 이미 동작하고, 관리자가 남의
 * 기업 키를 대신 발급할 수 있는 유일한 길이기도 하다.
 *
 * 보내는 값은 서버가 받는 세 개(name · key_name · requests_per_minute)뿐이다.
 * 담당자·사용 목적 같은 칸은 저장할 자리가 없어서 두지 않았다 — 눌러도 아무 데도
 * 가지 않는 입력칸을 만드는 것보다 없는 편이 낫다.
 */
const DESIGN_WIDTH = 1920

const { scale, offsetX } = useDesignScale(DESIGN_WIDTH)
const router = useRouter()
const { user, ensureLoaded } = useAuth()

const canvas = ref<HTMLElement | null>(null)
const canvasHeight = useCanvasHeight(canvas)

// --- 입력 ---

const orgName = ref('')
const keyName = ref('')
const rpm = ref('')
const keyPledge = ref(false)

const isAdmin = computed(() => user.value?.role === 'ADMIN')

/**
 * 고를 수 있는 분당 요청 수.
 *
 * 담당자 본인 발급은 서버가 60 을 넘기지 못하게 막는다(2026-08-21 확인 —
 * 61 부터 400 VALIDATION_FAILED "must be less than or equal to 60"). 자기 한도를
 * 스스로 올리지 못하게 한 것이라, 고를 수 없는 값을 목록에 두면 눌러 보고 나서야
 * 거절당한다. 관리자 경로는 그 상한이 없어 더 큰 값도 받는다.
 */
const SELF_MAX_RPM = 60
const RPM_CHOICES = computed(() =>
  isAdmin.value ? ['30', '60', '120', '300', '600'] : ['10', '30', '60'],
)

onMounted(() => {
  void ensureLoaded()
})

// --- 검사 ---

const submitted = ref(false)
const errorText = ref('')
const submitting = ref(false)

const problems = computed(() => {
  const found: Record<string, string> = {}
  if (!orgName.value.trim()) found.orgName = '기업·기관명을 입력해 주세요'
  if (!keyName.value.trim()) found.keyName = '키 이름을 입력해 주세요'
  if (!keyPledge.value) found.keyPledge = 'API 키 관리 방식에 동의해 주세요'
  return found
})

const problemOf = (field: string) => (submitted.value ? problems.value[field] : undefined)

// --- 발급 ---

const issued = ref<OpenApiIssued | null>(null)
const copied = ref(false)

/**
 * 이름이 같은 기업이 이미 있으면 그 기업에 키를 하나 더 발급한다.
 *
 * 그냥 만들어 버리면 같은 이름의 기업이 두 벌 생기고 사용량도 갈라진다.
 * 목록 조회부터 실패하면(권한 없음 등) 그 오류를 그대로 위로 던진다.
 */
async function findOrganization(name: string) {
  const organizations = await listOpenApiOrganizations()
  const wanted = name.trim().toLowerCase()
  return organizations.find((org) => org.name.trim().toLowerCase() === wanted) ?? null
}

/** 서버 검증 상세의 키는 camelCase 로 온다(요청은 requests_per_minute). */
const FIELD_NAMES: Record<string, string> = {
  organizationName: '기업·기관명',
  keyName: '키 이름',
  requestsPerMinute: '분당 요청 수',
}

function describe(error: unknown) {
  if (!(error instanceof ApiError)) return '알 수 없는 오류가 발생했어요'
  // 어느 칸이 왜 틀렸는지 서버가 알려 준다. '입력값을 확인해 주세요' 만 띄우면
  // 무엇을 고쳐야 하는지 알 수 없다.
  if (error.code === 'VALIDATION_FAILED' && error.detail) {
    const fields = Object.keys(error.detail)
      .map((key) => FIELD_NAMES[key] ?? key)
      .join(' · ')
    if (fields) return `${fields} 을(를) 다시 확인해 주세요 — ${Object.values(error.detail)[0]}`
  }
  // 담당자 발급 경로가 서버에 없을 때. 무엇이 없는지 그대로 알려 주는 편이
  // "발급하지 못했어요" 보다 훨씬 쓸모 있다 — 백엔드에 그대로 전달할 수 있다.
  if (error.status === 404) {
    return '서버에 담당자 직접 발급 경로(POST /api/v1/open-api/keys)가 아직 없어요. 백엔드에 추가가 필요합니다.'
  }
  if (error.status === 403) {
    return '이 계정에는 발급 권한이 없어요.'
  }
  if (error.code === 'HTTP_ERROR' || error.code === 'NETWORK_ERROR') {
    return '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요'
  }
  return error.message
}

async function submit() {
  submitted.value = true
  errorText.value = ''
  if (Object.keys(problems.value).length) {
    errorText.value = '입력하지 않은 칸이 있어요. 아래 표시를 확인해 주세요.'
    return
  }
  submitting.value = true
  try {
    const name = orgName.value.trim()
    const body = {
      key_name: keyName.value.trim(),
      ...(rpm.value ? { requests_per_minute: Number(rpm.value) } : {}),
    }
    if (isAdmin.value) {
      // 관리자는 기업을 지정해 대신 발급한다. 같은 이름이 있으면 키만 더한다.
      const existing = await findOrganization(name)
      issued.value = existing
        ? await issueOpenApiKey(existing.id, body)
        : await createOpenApiOrganization({ name, ...body })
    } else {
      // 담당자 본인 발급. 서버가 기업을 이 계정에 묶는다.
      issued.value = await selfIssueOpenApiKey({ organization_name: name, ...body })
    }
  } catch (error) {
    errorText.value = describe(error)
  } finally {
    submitting.value = false
  }
}

async function copyKey() {
  const key = issued.value?.api_key
  if (!key) return
  try {
    await navigator.clipboard.writeText(key)
    copied.value = true
    window.setTimeout(() => (copied.value = false), 2000)
  } catch {
    copied.value = false
    errorText.value = '복사하지 못했어요. 아래 키를 직접 선택해 복사해 주세요.'
  }
}

/**
 * 확인용 호출 예시.
 *
 * 화면에서 키로 직접 호출해 보여주지 않는 이유가 있다 — 그러려면 키를 브라우저
 * 코드에 넣어야 하고, 그건 이 페이지가 하지 말라고 적어 둔 바로 그 일이다.
 * 대신 터미널에서 한 줄로 확인할 수 있게 명령을 내준다.
 */
const curlExample = computed(() =>
  issued.value
    ? `curl -H "X-API-Key: ${issued.value.api_key}" \\\n  ${OPEN_API_BASE}/open-api/v1/me`
    : '',
)
</script>

<template>
  <div :class="$style.viewport" :style="{ height: `${canvasHeight * scale}px` }">
    <div
      ref="canvas"
      :class="$style.canvas"
      :style="{ transform: `translateX(${offsetX}px) scale(${scale})` }"
    >
      <img :class="[$style.wordmark, 'link']" :src="wordmark" alt="물어볼래" @click="router.push('/')" />
      <div :class="[$style.nav, $style.navData, 'link']" @click="router.push('/data')">내 데이터</div>
      <div :class="[$style.nav, $style.navAsk, 'link']" @click="router.push('/ask')">분석하기</div>
      <div :class="[$style.nav, $style.navApi, $style.navOn, 'link']" @click="router.push('/open-api')">
        오픈 API 신청
      </div>
      <AccountMenu />

      <main :class="$style.main">
        <div :class="[$style.back, 'link']" @click="router.push('/open-api')">← 소개로 돌아가기</div>

        <header :class="$style.head">
          <h1 :class="$style.title">
            Open API 키 발급<span :class="$style.legend">필수</span>
          </h1>
          <p :class="$style.lead">
            발급하면 서버가 바로 키를 내줍니다. 전체 키는 발급 직후 한 번만 보이므로 그때 복사해
            기업의 백엔드 서버 또는 비밀 저장소에 보관해 주세요.
          </p>
          <div :class="[$style.keysLink, 'link']" @click="router.push('/open-api/keys')">
            발급된 키 보기 →
          </div>
        </header>

        <form :class="$style.form" novalidate @submit.prevent="submit">
          <div :class="$style.row">
            <label :class="$style.field">
              <span :class="$style.label">기업·기관명<span :class="$style.required">*</span></span>
              <input
                v-model="orgName"
                :class="[$style.input, problemOf('orgName') && $style.inputBad]"
                type="text"
                autocomplete="organization"
                placeholder="예: 어원환경"
              />
              <span :class="$style.hint">같은 이름이 이미 있으면 그 기업에 키를 하나 더 발급합니다.</span>
              <span v-if="problemOf('orgName')" :class="$style.problem">{{ problemOf('orgName') }}</span>
            </label>
            <label :class="$style.field">
              <span :class="$style.label">키 이름<span :class="$style.required">*</span></span>
              <input
                v-model="keyName"
                :class="[$style.input, problemOf('keyName') && $style.inputBad]"
                type="text"
                placeholder="예: 운영 서버"
              />
              <span :class="$style.hint">어디에 쓰는 키인지 알아볼 이름이면 됩니다.</span>
              <span v-if="problemOf('keyName')" :class="$style.problem">{{ problemOf('keyName') }}</span>
            </label>
          </div>

          <label :class="[$style.field, $style.fieldHalf]">
            <span :class="$style.label">분당 요청 수</span>
            <select v-model="rpm" :class="[$style.input, $style.select]">
              <option value="">선택 · 서버 기본값에 맡김</option>
              <option v-for="choice in RPM_CHOICES" :key="choice" :value="choice">
                분당 {{ choice }}회
              </option>
            </select>
            <span v-if="!isAdmin" :class="$style.hint">
              담당자 발급은 분당 {{ SELF_MAX_RPM }}회까지예요. 더 필요하면 관리자에게 요청해 주세요.
            </span>
          </label>

          <label :class="[$style.pledge, problemOf('keyPledge') && $style.pledgeBad]">
            <input v-model="keyPledge" type="checkbox" :class="$style.checkbox" />
            <span>
              발급받은 API 키를 브라우저에서 실행되는 코드에 넣지 않고, 기업의 백엔드 서버 또는
              비밀 저장소에서 관리합니다.<span :class="$style.required">*</span>
            </span>
          </label>
          <span v-if="problemOf('keyPledge')" :class="$style.problem">{{ problemOf('keyPledge') }}</span>

          <div :class="$style.submitRow">
            <button
              type="submit"
              :class="[$style.cta, $style.ctaFill, !submitting && 'btn', !submitting && 'btn-fill']"
              :disabled="submitting"
            >
              {{ submitting ? '발급 중…' : 'API 키 발급받기' }}
            </button>
            <span v-if="errorText" :class="$style.formError">{{ errorText }}</span>
          </div>
        </form>

        <!-- 발급 완료. 원문은 여기서만 보인다. -->
        <section v-if="issued" :class="$style.result">
          <h2 :class="$style.resultTitle">API 키가 발급됐어요</h2>
          <p :class="$style.resultLead">
            <b>{{ issued.organization.name }}</b> · {{ issued.key.name }} ·
            분당 {{ issued.key.requests_per_minute }}회
          </p>
          <p :class="$style.resultLead">
            전체 키는 <b>지금 이 화면에서만</b> 볼 수 있어요. 목록에는 앞부분만 남습니다.
          </p>
          <pre :class="$style.keyBox">{{ issued.api_key }}</pre>
          <div :class="$style.resultActions">
            <button type="button" :class="[$style.copy, 'btn', 'btn-outline']" @click="copyKey">
              {{ copied ? '복사했어요' : '키 복사하기' }}
            </button>
            <span :class="[$style.keysLink, 'link']" @click="router.push('/open-api/keys')">
              발급된 키 보기 →
            </span>
          </div>

          <!-- 서버가 붙여 주는 주의 문구. 우리가 고쳐 쓰지 않고 그대로 보여준다. -->
          <p v-if="issued.warning" :class="$style.resultWarn">{{ issued.warning }}</p>

          <div :class="$style.verify">
            <div :class="$style.verifyLabel">터미널에서 바로 확인해 보세요</div>
            <pre :class="$style.verifyBox">{{ curlExample }}</pre>
            <div :class="$style.verifyNote">
              브라우저에서 시험해 보라고 하지 않는 이유는, 그러려면 키를 브라우저 코드에 넣어야
              하기 때문입니다 — 위에서 하지 말라고 한 바로 그 일이에요.
            </div>
          </div>
        </section>
      </main>

      <div :class="$style.footer" />
    </div>
  </div>
</template>

<style module>
.viewport {
  width: 100%;
  overflow: hidden;
  position: relative;
}
.canvas {
  width: 1920px;
  position: relative;
  background-color: #f8f9fc;
  text-align: left;
  font-size: var(--font-body-03);
  color: #455772;
  font-family: Pretendard;
  transform-origin: top left;
}

/* ── 머리글 (다른 화면과 같은 좌표) ─────────────────────── */
.wordmark {
  position: absolute;
  top: 82px;
  left: 50px;
  width: 144px;
  height: 35px;
}
.nav {
  position: absolute;
  top: 85px;
  font-size: var(--font-body-02);
  font-weight: 500;
  color: #00559e;
}
.navData {
  left: calc(50% - 676px);
}
.navAsk {
  left: calc(50% - 536px);
}
.navApi {
  left: calc(50% - 386px);
}
.navOn {
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 6px;
}

/* ── 본문 ───────────────────────────────────────────────── */
.main {
  padding: 200px 210px 140px;
  display: flex;
  flex-direction: column;
  gap: 44px;
  max-width: 1500px;
  box-sizing: content-box;
  word-break: keep-all;
}
.back {
  font-size: var(--font-body-02);
  font-weight: 600;
  color: #0053e3;
  width: fit-content;
}
.head {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.title {
  margin: 0;
  font-size: var(--font-title-01);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #002f5f;
}
/* 제목 옆 범례. 조건 화면과 같은 규칙을 쓴다. */
.legend {
  margin-left: 18px;
  font-size: var(--font-body-03);
  font-weight: 600;
  color: #6b7280;
}
.legend::before {
  content: '*';
  margin-right: 4px;
  color: #d92d20;
  font-weight: 700;
}
.lead {
  margin: 0;
  max-width: 1100px;
  font-size: var(--font-body-02);
  line-height: 1.65;
  font-weight: 500;
  color: #6b7280;
}
/* 접수가 아직 안 된다는 사실. 폼 위에 둔다 — 다 쓰고 나서 알게 하면 안 된다. */
.pending code {
  padding: 2px 8px;
  border-radius: 4px;
  background-color: #fff5e2;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
}
.pending {
  padding: 26px 32px;
  border-radius: 12px;
  border-left: 6px solid #a86504;
  background-color: #fdf0da;
  font-size: var(--font-body-03);
  line-height: 1.65;
  font-weight: 600;
  color: #6b4a05;
}

/* ── 폼 ─────────────────────────────────────────────────── */
.form {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 48px 52px 52px;
  box-sizing: border-box;
  border-radius: 20px;
  background-color: #fff;
  border: 2px solid #e6e7eb;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
}
.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.label {
  font-size: var(--font-body-02);
  font-weight: 600;
  color: #00559e;
}
.required {
  margin-left: 4px;
  color: #d92d20;
  font-weight: 700;
}
.input {
  height: 76px;
  padding: 0 24px;
  box-sizing: border-box;
  border-radius: 12px;
  border: 2px solid #d0d0d0;
  background-color: #fff;
  font-family: inherit;
  font-size: var(--font-body-02);
  color: #1f2937;
  outline: none;
}
.input:focus {
  border-color: #0053e3;
}
.input::placeholder {
  color: #a0a0a0;
}
.inputBad {
  border-color: #d92d20;
}
/* select 는 기본 화살표를 지우지 않는다 — 이 화면은 배율이 걸린 캔버스 안에서도
   네이티브 화살표가 어긋나지 않는 크기다. */
.select {
  cursor: pointer;
}
.textarea {
  height: auto;
  padding: 22px 24px;
  line-height: 1.6;
  resize: vertical;
}
.problem {
  font-size: var(--font-body-03);
  font-weight: 600;
  color: #d92d20;
}
.pledge {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 26px 30px;
  border-radius: 12px;
  background-color: #f2f8ff;
  border: 2px solid #d6e8fa;
  font-size: var(--font-body-03);
  line-height: 1.6;
  font-weight: 500;
  color: #1f2937;
  cursor: pointer;
}
.pledgeBad {
  border-color: #d92d20;
}
.checkbox {
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  margin: 2px 0 0;
  accent-color: #0053e3;
  cursor: pointer;
}
.submitRow {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}
.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 76px;
  padding: 0 48px;
  border: none;
  border-radius: 12px;
  box-sizing: border-box;
  font-family: inherit;
  font-size: var(--font-body-01);
  font-weight: 700;
  white-space: nowrap;
}
.ctaFill {
  background-color: #0053e3;
  color: #fff;
}
.formError {
  font-size: var(--font-body-03);
  font-weight: 600;
  color: #d92d20;
}

/* ── 결과 ───────────────────────────────────────────────── */
.result {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 24px;
  padding: 48px 52px 52px;
  border-radius: 20px;
  background: linear-gradient(-10.99deg, #fff, #f9fbff 36.03%, #f2f8ff);
  border: 2px solid #d6e8fb;
}
.resultTitle {
  margin: 0;
  font-size: var(--font-title-03);
  font-weight: 700;
  color: #002f5f;
}
.resultLead {
  margin: 0;
  font-size: var(--font-body-02);
  line-height: 1.6;
  font-weight: 500;
  color: #6b7280;
}
.keysLink {
  font-size: var(--font-body-03);
  font-weight: 600;
  color: #0053e3;
  width: fit-content;
}
.resultActions {
  display: flex;
  align-items: center;
  gap: 28px;
  flex-wrap: wrap;
}
/* 키는 한 줄로 길다. 줄바꿈을 허용해 상자를 넘지 않게 하고, 눌러 고르기 쉽게
   글자를 키운다 — 여기서 복사하지 못하면 다시 볼 수 없다. */
.keyBox {
  margin: 0;
  align-self: stretch;
  padding: 30px 32px;
  border-radius: 12px;
  background-color: #fff;
  border: 2px solid #0053e3;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: var(--font-body-02);
  line-height: 1.6;
  color: #002f5f;
  white-space: pre-wrap;
  word-break: break-all;
  user-select: all;
}
.resultWarn {
  margin: 0;
  font-size: var(--font-body-03);
  line-height: 1.6;
  font-weight: 600;
  color: #a86504;
}
.copy {
  padding: 0 36px;
  height: 62px;
  display: inline-flex;
  align-items: center;
  border-radius: 12px;
  background-color: transparent;
  border: 2px solid #0053e3;
  font-family: inherit;
  font-size: var(--font-body-02);
  font-weight: 700;
  color: #0053e3;
}

.hint {
  font-size: var(--font-body-03);
  font-weight: 500;
  color: #9ca3af;
}
/* 분당 요청 수는 짧은 선택이라 한 칸만 쓴다. */
.fieldHalf {
  width: calc(50% - 14px);
}
.cta:disabled {
  background-color: #9ca3af;
  cursor: default;
}
.verify {
  align-self: stretch;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 24px;
  border-top: 1px solid #d6e8fa;
}
.verifyLabel {
  font-size: var(--font-body-03);
  font-weight: 700;
  color: #00559e;
}
.verifyBox {
  margin: 0;
  padding: 24px 28px;
  border-radius: 12px;
  background-color: #fff;
  border: 1px solid #d6e8fa;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: var(--font-code);
  line-height: 1.7;
  color: #1f2937;
  white-space: pre-wrap;
  word-break: break-all;
  user-select: all;
}
.verifyNote {
  font-size: var(--font-body-03);
  line-height: 1.6;
  font-weight: 500;
  color: #9ca3af;
}
.footer {
  margin-left: -100px;
  width: 2120px;
  height: 244px;
  background-color: #f3f3f3;
}
</style>
