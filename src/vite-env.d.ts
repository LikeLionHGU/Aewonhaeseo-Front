/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  /**
   * API 앞에 붙일 출처. 비워두면 같은 출처로 나가고 개발 중에는 vite 프록시가
   * 백엔드로 넘긴다. 프론트와 백엔드를 다른 도메인에 올릴 때만 지정한다.
   */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
