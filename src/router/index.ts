import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import LandingPage from '../pages/LandingPage.vue'
import LoginPage from '../pages/LoginPage.vue'
import SignupPage from '../pages/SignupPage.vue'
import MainPage from '../pages/MainPage.vue'
import AskPage from '../pages/AskPage.vue'
import ConditionsPage from '../pages/ConditionsPage.vue'
import ResultsPage from '../pages/ResultsPage.vue'
import EvidencePage from '../pages/EvidencePage.vue'
import RowDetailPage from '../pages/RowDetailPage.vue'
import DataPage from '../pages/DataPage.vue'
import UploadPage from '../pages/UploadPage.vue'
import MappingPage from '../pages/MappingPage.vue'
import TermsPage from '../pages/TermsPage.vue'
import TermsDonePage from '../pages/TermsDonePage.vue'

export const router = createRouter({
  history: createWebHistory(),
  /**
   * 화면을 옮기면 맨 위에서 시작한다.
   *
   * 기본값은 스크롤 위치를 그대로 두는 것이라, 결과 화면 아래쪽 "근거 상세 보기"
   * 를 누르면 근거 화면도 그 높이에서 열려 페이지 하단이 먼저 보였다.
   * 뒤로/앞으로 가기는 브라우저가 기억한 자리로 되돌린다.
   */
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
  routes: [
    { path: '/', name: 'landing', component: LandingPage },
    { path: '/login', name: 'login', component: LoginPage },
    { path: '/signup', name: 'signup', component: SignupPage },
    { path: '/main', name: 'main', component: MainPage },
    { path: '/ask', name: 'ask', component: AskPage },
    { path: '/conditions', name: 'conditions', component: ConditionsPage },
    { path: '/results', name: 'results', component: ResultsPage },
    { path: '/evidence', name: 'evidence', component: EvidencePage },
    { path: '/row-detail', name: 'row-detail', component: RowDetailPage },
    { path: '/data', name: 'data', component: DataPage },
    { path: '/upload', name: 'upload', component: UploadPage },
    { path: '/mapping', name: 'mapping', component: MappingPage },
    { path: '/terms', name: 'terms', component: TermsPage },
    { path: '/terms-done', name: 'terms-done', component: TermsDonePage },
  ],
})

/**
 * 로그인 없이 볼 수 있는 화면.
 *
 * 나머지는 /auth/me 로 한 번 확인하고, 아니면 로그인 화면으로 보낸다. 확인은
 * useAuth 가 한 번만 하고 결과를 들고 있으므로 이동할 때마다 묻지 않는다.
 *
 * 주의: 이건 화면 흐름일 뿐 보호 장치가 아니다. 백엔드의 데이터 엔드포인트
 * (/files·/analyses·/measurements)는 2026-08-19 확인 시점에 쿠키 없이도
 * 열려 있었다. 실제 차단은 서버가 해야 한다.
 */
const PUBLIC_ROUTES = new Set(['landing', 'login', 'signup'])

router.beforeEach(async (to) => {
  const { ensureLoaded } = useAuth()
  const isPublic = PUBLIC_ROUTES.has(String(to.name))

  if (isPublic) {
    // 이미 로그인한 사람에게 로그인·가입 화면을 다시 보여줄 이유가 없다.
    // 랜딩은 로그인 여부와 상관없이 보여 준다.
    if (to.name === 'login' || to.name === 'signup') {
      const user = await ensureLoaded()
      if (user) return { name: 'main' }
    }
    return true
  }

  const user = await ensureLoaded()
  if (user) return true
  // 로그인을 마치면 원래 가려던 곳으로 돌려보낸다.
  return { name: 'login', query: { redirect: to.fullPath } }
})
