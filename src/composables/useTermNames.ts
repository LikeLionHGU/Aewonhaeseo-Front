import { ref } from 'vue'
import { listTerms } from '../api'

/**
 * 용어 코드를 우리말 이름으로 바꿔준다.
 *
 * 서버는 분석 결과·조건·근거 어디서든 항목을 WQ-001 같은 코드로만 준다.
 * 사전 전체가 130여 개라 한 번 받아서 캐시해두고 화면 전체가 함께 쓴다.
 */
const names = ref<Map<string, string>>(new Map())
let loading: Promise<void> | null = null

async function fetchOnce() {
  if (names.value.size) return
  const list = await listTerms()
  const next = new Map<string, string>()
  for (const term of list.items) next.set(term.code, term.name)
  names.value = next
}

export function useTermNames() {
  /** 사전을 아직 안 받았으면 받는다. 여러 화면이 동시에 불러도 요청은 한 번이다. */
  function loadTerms() {
    if (!loading) {
      loading = fetchOnce().catch(() => {
        // 이름을 못 받아도 화면은 코드로 동작해야 한다.
        loading = null
      })
    }
    return loading
  }

  /** 이름을 모르면 코드를 그대로 돌려준다. */
  function termName(code?: string) {
    if (!code) return ''
    return names.value.get(code) ?? code
  }

  /** '생물화학적산소요구량 (WQ-001)' — 코드까지 같이 보여줘야 하는 자리용. */
  function termLabel(code?: string) {
    if (!code) return ''
    const name = names.value.get(code)
    return name ? `${name} (${code})` : code
  }

  return { loadTerms, termName, termLabel }
}
