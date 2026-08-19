// 백엔드 응답 타입.
//
// 필드는 전부 snake_case 다. 스펙(/v3/api-docs)도 2026-08-17 부터 같은 표기로
// 맞춰졌으므로 이제 스펙에서 타입을 생성해도 어긋나지 않는다. 이 파일은 실제
// 응답을 찍어 확인한 내용이라 생성기를 도입하기 전까지 손으로 유지한다.

export type FileStatus =
  | 'uploaded'
  | 'mapping'
  | 'mapped'
  | 'reviewing'
  | 'completed'
  | 'failed'

export interface FileItem {
  id: number
  filename: string
  size_bytes: number
  content_type: string
  status: FileStatus
  uploaded_at: string
  encoding_detected?: string
  header_row?: number
  column_count?: number
  pending_review_count?: number
  /** 이 파일 측정값의 기간. 날짜 컬럼이 매핑되기 전에는 null 이다. */
  measured_from?: string | null
  measured_to?: string | null
  dictionary_version?: string
  auto_mapped_rate?: number
}

export interface Page<T> {
  items: T[]
  page: number
  size: number
  total: number
}

export interface FilePreview {
  header_row: number
  encoding_detected: string
  total_rows: number
  columns: string[]
  /** 헤더를 제외한 본문. 값은 전부 문자열로 내려온다. */
  rows: string[][]
}

// --- 매핑 ---

/** exact·fuzzy_auto 는 자동 확정, needs_review 는 검수 대기, unmapped 는 매칭 실패. */
export type ColumnStatus = 'exact' | 'fuzzy_auto' | 'needs_review' | 'unmapped'

export interface MappedColumn {
  raw: string
  normalized: string
  status: ColumnStatus
  output_column: string
  via?: string
  /** 확정된 표준 용어 코드. needs_review·unmapped 면 없다. */
  code?: string
  /** 검수 대기 상태에서 제안된 후보 코드. */
  candidate_code?: string
  site?: string
  matched_variant?: string
  score?: number
  dict_type?: string
}

export interface MappingSummary {
  total_columns: number
  auto_mapped: number
  needs_review: number
  unmapped: number
  auto_mapped_rate: number
  needs_review_rate: number
  unmapped_rate: number
}

export interface MappingResult {
  file_id: number
  round_no: number
  header_row: number
  dictionary_version: string
  summary: MappingSummary
  columns: MappedColumn[]
}

export interface MappingRound {
  round: number
  dictionary_version: string
  auto_mapped_rate: number
  ran_at: string
}

export interface MappingRounds {
  file_id: number
  rounds: MappingRound[]
  /** 직전 라운드 대비 자동매핑률 증감. */
  delta: number
}

// --- 적재 ---

export interface IngestResult {
  file_id: number
  mapping_run_id: number
  dictionary_version: string
  source_rows: number
  measured_columns: number
  inserted_values: number
  skipped_values: number
  flagged_values: number
}

// --- 검수 ---

/**
 * 검수 판정.
 *
 * 사전에 있는 표준 용어 코드, 또는 어디에도 해당하지 않을 때 쓰는 예약어
 * 'no_match' 를 보낸다. 그 외 값은 422 VERDICT_CODE_UNKNOWN 으로 거절된다.
 */
export type Verdict = string

export interface ReviewValueSummary {
  samples: string[]
  row_count: number
  all_unique: boolean
  distinct_count: number
}

export interface ReviewItem {
  id: number
  file_id: number
  raw: string
  mapping_status: ColumnStatus
  score: number
  value_summary: ReviewValueSummary
  candidate_code?: string
  candidate_name?: string
  verdict?: Verdict
  reviewed_by?: string
  reviewed_at?: string
  /**
   * 판정이 표준 사전 자체에 등록됐는지.
   *
   * 판정은 그 파일의 매핑에는 바로 반영되지만(다시 매핑하면 via: review 로 붙는다)
   * 사전에는 등록되지 않아 이 값은 false 로 온다. 다른 파일에 같은 컬럼명이
   * 나오면 다시 확인해야 한다(2026-08-17 확인).
   */
  applied_to_dictionary: boolean
}

export interface VerdictRequest {
  /** 표준 용어 코드('MD-011') 또는 매칭 없음을 뜻하는 'no_match'. */
  verdict: string
  note?: string
  reviewed_by?: string
}

// --- 측정값 통계 ---

export interface MeasurementByItem {
  item_code: string
  n: number
  avg_value: number
  min_value: number
  max_value: number
}

export interface MeasurementSummary {
  totals: {
    total_values: number
    distinct_items: number
    distinct_sites: number
  }
  by_item: MeasurementByItem[]
  exceeded: unknown[]
}

// --- 기준치 ---

export interface StandardSet {
  standard_set: string
  item_count: number
  distinct_items: number
  legal_basis: string
  source: string
}

/** 폐수배출규모. 지정하지 않으면 규모별 기준선이 그려지지 않는다. */
export interface StandardScale {
  label: string
  value: 'large' | 'small'
}

export interface StandardSets {
  sets: StandardSet[]
  region_grades: string[]
  scales: StandardScale[]
  /** 아직 사람이 검증하지 않은 기준치 행 수. */
  unverified_count: number
}

