import { onMounted, onUnmounted, ref } from 'vue'
import type { Ref } from 'vue'

/**
 * 고정 폭 캔버스의 실제 높이를 잰다.
 *
 * Figma 에서 내보낸 화면들은 요소마다 좌표가 박혀 있어 전체 높이를 상수(DESIGN_HEIGHT)
 * 로 둘 수 있었다. 대신 내용이 한 줄 늘 때마다 아래 요소를 전부 밀어 주는 계산이
 * 따라붙는다 — 근거 화면의 sqlShift·mappingShift·rawShift 가 그것이다.
 *
 * 손으로 쓰는 화면은 그 상수를 유지할 수 없고 유지할 이유도 없다. 캔버스는 1920 폭
 * 그대로 두고 안쪽만 보통 흐름으로 쌓은 뒤, 높이를 재서 useDesignScale 의 배율과
 * 곱한다. 폰트가 늦게 오거나 창이 바뀌면 높이가 달라지므로 한 번 재고 끝내지 않는다.
 */
export function useCanvasHeight(target: Ref<HTMLElement | null>) {
  const height = ref(0)
  let observer: ResizeObserver | null = null

  onMounted(() => {
    const el = target.value
    if (!el) return
    // transform: scale() 은 offsetHeight 에 영향을 주지 않는다 — 배율 이전의
    // 논리 높이가 나오므로 그대로 쓸 수 있다.
    height.value = el.offsetHeight
    observer = new ResizeObserver(() => {
      height.value = target.value?.offsetHeight ?? 0
    })
    observer.observe(el)
  })

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
  })

  return height
}
