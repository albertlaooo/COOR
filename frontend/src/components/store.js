import { reactive, watch } from 'vue'

export const store = reactive({
  sectionId: '', // initially empty
  exportDone: false     // PDF completion
})

watch(
  () => store.sectionId,
  (newVal, oldVal) => {
    console.log(`store.sectionId changed: ${oldVal} → ${newVal}`)
  }
)

watch(
  () => store.exportDone,
  (newVal) => {
    console.log('PDF export done flag:', newVal)
  }
)
