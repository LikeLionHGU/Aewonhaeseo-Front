import { serveDir } from '@std/http/file-server'

// 백엔드 주소. 배포 환경에서 BACKEND_ORIGIN 으로 덮어쓴다.
const BACKEND = Deno.env.get('BACKEND_ORIGIN') ?? 'http://100.62.74.158'
const PORT = Number(Deno.env.get('PORT') ?? 8000)

/**
 * 백엔드로 넘기지 않을 헤더들.
 *
 * origin·referer 를 그대로 전달하면 백엔드가 브라우저 요청으로 보고 CORS 검사를
 * 걸어 403 "Invalid CORS request" 를 낸다. 프록시는 서버 대 서버 호출이라
 * CORS 대상이 아니므로 떼고 보낸다. 나머지는 홉 단위 헤더거나 fetch 가 다시 만든다.
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
  for (const [key, value] of source) {
    if (!DROP_HEADERS.has(key.toLowerCase())) headers.set(key, value)
  }
  return headers
}

/**
 * API 요청을 백엔드로 넘긴다.
 *
 * 프론트를 같은 출처로 서빙하면 브라우저가 CORS 를 따지지 않아 백엔드에
 * 도메인을 등록할 필요가 없다. 개발 환경의 vite 프록시와 같은 구조라
 * 두 환경의 동작이 어긋나지 않는다.
 */
async function proxyToBackend(req: Request, url: URL) {
  const target = new URL(url.pathname + url.search, BACKEND)
  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: forwardHeaders(req.headers),
      body: req.body,
      redirect: 'manual',
      // 스트리밍 본문(파일 업로드)을 그대로 흘려보내려면 필요하다.
      ...(req.body ? { duplex: 'half' } : {}),
    } as RequestInit)

    const headers = forwardHeaders(upstream.headers)
    // fetch 가 이미 압축을 풀어 주므로 원본 인코딩 헤더를 남기면 안 된다.
    headers.delete('content-encoding')
    return new Response(upstream.body, { status: upstream.status, headers })
  } catch (error) {
    console.error(`[proxy] ${req.method} ${target} 실패:`, error)
    return Response.json(
      { error: { code: 'UPSTREAM_UNREACHABLE', message: '백엔드에 연결하지 못했어요.' } },
      { status: 502 },
    )
  }
}

Deno.serve({ port: PORT }, async (req) => {
  const url = new URL(req.url)

  if (url.pathname.startsWith('/api/')) return proxyToBackend(req, url)

  const res = await serveDir(req, { fsRoot: 'dist', quiet: true })

  // history 모드 라우팅 — /upload 같은 경로로 직접 들어오거나 새로고침하면
  // 그런 파일이 없어 404 가 난다. 앱이 경로를 해석하도록 index.html 을 돌려준다.
  // 자산 요청과 이미지·JSON 요청은 진짜로 없는 것이니 404 를 그대로 둔다 —
  // 여기에 HTML 을 200 으로 돌려주면 깨진 자원이 조용히 묻힌다.
  const wantsHtml = req.headers.get('accept')?.includes('text/html') ?? false
  if (
    res.status === 404 &&
    req.method === 'GET' &&
    wantsHtml &&
    !url.pathname.startsWith('/assets/')
  ) {
    return new Response(await Deno.readFile('dist/index.html'), {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  }
  return res
})

console.log(`물볼래 — http://localhost:${PORT} (API → ${BACKEND})`)
