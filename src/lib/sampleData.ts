import { ApiError, listFiles } from '../api'

/**
 * 체험용 샘플 CSV.
 *
 * 시작 화면과 업로드 화면이 같은 파일을 쓴다. 이름을 두 곳에 적어 두면 한쪽만
 * 바뀌었을 때 같은 데이터가 서로 다른 파일로 올라가고, 적재는 파일 단위로만
 * 멱등해서 같은 달에 값이 두 개가 된다 — 평균이 흐려지고 초과 판정까지 달라진다.
 * 그래서 이름과 찾는 방법을 여기 한 곳에 둔다.
 *
 * 이 이름은 바꾸지 말 것(2026-08-20 실제 서버 확인). 파일 삭제 API 가 없어
 * 잘못 올라간 것을 되돌릴 수 없다.
 */
export const SAMPLE_FILENAME = '샘플-수질측정자료.csv'

/** public/sample 에 들어 있다. 하위 경로 배포에서도 맞도록 BASE_URL 을 쓴다. */
const SAMPLE_URL = `${import.meta.env.BASE_URL}sample/water-quality-sample.csv`

export async function fetchSampleFile() {
  const res = await fetch(SAMPLE_URL)
  if (!res.ok) throw new ApiError(res.status, 'SAMPLE_MISSING', '샘플 파일을 찾지 못했어요')
  return new File([await res.blob()], SAMPLE_FILENAME, { type: 'text/csv' })
}

/**
 * 이미 올라와 있는 샘플 파일. 있으면 다시 올리지 않고 그 파일로 이어서 한다.
 *
 * 같은 이름이 여러 벌 있을 수 있어(예전에 올려 둔 계정) 가장 최근 것을 고른다 —
 * 먼저 찾은 것을 쓰면 목록 순서에 따라 옛 데이터로 되돌아간다.
 */
export async function findUploadedSample() {
  const page = await listFiles({ size: 50 })
  return (
    page.items
      .filter((item) => item.filename === SAMPLE_FILENAME)
      // 값이 빠져 오면 localeCompare 가 터진다. 빈 문자열로 받는다.
      .sort((a, b) => (b.uploaded_at ?? '').localeCompare(a.uploaded_at ?? ''))[0] ?? null
  )
}
