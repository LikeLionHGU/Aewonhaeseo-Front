import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 백엔드 주소. 다른 서버를 보려면 VITE_BACKEND_ORIGIN 으로 덮어쓴다.
const BACKEND = process.env.VITE_BACKEND_ORIGIN ?? 'http://100.62.74.158'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // 백엔드에 CORS 가 설정돼 있지 않아서(Access-Control-Allow-Origin 없음)
    // 브라우저에서 직접 부르면 전부 막힌다. 개발 중에는 dev 서버가 대신
    // 중계해서 같은 출처처럼 보이게 한다. 배포 때는 백엔드에 CORS 를 열거나
    // 같은 출처로 서빙해야 한다.
    //
    // 키를 정규식으로 준다. '/api' 로 두면 접두사 매칭이라 /apixxx.html 같은
    // 프론트 경로까지 백엔드로 넘어간다.
    proxy: {
      '^/api/': {
        target: BACKEND,
        changeOrigin: true,
      },
    },
  },
})
