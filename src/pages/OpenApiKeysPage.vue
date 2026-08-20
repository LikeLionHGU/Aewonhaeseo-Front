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
  listMyOpenApiKeys,
  listOpenApiKeys,
  listOpenApiOrganizations,
  revokeMyOpenApiKey,
  revokeOpenApiKey,
} from '../api'
import type { OpenApiKey, OpenApiOrganization } from '../api'

/**
 * 발급된 Open API 키 목록.
 *
 * 서버에서 읽는다. 예전에는 브라우저 저장소에 흉내로 남겼는데, 백엔드가 붙어서
 * (2026-08-21) 기업·키·사용 흔적을 서버가 들고 있다.
 *
 * 담당자는 자기 키만 본다(GET /api/v1/open-api/keys). 그 경로가 서버에 아직 없어서
 * (404, 2026-08-21) 지금은 무엇이 없는지 알려 주고, 생기면 그대로 동작한다.
 * 관리자는 기업별로 묶어 전체를 본다(관리자 경로).
 *
 * 키 원문은 여기 없다 — 서버도 앞부분(prefix)만 돌려준다. 발급 직후 화면에서
 * 복사하지 못했다면 새로 발급받아야 한다.
 */
const DESIGN_WIDTH = 1920

const { scale, offsetX } = useDesignScale(DESIGN_WIDTH)
const router = useRouter()
const { user, ensureLoaded } = useAuth()

const canvas = ref<HTMLElement | null>(null)
const canvasHeight = useCanvasHeight(canvas)

/** 기업 한 곳과 그 기업의 키들. */
type OrgKeys = { organization: OpenApiOrganization; keys: OpenApiKey[] }

const groups = ref<OrgKeys[]>([])
/** 담당자 본인 키. 기업이 하나뿐이라 기업별로 묶지 않는다. */
const myKeys = ref<OpenApiKey[]>([])
const loading = ref(true)
const loadError = ref('')
/** 서버에 담당자용 조회 경로가 없을 때. 무엇이 없는지 화면에 그대로 적는다. */
const missing = ref(false)
const busyKeyId = ref<number | null>(null)

const isAdmin = computed(() => user.value?.role === 'ADMIN')
const isEmpty = computed(
  () =>
    !loading.value &&
    !loadError.value &&
    !missing.value &&
    !groups.value.length &&
    !myKeys.value.length,
)

function describe(error: unknown) {
  if (!(error instanceof ApiError)) return '알 수 없는 오류가 발생했어요'
  if (error.code === 'HTTP_ERROR' || error.code === 'NETWORK_ERROR') {
    return '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요'
  }
  return error.message
}

async function load() {
  loading.value = true
  loadError.value = ''
  missing.value = false
  groups.value = []
  myKeys.value = []
  try {
    if (isAdmin.value) {
      const organizations = await listOpenApiOrganizations()
      // 기업이 여러 곳이면 키 조회를 나란히 보낸다. 한 곳이 실패해도 나머지는 보여준다.
      const settled = await Promise.allSettled(
        organizations.map(async (organization) => ({
          organization,
          keys: await listOpenApiKeys(organization.id),
        })),
      )
      groups.value = settled.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : [],
      )
    } else {
      myKeys.value = await listMyOpenApiKeys()
    }
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 0
    if (status === 404 || status === 403) missing.value = true
    else loadError.value = describe(error)
  } finally {
    loading.value = false
  }
}

/** 키를 폐기한다. 되돌릴 수 없으므로 한 번 묻는다. orgId 는 관리자 경로에만 필요하다. */
async function revoke(orgId: number | null, key: OpenApiKey) {
  if (busyKeyId.value !== null) return
  const ok = window.confirm(
    `'${key.name}' 키를 폐기할까요?\n폐기하면 이 키로 오는 요청이 즉시 막히고 되돌릴 수 없어요.`,
  )
  if (!ok) return
  busyKeyId.value = key.id
  loadError.value = ''
  try {
    if (orgId === null) await revokeMyOpenApiKey(key.id)
    else await revokeOpenApiKey(orgId, key.id)
    await load()
  } catch (error) {
    loadError.value = describe(error)
  } finally {
    busyKeyId.value = null
  }
}

