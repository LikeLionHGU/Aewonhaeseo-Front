/**
 * Vercel 에서 /api 를 백엔드로 중계한다.
 *
 * 정적 호스팅에 그냥 올리면 /api 요청이 앱의 index.html 로 떨어진다 — GET 은 200 에
 * HTML, POST 는 405·404 다(2026-08-21 확인). 그러면 로그인은 실패하는데 /auth/me 는
 * "성공" 이라 앱이 로그인한 것으로 착각한다.
 *
 * 프론트를 다른 출처에 두고 백엔드를 직접 부르는 방법은 쓸 수 없다. AWON_ACCESS_TOKEN
 * 쿠키가 SameSite=Strict 라서, CORS 를 열어 줘도 브라우저가 다른 사이트에서 시작된
 * 요청에는 그 쿠키를 붙이지 않는다. 그래서 같은 출처로 중계한다 — 개발의 vite 프록시,
 * Deno 배포의 serve.ts 와 같은 구조다.
 *
 * vercel.json 의 rewrite 만으로 백엔드에 바로 넘기는 방법은 쓸 수 없다. 브라우저는 같은
 * 출처라도 POST 에 Origin 을 붙이고, 그게 백엔드로 넘어가면 CORS 검사에 걸려 403 이 된다 —
 * 허용 목록에 http://localhost:5173 하나뿐이다. 그래서 함수를 거쳐 Origin 을 떼어 보낸다.
 *
 * 원래 파일 이름이 api/[...path].ts 였는데, Next.js 가 아닌 프로젝트에서 그 catch-all 은
 * 한 조각만 잡는다 — /api/x 는 함수까지 왔지만 /api/v1/auth/me 는 404 였다
 * (2026-08-21 배포에서 확인). 그래서 평범한 이름으로 두고 vercel.json 의 rewrite 가
 * 경로를 awonPath 로 넘겨 준다.
 */
export const config = { runtime: 'edge' }

/** 배포 환경에서 BACKEND_ORIGIN 환경변수로 덮어쓴다. */
const DEFAULT_BACKEND = 'https://1-201-116-24.sslip.io'

/**
 * 백엔드로 넘기지 않을 헤더.
 *
 * origin·referer 는 위에서 말한 CORS 때문에 뗀다. 나머지는 홉 단위 헤더이거나
 * fetch 가 다시 만든다.
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

/**
 * vercel.json 이 /api/(.*) 를 이 함수로 보내면서 잡은 부분을 awonPath 로 붙여 준다.
 * rewrite 를 거치면 request.url 은 목적지(/api/proxy)라 원래 경로가 사라지므로,
 * 그 값으로 되살린다.
 */
const PATH_PARAM = 'awonPath'

/**
 * awonPath 만 떼어내고 원래 쿼리는 글자 그대로 남긴다.
 *
 * URLSearchParams 로 지우면 남은 쿼리가 다시 직렬화된다 — 지점명 같은 한글 값과
 * 공백이 그 과정에서 모양이 바뀔 수 있다. 백엔드는 인코딩에 민감해서(한글을 그냥
 * 붙이면 톰캣이 400 으로 끊는다) 손대지 않는 편이 안전하다.
 */
function splitPath(search: string) {
  const pairs = search.slice(1).split('&').filter(Boolean)
  const carried = pairs.find((pair) => pair.startsWith(`${PATH_PARAM}=`))
  if (carried === undefined) return null
  const rest = pairs.filter((pair) => pair !== carried)
  return {
    path: decodeURIComponent(carried.slice(PATH_PARAM.length + 1)),
    search: rest.length ? `?${rest.join('&')}` : '',
  }
}

export default async function handler(request: Request): Promise<Response> {
  const backend = process.env.BACKEND_ORIGIN ?? DEFAULT_BACKEND
  const url = new URL(request.url)

  const carried = splitPath(url.search)
  if (!carried) {
    // rewrite 를 거치지 않고 함수 주소로 바로 온 요청이다. 넘길 경로가 없다.
    return Response.json(
      { error: { code: 'NOT_FOUND', message: '중계할 경로가 없어요.' } },
      { status: 404 },
    )
  }

  const target = new URL(`/api/${carried.path}${carried.search}`, backend)

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
    // Set-Cookie 는 손대지 않는다. 배포는 https 라 Secure 가 유효하고, Domain 이
    // 없는 호스트 전용 쿠키라 이 사이트에 그대로 붙는다.
    return new Response(upstream.body, { status: upstream.status, headers })
  } catch {
    return Response.json(
      { error: { code: 'UPSTREAM_UNREACHABLE', message: '백엔드에 연결하지 못했어요.' } },
      { status: 502 },
    )
  }
}
