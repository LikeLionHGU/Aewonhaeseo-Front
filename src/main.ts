import { createApp } from 'vue'
import './global.css'
import App from './App.vue'
import { router } from './router'
import { setUnauthorizedHandler } from './api/client'
import { useAuth } from './composables/useAuth'

/**
 * 세션이 끊긴 뒤의 처리를 한 곳에서 정한다.
 *
 * 쿠키가 8시간짜리라 화면을 열어 둔 채 만료될 수 있다. 그러면 API 가 401 을
 * 내는데, 화면은 그대로라 로그인한 것처럼 보인다. 그 상태를 정리하고 로그인
 * 화면으로 보낸다. 로그인을 마치면 보던 화면으로 돌아온다.
 *
 * client.ts 가 아니라 여기서 꽂는 이유는 순환 참조를 피하기 위해서다.
 */
setUnauthorizedHandler(() => {
  const { clearSession } = useAuth()
  clearSession()

  const current = router.currentRoute.value
  // 이미 로그인·가입 화면이면 그대로 둔다. 여러 요청이 한꺼번에 401 을 받아도
  // 로그인 화면에서 로그인 화면으로 뛰지 않는다.
  if (current.name === 'login' || current.name === 'signup') return

  // push 가 아니라 replace 다 — 뒤로 가기로 만료된 화면에 되돌아가지 않게.
  router.replace({ name: 'login', query: { redirect: current.fullPath } })
})

createApp(App).use(router).mount('#app')
