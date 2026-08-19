import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 백엔드 주소. 다른 서버를 보려면 VITE_BACKEND_ORIGIN 으로 덮어쓴다.
//
// sslip.io 는 주소를 호스트명으로 바꿔 주는 DNS 서비스라(1-201-116-24 → 1.201.116.24)
// IP 뿐인 서버에도 Let's Encrypt 인증서를 붙일 수 있다. 평문 http 주소도 아직
// 살아 있지만 https 로 통일해 둔다 — 개발에서도 자격증명이 평문으로 나가지 않는다.
const BACKEND = process.env.VITE_BACKEND_ORIGIN ?? 'https://1-201-116-24.sslip.io'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // 개발 중에는 dev 서버가 /api 를 백엔드로 중계해 같은 출처처럼 보이게 한다.
    //
    // 포트를 바꾸지 말 것(2026-08-19 확인). 백엔드가 Origin 을 검사하는데
    // 허용 목록에 http://localhost:5173 만 들어 있다. 다른 포트로 띄우면
    // 프록시가 그 Origin 을 그대로 넘겨서 "Invalid CORS request" 로 막힌다.
    // 5174·4173·127.0.0.1:5173 도 모두 거절당한다.
    //
    // 키를 정규식으로 준다. '/api' 로 두면 접두사 매칭이라 /apixxx.html 같은
    // 프론트 경로까지 백엔드로 넘어간다.
    proxy: {
      '^/api/': {
        target: BACKEND,
        changeOrigin: true,
        /**
         * 인증 쿠키에서 Secure 를 떼고 넘긴다 — 개발 서버에서만.
         *
         * 백엔드는 AWON_ACCESS_TOKEN 을 "Secure; HttpOnly; SameSite=Strict" 로
         * 내려준다. 그런데 개발 중에는 http://localhost:5173 이라 평문이다.
         *
         * 크롬 계열은 localhost 를 신뢰할 수 있는 출처로 봐서 평문이어도
         * Secure 쿠키를 저장해 준다. WebKit(사파리·Orion)은 그 예외가 없어서
         * 조용히 버린다(2026-08-19 확인). 그러면 로그인은 200 으로 성공하는데
         * 쿠키가 없어서, 화면은 넘어갔다가 새로고침하면 다시 로그인 화면으로
         * 돌아오는 고리에 빠진다.
         *
         * 배포는 이 프록시를 타지 않으므로 Secure 가 그대로 유지된다.
         * 단, 배포 주소가 https 여야 한다 — 평문이면 같은 문제가 재현된다.
         */
        configure(proxy) {
          proxy.on('proxyRes', (proxyRes) => {
            const cookies = proxyRes.headers['set-cookie']
            if (!cookies) return
            proxyRes.headers['set-cookie'] = cookies.map((cookie) =>
              cookie.replace(/;\s*Secure/gi, ''),
            )
          })
        },
      },
    },
  },
})
