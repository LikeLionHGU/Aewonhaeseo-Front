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
