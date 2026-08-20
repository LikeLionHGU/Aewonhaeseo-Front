/**
 * 기업이 발급받은 키로 부르는 Open API 의 주소.
 *
 * /api 로 시작하지 않아서 개발 서버 프록시(^/api/)를 타지 않는다. 애초에 이 앱이
 * 부를 곳이 아니라 기업의 서버가 부를 곳이므로, 화면에서는 확인용 명령을 만들 때만
 * 쓴다. 배포 환경이 다르면 VITE_OPEN_API_BASE 로 덮어쓴다.
 */
export const OPEN_API_BASE =
  import.meta.env.VITE_OPEN_API_BASE ?? 'https://1-201-116-24.sslip.io'
