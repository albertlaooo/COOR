import { reactive, watch } from 'vue'

export const store = reactive({
  sectionId: '', // Individual
  byCourseOrAll: '',
  bulkSectionId: [], // All

  teacherId: '', // Individual
  bulkTeacherId: [], // All

  exportDone: false     // PDF completion
})

watch(
  () => store.sectionId,
  (newVal, oldVal) => {
    console.log(`store.sectionId changed: ${oldVal} → ${newVal}`)
  }
)

watch(
  () => store.byCourseOrAll,
  (newVal, oldVal) => {
    console.log(`store.sectionOrAll changed: ${oldVal} → ${newVal}`)
  }
)

watch(
  () => store.bulkSectionId,
  (newVal) => {
    console.log('Is section all export array updated:', newVal)
  },
  { deep: true } // Watch inside array changes too (e.g., push, splice)
)


watch(
  () => store.teacherId,
  (newVal, oldVal) => {
    console.log(`store.teacherId changed: ${oldVal} → ${newVal}`)
  }
)

watch(
  () => store.bulkTeacherId,
  (newVal) => {
    console.log('Is teacher all export array updated:', newVal)
  },
  { deep: true } // Watch inside array changes too (e.g., push, splice)
)


watch(
  () => store.exportDone,
  (newVal) => {
    console.log('PDF export done flag:', newVal)
  }
)
