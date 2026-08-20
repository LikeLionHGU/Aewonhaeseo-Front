// 화면에서 부르는 엔드포인트 모음.
// 경로와 파라미터 이름은 2026-08-17 에 실제 서버로 확인한 것과 같다.

import { del, get, post, query, upload } from './client'
import type {
  AnalysisDetail,
  CreateOrganizationRequest,
  IssueKeyRequest,
  OpenApiIssued,
  OpenApiKey,
  OpenApiOrganization,
  SelfIssueKeyRequest,
  AuthUser,
  AnalysisMeasurement,
  AnalysisHistoryItem,
  AnalysisOptions,
  AnalysisRequest,
  AnalysisResult,
  Bucket,
  FileItem,
  FilePreview,
  FileStatus,
  IngestResult,
  MappingResult,
  MappingRounds,
  Page,
  ReviewItem,
  LoginRequest,
  RegisterRequest,
  StandardSets,
  TermList,
  VerdictRequest,
} from './types'

export * from './types'
export { ApiError } from './client'

const V1 = '/api/v1'

// --- 인증 ---
//
// 경로는 2026-08-19 에 실제 서버로 확인했다. 회원가입은 /auth/signup 이 아니라
// /auth/register 다(/signup 은 404). 성공하면 서버가 AWON_ACCESS_TOKEN 쿠키를
// 심어 주고 본문으로 사용자를 돌려준다 — 토큰은 본문에 없다.

export function login(body: LoginRequest) {
  return post<AuthUser>(`${V1}/auth/login`, body)
}

/** 가입과 동시에 로그인된다 — 로그인과 똑같이 쿠키가 발급된다. */
export function register(body: RegisterRequest) {
  return post<AuthUser>(`${V1}/auth/register`, body)
}

/** 지금 쿠키의 주인. 로그인 안 했으면 401 AUTH_REQUIRED. */
export function getMe() {
  return get<AuthUser>(`${V1}/auth/me`)
}

/**
 * 쿠키를 지운다.
 *
 * 서버가 토큰을 무효화하지는 않는다(stateless). 이미 나간 토큰은 남은 8시간
 * 동안 그대로 유효하다.
 */
export function logout() {
  return post<{ logged_out: boolean }>(`${V1}/auth/logout`)
}

// --- 파일 ---

export function listFiles(params: {
  status?: FileStatus
  page?: number
  size?: number
} = {}) {
  return get<Page<FileItem>>(`${V1}/files${query(params)}`)
}

export function getFile(id: number) {
  return get<FileItem>(`${V1}/files/${id}`)
}

export function getFilePreview(id: number) {
  return get<FilePreview>(`${V1}/files/${id}/preview`)
}

/** multipart/form-data 로 보낸다. 성공 시 201 과 함께 생성된 파일이 온다. */
export function uploadFile(file: File, onProgress?: (ratio: number) => void) {
  return upload<FileItem>(`${V1}/files`, file, onProgress)
}

// --- 매핑 ---

/** 매핑을 새 라운드로 실행한다. 검수 판정이 있으면 via: review 로 반영된다. */
export function runMapping(fileId: number) {
  return post<MappingResult>(`${V1}/files/${fileId}/mapping`)
}

export function getMapping(fileId: number) {
  return get<MappingResult>(`${V1}/files/${fileId}/mapping`)
}

export function getMappingRounds(fileId: number) {
  return get<MappingRounds>(`${V1}/files/${fileId}/mapping/summary`)
}

// --- 적재 ---

/** 매핑 결과를 측정값 테이블로 적재한다. 멱등하다 — 다시 부르면 교체된다. */
export function ingestFile(fileId: number) {
  return post<IngestResult>(`${V1}/files/${fileId}/ingest`)
}

// --- 검수 ---

export function listReviews(params: {
  file_id?: number
  status?: string
  page?: number
  size?: number
} = {}) {
  return get<Page<ReviewItem>>(`${V1}/reviews${query(params)}`)
}

/**
 * 검수 판정을 남긴다.
 *
 * verdict 는 사전에 있는 표준 용어 코드이거나 'no_match' 여야 한다. 그 외 값은
 * 422 VERDICT_CODE_UNKNOWN 이 온다. 판정 후 매핑을 다시 돌리면 via: review 로
 * 붙고, no_match 는 unmapped 로 확정돼 검수 대기에서 빠진다.
 */
export function decideReview(id: number, body: VerdictRequest) {
  return post<ReviewItem>(`${V1}/reviews/${id}/verdict`, body)
}

