// 화면에서 부르는 엔드포인트 모음.
// 경로와 파라미터 이름은 2026-08-17 에 실제 서버로 확인한 것과 같다.

import { get, post, query, upload } from './client'
import type {
  AnalysisDetail,
  AnalysisMeasurement,
  AnalysisHistoryItem,
  AnalysisOptions,
  AnalysisRequest,
  AnalysisResult,
  Bucket,
  DictionaryVersion,
  Exceedances,
  FileItem,
  FilePreview,
  FileStatus,
  IngestResult,
  MappingResult,
  MappingRounds,
  MeasurementSummary,
  Page,
  ReviewItem,
  StandardLimit,
  StandardSets,
  TermList,
  VerdictRequest,
} from './types'

export * from './types'
export { ApiError } from './client'

const V1 = '/api/v1'

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

/** 컬럼명 하나를 넣어보고 어떤 용어로 붙을지 미리 본다. */
export function previewColumn(name: string) {
  return post<Record<string, unknown>>(`${V1}/mapping/preview`, { name })
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

// --- 측정값 통계 ---

export function getMeasurementSummary(fileId?: number) {
  return get<MeasurementSummary>(`${V1}/measurements/summary${query({ file_id: fileId })}`)
}

// --- 기준치 ---

export function getStandardSets() {
  return get<StandardSets>(`${V1}/standards`)
}

/**
 * 기준치 표.
 *
 * scale 은 필수다 — BOD·COD·부유물질처럼 배출규모에 따라 기준이 갈리는 항목이
 * 있어서, 규모를 정하지 않으면 서버가 400 을 낸다(2026-08-17 확인).
 * 규모와 무관한 항목(총질소·총인·수소이온농도)은 scale 이 null 로 온다.
 */
export function getStandardLimits(params: {
  scale: 'large' | 'small'
  standard_set?: string
  region_grade?: string
  item_code?: string
}) {
  return get<StandardLimit[]>(`${V1}/standards/limits${query(params)}`)
}

export function getExceedances(params: {
  standard_set?: string
  region_grade?: string
  file_id?: number
} = {}) {
  return get<Exceedances>(`${V1}/standards/exceedances${query(params)}`)
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

export function getDictionaryVersion() {
  return get<DictionaryVersion>(`${V1}/dictionary/version`)
}

export function reloadDictionary() {
  return post<unknown>(`${V1}/admin/reload-dictionary`)
}
