/**
 * Cloudflare Pages 에서 /api 를 백엔드로 중계한다.
 *
 * Pages 는 정적 호스팅이라 /api 요청이 그대로 index.html 로 떨어졌다 —
 * GET /api/v1/auth/me 가 200 에 HTML 을 주고 POST /api/v1/auth/login 은 405 였다
 * (2026-08-21 확인). 그러면 로그인은 실패하는데 /auth/me 는 "성공" 이라 앱이
 * 로그인한 것으로 착각한다.
 *
 * 프론트를 다른 출처에 두고 백엔드를 직접 부르는 방법은 쓸 수 없다. 백엔드가 내려주는
 * AWON_ACCESS_TOKEN 이 SameSite=Strict 라서, CORS 를 열어 줘도 브라우저가 다른
 * 사이트에서 시작된 요청에는 그 쿠키를 붙이지 않는다. 그래서 같은 출처로 중계한다 —
 * 개발의 vite 프록시, Deno 배포의 serve.ts 와 같은 구조다.
 */

/** 배포 환경에서 Pages 환경변수 BACKEND_ORIGIN 으로 덮어쓸 수 있다. */
const DEFAULT_BACKEND = 'https://1-201-116-24.sslip.io'

/**
 * 백엔드로 넘기지 않을 헤더.
 *
 * origin·referer 를 그대로 넘기면 백엔드가 브라우저 요청으로 보고 CORS 를 검사해
 * 403 "Invalid CORS request" 를 낸다. 허용 목록에 localhost:5173 하나만 있어서
 * 배포 주소는 무조건 막힌다. 중계는 서버 대 서버 호출이라 CORS 대상이 아니므로 뗀다.
 * 나머지는 홉 단위 헤더이거나 fetch 가 다시 만든다.
 */
const DROP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'proxy-connection',
  'host',
  'content-length',
  'origin',
  'referer',
])

function forwardHeaders(source: Headers) {
  const headers = new Headers()
  source.forEach((value, key) => {
    if (!DROP_HEADERS.has(key.toLowerCase())) headers.set(key, value)
  })
  return headers
}

type Context = {
  request: Request
  env: Record<string, string | undefined>
}

export async function onRequest({ request, env }: Context): Promise<Response> {
  const backend = env.BACKEND_ORIGIN ?? DEFAULT_BACKEND
  const url = new URL(request.url)
  const target = new URL(url.pathname + url.search, backend)

  try {
    const upstream = await fetch(target.toString(), {
      method: request.method,
      headers: forwardHeaders(request.headers),
      // GET·HEAD 에 본문을 실으면 런타임이 거부한다.
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
    })

    const headers = forwardHeaders(upstream.headers)
    // fetch 가 압축을 이미 풀어 주므로 원본 인코딩 헤더를 남기면 안 된다.
    headers.delete('content-encoding')
    // Set-Cookie 는 손대지 않는다. 배포는 https 라 Secure 가 그대로 유효하고,
    // Domain 이 없는 호스트 전용 쿠키라 이 사이트에 그대로 붙는다.
    return new Response(upstream.body, { status: upstream.status, headers })
  } catch {
    return Response.json(
      { error: { code: 'UPSTREAM_UNREACHABLE', message: '백엔드에 연결하지 못했어요.' } },
      { status: 502 },
    )
  }
}
