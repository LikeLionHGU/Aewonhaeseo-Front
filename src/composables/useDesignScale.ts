import { onMounted, onUnmounted, ref } from 'vue'

// 창 가장자리와 논리 영역 사이 여백.
const SIDE_MARGIN = 0
// 디자인보다 크게 확대하지 않는다. 예전에는 화면 폭을 그대로 나눠서 넓은
// 모니터에서 1.3배씩 확대돼 글자와 버튼이 부담스럽게 커졌다.
const MAX_SCALE = 1
// 본문 좌우 여백을 이만큼 더 벌린다. 디자인 캔버스는 이미 안쪽 50px 을 갖고
// 있어서 100 을 더하면 총 150px 이 된다.
//
// 콘텐츠를 안쪽으로 옮기는 대신 논리 영역을 (designWidth + 2×EXTRA_GUTTER) 로
// 넓히고 그 안에서 캔버스를 오른쪽으로 민다. 그래야 절대좌표로 박힌 요소를
// 하나도 건드리지 않고 여백만 늘릴 수 있다. 창 끝까지 닿아야 하는 요소(푸터,
// 랜딩의 배경 띠)는 left: -100px / width: 2120px 로 이 여백을 넘어 뻗는다.
const EXTRA_GUTTER = 100

/**
 * 고정 폭 디자인 캔버스를 화면에 맞춰 축소하고 가로 가운데로 놓는다.
 * transform-origin 이 top left 라서 가운데 정렬은 offsetX 로 직접 민다.
 */
export function useDesignScale(designWidth: number) {
  const scale = ref(1)
  const offsetX = ref(0)

  function update() {
    const total = designWidth + EXTRA_GUTTER * 2
    const available = Math.max(0, window.innerWidth - SIDE_MARGIN * 2)
    scale.value = Math.max(0.1, Math.min(MAX_SCALE, available / total))
    offsetX.value =
      (window.innerWidth - total * scale.value) / 2 + EXTRA_GUTTER * scale.value
  }

  onMounted(() => {
    update()
    window.addEventListener('resize', update)
  })
  onUnmounted(() => {
    window.removeEventListener('resize', update)
  })

  return { scale, offsetX }
}
