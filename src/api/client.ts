// 백엔드 호출의 공통 부분 — 주소 조립, 쿼리 인코딩, 에러 변환.

// 기본값을 빈 문자열로 두면 같은 출처로 요청이 나가고, 개발 중에는
// vite.config.ts 의 프록시가 /api 를 백엔드로 넘긴다. 백엔드에 CORS 가
// 설정돼 있지 않아서(2026-08-16 확인) 브라우저에서 직접 부르면 전부 막힌다.
// 배포 환경에서 출처가 갈리면 VITE_API_BASE 로 덮어쓴다.
const BASE = import.meta.env.VITE_API_BASE ?? ''

/** 서버가 {"error":{"code","message"}} 로 내려주는 실패 응답. */
export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
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
    const detail = (body as { error: { code?: string; message?: string } }).error
    return new ApiError(
      res.status,
      detail.code ?? 'UNKNOWN',
      detail.message ?? res.statusText,
    )
  }
  return new ApiError(res.status, 'HTTP_ERROR', `${res.status} ${res.statusText}`)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)

  // 먼저 문자열로 받는다. 본문이 비어 있거나 HTML 일 때 JSON 파싱이
  // 터지면서 진짜 상태 코드를 가려버리는 걸 막는다.
  const text = await res.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  if (!res.ok) throw await toError(res, body)
  return body as T
}

export function get<T>(path: string) {
  return request<T>(path)
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
