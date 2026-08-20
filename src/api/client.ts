// 백엔드 호출의 공통 부분 — 주소 조립, 쿼리 인코딩, 에러 변환.

// 기본값을 빈 문자열로 두면 같은 출처로 요청이 나가고, 개발 중에는
// vite.config.ts 의 프록시가 /api 를 백엔드로 넘긴다.
//
// 백엔드에 CORS 허용 목록이 생겼지만(2026-08-19 확인) http://localhost:5173
// 하나뿐이다. 배포 환경에서 출처가 갈리면 VITE_API_BASE 로 덮어쓰되, 그 출처를
// 백엔드 허용 목록에 넣고 인증 쿠키가 오가야 하니 credentials 도 함께 열어야 한다.
const BASE = import.meta.env.VITE_API_BASE ?? ''

/** 서버가 {"error":{"code","message"}} 로 내려주는 실패 응답. */
export class ApiError extends Error {
  status: number
  code: string
  /**
   * VALIDATION_FAILED 일 때 어느 칸이 틀렸는지 — {"password":"size must be ..."}.
   *
   * 키가 camelCase 로 온다(요청은 display_name, 응답은 displayName). 화면에서
   * 입력칸에 붙일 때 그대로 쓰지 말고 변환해야 한다.
   */
  detail?: Record<string, string>

  constructor(status: number, code: string, message: string, detail?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.detail = detail
  }
}

/**
 * 401 을 만났을 때 부를 곳 — 세션을 비우고 로그인 화면으로 보낸다.
 *
 * 쿠키는 8시간짜리라 화면을 열어 둔 채 만료될 수 있다. 그때 각 화면이 알아서
 * 처리하게 두면 화면마다 제각각이 되므로 여기 한 곳에서 알린다.
 *
 * 처리 내용을 여기 직접 쓰지 않고 밖에서 꽂게 한 이유는 순환 참조 때문이다 —
 * useAuth 와 router 가 모두 이 파일에 의존한다(useAuth → api → client).
 * 실제 연결은 main.ts 가 한다.
 */
type UnauthorizedHandler = () => void

let onUnauthorized: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  onUnauthorized = handler
}

/**
 * 인증 엔드포인트의 401 은 실패가 아니라 정상적인 답이다.
 *
 *   /auth/me    로그인하지 않았다는 뜻 — 가드가 이걸로 판단한다
 *   /auth/login 비밀번호가 틀렸다는 뜻 — 로그인 화면이 문구를 띄운다
 *
 * 이것까지 세션 만료로 처리하면 로그인 화면에서 로그인 화면으로 되돌리는
 * 뜀박질이 생긴다.
 */
function isAuthPath(path: string) {
  return path.includes('/auth/')
}

function notifyUnauthorized(status: number, path: string) {
  if (status !== 401 || isAuthPath(path)) return
  onUnauthorized?.()
}

type QueryValue = string | number | boolean | undefined | null

/**
 * 쿼리 문자열을 만든다. 값이 비면 키를 통째로 뺀다.
 *
 * URLSearchParams 를 쓰는 이유는 한글 파라미터(가지역, 배출허용기준) 때문이다.
 * 인코딩하지 않고 붙이면 톰캣이 400 Bad Request 로 끊는다.
 */