// --- 기준치 ---

export function getStandardSets() {
  return get<StandardSets>(`${V1}/standards`)
}

// --- 분석 ---

export function runAnalysis(body: AnalysisRequest) {
  return post<AnalysisResult>(`${V1}/analyses`, body)
}

export function listAnalyses(params: { page?: number; size?: number } = {}) {
  return get<Page<AnalysisHistoryItem>>(`${V1}/analyses${query(params)}`)
}

/** 저장된 분석. 집계 결과(series·limits)까지 함께 온다. */
export function getAnalysis(executionId: string) {
  return get<AnalysisDetail>(`${V1}/analyses/${executionId}`)
}

export function getAnalysisOptions() {
  return get<AnalysisOptions>(`${V1}/analyses/options`)
}

/**
 * 실행 조건을 객체로 꺼낸다.
 *
 * 목록은 JSON 문자열, 상세는 이미 객체로 준다. 어느 쪽이 와도 같은 결과를 낸다.
 */
export function parseConditions(item: { conditions: string | AnalysisRequest }) {
  const raw = item.conditions
  if (raw && typeof raw === 'object') return raw as AnalysisRequest & { bucket?: Bucket }
  try {
    return JSON.parse(String(raw)) as AnalysisRequest & { bucket?: Bucket }
  } catch {
    return {} as AnalysisRequest
  }
}

// --- 분석에 쓰인 원본 측정 행 ---

/** 이 분석이 실제로 집계한 측정값. 원본 파일·행·컬럼까지 알려준다. */
export function getAnalysisMeasurements(
  executionId: string,
  params: { page?: number; size?: number } = {},
) {
  return get<Page<AnalysisMeasurement>>(
    `${V1}/analyses/${executionId}/measurements${query(params)}`,
  )
}

// --- 사전 ---

/** 표준 용어 검색. query 는 코드와 이름 양쪽에 걸린다. */
export function listTerms(params: { query?: string; dict_type?: string } = {}) {
  return get<TermList>(`${V1}/dictionary/terms${query(params)}`)
}

// --- Open API 키 발급 (관리자) ---
//
// 네 경로 모두 ADMIN 만 부를 수 있다 — 일반 계정은 403 ACCESS_DENIED 다
// (2026-08-21 확인). 화면은 그 403 을 잡아 "관리자 계정이 필요하다" 고 알려야 한다.

export function listOpenApiOrganizations() {
  return get<OpenApiOrganization[]>(`${V1}/admin/open-api/organizations`)
}

/** 기업을 만들면서 첫 키까지 함께 발급한다. */
export function createOpenApiOrganization(body: CreateOrganizationRequest) {
  return post<OpenApiIssued>(`${V1}/admin/open-api/organizations`, body)
}

export function listOpenApiKeys(orgId: number) {
  return get<OpenApiKey[]>(`${V1}/admin/open-api/organizations/${orgId}/keys`)
}

/** 이미 있는 기업에 키를 하나 더 발급한다. */
export function issueOpenApiKey(orgId: number, body: IssueKeyRequest) {
  return post<OpenApiIssued>(`${V1}/admin/open-api/organizations/${orgId}/keys`, body)
}

/** 키를 폐기한다. 204 라 본문이 없다. */
export function revokeOpenApiKey(orgId: number, keyId: number) {
  return del<void>(`${V1}/admin/open-api/organizations/${orgId}/keys/${keyId}`)
}

// --- Open API 키 발급 (기업 담당자 본인) ---
//
// 아직 서버에 없다 — 2026-08-21 확인 시 POST /api/v1/open-api/keys 는
// 404 RESOURCE_NOT_FOUND 다. 관리자가 대신 발급하는 흐름은 담당자 입장에서 끊기므로
// 이 경로를 요청해 두었다(docs/백엔드-요청_담당자-직접-발급.md). 화면은 404 를 잡아
// "서버에 경로가 없다" 고 알려 주고, 경로가 생기면 고칠 것 없이 그대로 동작한다.

export function selfIssueOpenApiKey(body: SelfIssueKeyRequest) {
  return post<OpenApiIssued>(`${V1}/open-api/keys`, body)
}

/** 로그인한 사람이 발급받은 키. 원문은 오지 않고 prefix 만 온다. */
export function listMyOpenApiKeys() {
  return get<OpenApiKey[]>(`${V1}/open-api/keys`)
}

export function revokeMyOpenApiKey(keyId: number) {
  return del<void>(`${V1}/open-api/keys/${keyId}`)
}
