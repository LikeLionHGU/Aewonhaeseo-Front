import { computed, ref } from 'vue'
import { ApiError, getMe, logout as logoutRequest } from '../api'
import type { AuthUser } from '../api'

/**
 * 로그인한 사람이 누구인지 한 곳에서 들고 있는다.
 *
 * 토큰은 프론트가 만질 수 없다(AWON_ACCESS_TOKEN 이 HttpOnly 쿠키다). 그래서
 * "로그인했는지"를 알 방법은 /auth/me 를 한 번 물어보는 것뿐이고, 그 결과를
 * 여기에 담아 화면들이 같이 쓴다.
 *
 * 상태를 모듈 수준에 두는 이유는 화면을 옮겨도 살아 있어야 하기 때문이다.
 * useAuth() 를 몇 번 부르든 같은 것을 가리킨다.
 */
const user = ref<AuthUser | null>(null)

/** /auth/me 로 한 번이라도 확인을 마쳤는지. 실패(네트워크)면 올리지 않는다. */
const settled = ref(false)

/** 같은 순간에 여러 화면이 물어봐도 요청은 하나만 나가게 묶어 둔다. */
let inflight: Promise<AuthUser | null> | null = null

async function load() {
  try {
    user.value = await getMe()
    settled.value = true
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      // 로그인하지 않은 상태 — 정상적인 답이다. 다시 물어볼 필요 없다.
      user.value = null
      settled.value = true
    } else {
      // 서버가 죽었거나 연결이 끊긴 경우. 로그아웃으로 단정하면 안 되니
      // settled 를 올리지 않고 다음 이동 때 다시 물어보게 둔다.
      user.value = null
    }
  } finally {
    inflight = null
  }
  return user.value
}

export function useAuth() {
  /**
   * 아직 확인 전이면 /auth/me 를 한 번 부르고, 확인이 끝났으면 바로 돌려준다.
   * 라우터 가드와 화면이 같이 쓴다.
   */
  function ensureLoaded() {
    if (settled.value) return Promise.resolve(user.value)
    if (!inflight) inflight = load()
    return inflight
  }

  /** 로그인·회원가입 응답을 그대로 받아 넣는다 — /auth/me 를 또 부를 필요가 없다. */
  function setUser(next: AuthUser) {
    user.value = next
    settled.value = true
  }

  /**
   * 서버를 부르지 않고 화면 상태만 비운다.
   *
   * 쿠키가 만료돼 401 이 돌아온 경우에 쓴다 — 이미 없는 세션을 지우겠다고
   * /auth/logout 을 부를 이유가 없다.
   */
  function clearSession() {
    user.value = null
    settled.value = true
  }

  /**
   * 로그아웃.
   *
   * 서버 호출이 실패해도 화면 상태는 비운다. 쿠키가 이미 만료됐거나 서버에
   * 닿지 못한 경우인데, 그 상태에서 로그인한 척 남겨 두는 쪽이 더 나쁘다.
   * 서버는 쿠키만 지우고 토큰 자체를 무효화하지는 않는다(stateless).
   *
   * 화면 이동은 부르는 쪽이 한다 — 라우터를 여기서 가져오면 순환 참조가 된다.
   */
  async function signOut() {
    try {
      await logoutRequest()
    } catch {
      // 무시 — 아래에서 어차피 비운다.
    }
    clearSession()
  }

  return {
    user,
    isSignedIn: computed(() => user.value !== null),
    ensureLoaded,
    setUser,
    clearSession,
    signOut,
  }
}