export interface StandardLimit {
  item_code: string
  region_grade: string
  /** 하한. pH 처럼 범위로 규정된 항목에만 있다. */
  limit_min?: number
  limit_max: number
  unit?: string
  legal_basis: string
  legal_article: string
  source: string
  /** 이 기준이 걸리는 배출규모. 규모와 무관한 항목은 null 이다. */
  scale?: 'large' | 'small' | null
}

export interface ExceedanceItem {
  site_name: string
  outlet: string
  measured_on: string
  item_code: string
  value_num: number
  limit_min?: number
  limit_max: number
  limit_source: string
  verdict: string
}

export interface Exceedances {
  standard_set: string
  region_grade: string
  exceeded_count: number
  limit_mismatch_count: number
  items: ExceedanceItem[]
}

// --- 분석 ---

export type Bucket = 'month' | 'quarter' | 'year' | 'none'
export type Metric = 'avg' | 'max' | 'min' | 'count'

export interface AnalysisRequest {
  site_names?: string[]
  outlets?: string[]
  item_codes?: string[]
  sample_type?: string
  /** YYYY-MM-DD */
  from?: string
  to?: string
  bucket?: Bucket
  metric?: Metric
  standard_set?: string
  region_grade?: string
  /** 폐수배출규모. 이걸 줘야 규모별 기준선이 적용된다. */
  scale?: 'large' | 'small'
}

export interface AnalysisPoint {
  bucket: string
  item_code: string
  value: number
  n: number
  missing: number
  unit?: string
}

export interface AnalysisLimit {
  item_code: string
  /** 하한. 값이 이보다 낮아도 기준 위반이다. */
  limit_min?: number
  limit_max: number
  unit?: string
  source: string
  legal_basis: string
}

export interface AnalysisMeta {
  execution_id: string
  dictionary_version: string
  ruleset_version: string
  row_count: number
  elapsed_ms: number
  truncated: boolean
  /** 근거 화면에 그대로 보여줄 수 있는 실행 SQL. */
  generated_sql: string
}

export interface AnalysisResult {
  execution_id: string
  /** 서버가 비워둔 조건을 어떻게 채웠는지 알려주는 문장들. */
  assumptions: string[]
  series: AnalysisPoint[]
  limits: AnalysisLimit[]
  exceeded_count: number
  meta: AnalysisMeta
}

export interface AnalysisHistoryItem {
  execution_id: string
  /**
   * 실행 조건. 목록·상세 모두 객체로 온다(2026-08-17 통일됨).
   * 예전 문자열 응답도 parseConditions() 가 그대로 받아준다.
   */
  conditions: string | AnalysisRequest
  dictionary_version: string
  ruleset_version: string
  standard_set: string
  region_grade: string
  row_count: number
  exceeded_count: number
  elapsed_ms: number
  /** 결과가 5000행에서 잘렸는지. */
  truncated: boolean
  ran_at: string
}

/** 저장된 분석 한 건. 2026-08-17 부터 집계 결과까지 함께 온다. */
export interface AnalysisDetail extends AnalysisHistoryItem {
  generated_sql: string
  assumptions: string[]
  series: AnalysisPoint[]
  limits: AnalysisLimit[]
}

export interface AnalysisOptions {
  items: { item_code: string; n: number }[]
  buckets: Bucket[]
  metrics: Metric[]
  sites: string[]
  outlets: string[]
  sample_types: string[]
  scales: StandardScale[]
  period: { first_date?: string; last_date?: string }
}

// --- 사전 ---

export interface DictionaryVersion {
  version: string
  content_hash: string
  generated_at: string
  counts: {
    measurement_terms: number
    metadata_terms: number
    synonyms: number
    verified_terms: number
  }
  excluded_inferred: boolean
  stale: boolean
}

// --- 용어 사전 ---

export interface DictionaryTerm {
  code: string
  name: string
  dict_type: string
}

export interface TermList {
  items: DictionaryTerm[]
  total: number
}

// --- 분석에 쓰인 원본 측정 행 ---

export interface AnalysisMeasurement {
  measurement_id: number
  file_id: number
  filename: string
  /** 원본 파일에서 몇 번째 행·어느 컬럼에서 왔는지. */
  source_row: number
  source_column: string
  source_column_index: number
  site_name: string
  outlet: string
  measured_on: string
  item_code: string
  value_num: number
  value_text: string
  is_numeric: boolean
}

// --- 인증 ---

/**
 * 로그인·회원가입·/auth/me 가 똑같이 돌려주는 사용자.
 *
 * 응답 본문에 토큰은 없다. 서버가 AWON_ACCESS_TOKEN 쿠키(HttpOnly, 8시간)로
 * 내려주고 이후 요청에 브라우저가 자동으로 실어 보낸다.
 */
export interface AuthUser {
  id: number
  email: string
  display_name: string
  /** 확인된 값은 'ADMIN'. 일반 사용자 값은 아직 못 봐서 좁히지 않는다. */
  role: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  /** 8~72자. 서버가 VALIDATION_FAILED 로 걸러낸다. */
  password: string
  display_name: string
}