/** '2026-08-21T01:20:33' → '2026-08-21 01:20' */
function formatMoment(iso?: string) {
  if (!iso) return '-'
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())}`
}

onMounted(async () => {
  // 관리자인지 알아야 어느 경로로 조회할지 정해진다.
  await ensureLoaded()
  await load()
})
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
          <h1 :class="$style.title">발급된 API 키</h1>
          <p :class="$style.lead">
            키 원문은 발급 직후 한 번만 볼 수 있어 여기에는 앞부분만 남습니다. 잃어버렸다면
            새로 발급받아 주세요. 폐기한 키로 오는 요청은 즉시 막힙니다.
          </p>
        </header>

        <div v-if="missing" :class="$style.pending">
          담당자가 자기 키를 보는 경로가 <b>서버에 아직 없습니다</b>
          (<code>GET /api/v1/open-api/keys</code>). 백엔드에 이 경로가 추가되면 여기에서 바로
          보입니다.
        </div>
        <div v-else-if="loadError" :class="$style.pendingError">{{ loadError }}</div>

        <div v-if="loading" :class="$style.empty">발급된 키를 불러오는 중이에요…</div>

        <div v-else-if="isEmpty" :class="$style.empty">
          아직 발급된 키가 없어요.
          <span :class="[$style.emptyLink, 'link']" @click="router.push('/open-api/apply')">
            API 키 발급받기 →
          </span>
        </div>

        <!-- 담당자 본인 키. 기업이 하나뿐이라 묶지 않는다. -->
        <ul v-else-if="!isAdmin && myKeys.length" :class="$style.list">
          <li v-for="key in myKeys" :key="key.id" :class="$style.keyRow">
            <div :class="$style.keyMain">
              <div :class="$style.keyName">
                {{ key.name }}
                <span v-if="!key.active" :class="$style.revoked">폐기됨</span>
              </div>
              <code :class="$style.keyPrefix">{{ key.prefix }}…</code>
            </div>
            <dl :class="$style.meta">
              <div :class="$style.metaItem"><dt>분당 요청</dt><dd>{{ key.requests_per_minute }}회</dd></div>
              <div :class="$style.metaItem"><dt>발급</dt><dd>{{ formatMoment(key.created_at) }}</dd></div>
              <div :class="$style.metaItem"><dt>마지막 사용</dt><dd>{{ formatMoment(key.last_used_at) }}</dd></div>
              <div v-if="key.revoked_at" :class="$style.metaItem"><dt>폐기</dt><dd>{{ formatMoment(key.revoked_at) }}</dd></div>
            </dl>
            <button
              v-if="key.active"
              type="button"
              :class="[$style.forget, 'link']"
              :disabled="busyKeyId === key.id"
              @click="revoke(null, key)"
            >
              {{ busyKeyId === key.id ? '폐기 중…' : '키 폐기' }}
            </button>
          </li>
        </ul>

        <!-- 관리자는 기업별로 묶어서 전체를 본다. -->
        <ul v-else-if="isAdmin && groups.length" :class="$style.list">
          <li v-for="group in groups" :key="group.organization.id" :class="$style.card">
            <div :class="$style.cardHead">
              <div>
                <div :class="$style.company">{{ group.organization.name }}</div>
                <div :class="$style.issuedAt">
                  {{ formatMoment(group.organization.created_at) }} 등록 ·
                  {{ group.organization.active ? '사용 중' : '중지됨' }} ·
                  키 {{ group.keys.length }}개
                </div>
              </div>
            </div>

            <div v-if="!group.keys.length" :class="$style.noKeys">이 기업에는 아직 키가 없어요.</div>

            <div v-for="key in group.keys" :key="key.id" :class="$style.keyRow">
              <div :class="$style.keyMain">
                <div :class="$style.keyName">
                  {{ key.name }}
                  <span v-if="!key.active" :class="$style.revoked">폐기됨</span>
                </div>
                <code :class="$style.keyPrefix">{{ key.prefix }}…</code>
              </div>
              <dl :class="$style.meta">
                <div :class="$style.metaItem"><dt>분당 요청</dt><dd>{{ key.requests_per_minute }}회</dd></div>
                <div :class="$style.metaItem"><dt>발급</dt><dd>{{ formatMoment(key.created_at) }}</dd></div>
                <div :class="$style.metaItem"><dt>마지막 사용</dt><dd>{{ formatMoment(key.last_used_at) }}</dd></div>
                <div v-if="key.revoked_at" :class="$style.metaItem"><dt>폐기</dt><dd>{{ formatMoment(key.revoked_at) }}</dd></div>
              </dl>
              <button
                v-if="key.active"
                type="button"
                :class="[$style.forget, 'link']"
                :disabled="busyKeyId === key.id"
                @click="revoke(group.organization.id, key)"
              >
                {{ busyKeyId === key.id ? '폐기 중…' : '키 폐기' }}
              </button>
            </div>
          </li>
        </ul>

        <div v-if="!loading" :class="$style.moreRow">
          <button
            type="button"
            :class="[$style.cta, $style.ctaOutline, 'btn', 'btn-outline']"
            @click="router.push('/open-api/apply')"
          >
            키 발급받기
          </button>
        </div>
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
  gap: 40px;
  max-width: 1500px;
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
.lead {
  margin: 0;
  max-width: 1100px;
  font-size: var(--font-body-02);
  line-height: 1.65;
  font-weight: 500;
  color: #6b7280;
}
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

/* ── 빈 상태 ────────────────────────────────────────────── */
.empty {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 60px 48px;
  border-radius: 20px;
  background-color: #fcfcfc;
  border: 2px dashed #d6e8fa;
  font-size: var(--font-body-02);
  font-weight: 600;
  color: #6b7280;
}
.emptyLink {
  font-weight: 700;
  color: #0053e3;
}

/* ── 목록 ───────────────────────────────────────────────── */
.list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.card {
  display: flex;
  flex-direction: column;
  gap: 26px;
  padding: 40px 48px 44px;
  border-radius: 20px;
  background-color: #fff;
  border: 2px solid #e6e7eb;
  box-shadow: 2px 2px 10px 1px rgba(179, 179, 179, 0.2);
}
.cardHead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}
.company {
  font-size: var(--font-title-03);
  font-weight: 700;
  color: #002f5f;
}
.issuedAt {
  margin-top: 8px;
  font-size: var(--font-body-03);
  font-weight: 500;
  color: #9ca3af;
}
.forget {
  padding: 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: var(--font-body-03);
  font-weight: 600;
  color: #d92d20;
}
/* 키 한 장. 기업 카드 안에 여러 개가 쌓이므로 세로로 정보를 나열한다. */
.keyRow {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px 28px;
  border-radius: 12px;
  background-color: #f2f8ff;
  border: 1px solid #d6e8fa;
}
/* 신청 내용. dt/dd 를 쓰되 보기는 두 줄짜리 칸으로 나열한다. */
.meta {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px 32px;
}
.metaItem {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.metaItem dt {
  font-size: var(--font-body-03);
  font-weight: 600;
  color: #9ca3af;
}
.metaItem dd {
  margin: 0;
  font-size: var(--font-body-02);
  font-weight: 600;
  color: #1f2937;
  overflow-wrap: anywhere;
}

.moreRow {
  display: flex;
}
.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 76px;
  padding: 0 48px;
  border-radius: 12px;
  box-sizing: border-box;
  font-family: inherit;
  font-size: var(--font-body-01);
  font-weight: 700;
  white-space: nowrap;
}
.ctaOutline {
  background-color: transparent;
  border: 2px solid #0053e3;
  color: #0053e3;
}

.pendingError {
  padding: 26px 32px;
  border-radius: 12px;
  border-left: 6px solid #d92d20;
  background-color: #fce8e6;
  font-size: var(--font-body-03);
  line-height: 1.65;
  font-weight: 600;
  color: #8a1c14;
}
.noKeys {
  font-size: var(--font-body-03);
  font-weight: 500;
  color: #9ca3af;
}
.keyMain {
  display: flex;
  align-items: baseline;
  gap: 18px;
  flex-wrap: wrap;
}
.keyName {
  font-size: var(--font-body-02);
  font-weight: 700;
  color: #002f5f;
}
.revoked {
  margin-left: 10px;
  padding: 4px 12px;
  border-radius: 20px;
  background-color: #fce8e6;
  font-size: var(--font-body-03);
  font-weight: 700;
  color: #d92d20;
}
.keyPrefix {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: var(--font-body-03);
  color: #00559e;
  word-break: break-all;
}
.forget:disabled {
  color: #9ca3af;
}
.footer {
  margin-left: -100px;
  width: 2120px;
  height: 244px;
  background-color: #f3f3f3;
}
</style>
