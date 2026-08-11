import { onMounted, onUnmounted, ref } from 'vue'

export function useDesignScale(designWidth: number) {
  const scale = ref(1)

  function updateScale() {
    scale.value = window.innerWidth / designWidth
  }

  onMounted(() => {
    updateScale()
    window.addEventListener('resize', updateScale)
  })
  onUnmounted(() => {
    window.removeEventListener('resize', updateScale)
  })

  return scale
}
