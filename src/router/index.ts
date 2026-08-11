import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '../pages/LandingPage.vue'
import MainPage from '../pages/MainPage.vue'
import AskPage from '../pages/AskPage.vue'
import ConditionsPage from '../pages/ConditionsPage.vue'
import ResultsPage from '../pages/ResultsPage.vue'
import EvidencePage from '../pages/EvidencePage.vue'
import RowDetailPage from '../pages/RowDetailPage.vue'

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
  ],
})