export function query(params: Record<string, QueryValue>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

async function toError(res: Response, body: unknown) {
  // 스프링 밖에서 끊긴 요청(톰캣 400 등)은 JSON 이 아니라 HTML 로 온다.
  if (body && typeof body === 'object' && 'error' in body) {
    const error = (body as {
      error: { code?: string; message?: string; detail?: Record<string, string> }
    }).error
    return new ApiError(
      res.status,
      error.code ?? 'UNKNOWN',
      error.message ?? res.statusText,
      error.detail,
    )
  }
  return new ApiError(res.status, 'HTTP_ERROR', `${res.status} ${res.statusText}`)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // 인증이 AWON_ACCESS_TOKEN 쿠키로 오간다. 같은 출처(개발 중 프록시)면 기본값
  // 으로도 실리지만, VITE_API_BASE 로 출처가 갈리는 배포에서는 include 라야
  // 쿠키가 붙는다. 그때는 백엔드도 허용 출처 + credentials 를 열어야 한다.
  const res = await fetch(`${BASE}${path}`, { credentials: 'include', ...init })

  // 먼저 문자열로 받는다. 본문이 비어 있거나 HTML 일 때 JSON 파싱이
  // 터지면서 진짜 상태 코드를 가려버리는 걸 막는다.
  const text = await res.text()
  let body: unknown = null
  let isJson = false
  if (text) {
    try {
      body = JSON.parse(text)
      isJson = true
    } catch {
      body = text
    }
  }

  if (!res.ok) {
    notifyUnauthorized(res.status, path)
    throw await toError(res, body)
  }

  /*
   * 200 인데 JSON 이 아니면 데이터로 받아선 안 된다.
   *
   * /api 를 중계하지 않는 정적 호스팅에 올리면 모든 /api 요청에 index.html 이
   * 200 으로 돌아온다(2026-08-21 Cloudflare Pages 에서 확인). 그걸 그대로 통과시키면
   * getMe() 가 HTML 문자열을 사용자로 돌려주고, 로그인하지 않았는데 로그인한 것으로
   * 보인다 — 화면은 열리고 데이터만 비어서 원인을 찾기 어렵다. 여기서 끊는다.
   */
  if (text && !isJson) {
    throw new ApiError(
      res.status,
      'NOT_JSON',
      'API 응답이 아니라 다른 것이 왔어요. /api 중계 설정을 확인해 주세요',
    )
  }
  return body as T
}

export function get<T>(path: string) {
  return request<T>(path)
}

/**
 * DELETE. 204 로 본문이 없이 오는 경우가 있어 request() 가 null 을 돌려준다 —
 * 부르는 쪽은 void 로 받으면 된다.
 */
export function del<T>(path: string) {
  return request<T>(path, { method: 'DELETE' })
}

export function post<T>(path: string, payload?: unknown) {
  return request<T>(path, {
    method: 'POST',
    headers: payload === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  })
}

/**
 * 파일 업로드. 진행률을 받아야 해서 fetch 대신 XHR 을 쓴다 — fetch 는 업로드
 * 진행 이벤트를 주지 않는다.
 *
 * FormData 에 Content-Type 을 직접 넣으면 안 된다. boundary 가 빠져서 서버가
 * 본문을 못 읽는다. 브라우저가 알아서 붙이게 둔다.
 */
export function upload<T>(
  path: string,
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE}${path}`)
    // 위 request() 와 같은 이유 — 업로드도 로그인 쿠키를 달고 나가야 한다.
    xhr.withCredentials = true

    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) onProgress(event.loaded / event.total)
      })
    }

    xhr.addEventListener('load', () => {
      let body: unknown = null
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        body = xhr.responseText
      }

      // 업로드 성공은 201 로 온다. 스펙에는 200 이라고 적혀 있으니 범위로 받는다.
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as T)
        return
      }
      notifyUnauthorized(xhr.status, path)
      if (body && typeof body === 'object' && 'error' in body) {
        const detail = (body as { error: { code?: string; message?: string } }).error
        reject(new ApiError(xhr.status, detail.code ?? 'UNKNOWN', detail.message ?? '업로드 실패'))
        return
      }
      reject(new ApiError(xhr.status, 'HTTP_ERROR', `${xhr.status} ${xhr.statusText}`))
    })

    xhr.addEventListener('error', () => {
      reject(new ApiError(0, 'NETWORK_ERROR', '서버에 연결하지 못했어요'))
    })
    xhr.addEventListener('abort', () => {
      reject(new ApiError(0, 'ABORTED', '업로드를 취소했어요'))
    })

    xhr.send(form)
  })
}
