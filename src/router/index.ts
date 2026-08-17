import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '../pages/LandingPage.vue'
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
