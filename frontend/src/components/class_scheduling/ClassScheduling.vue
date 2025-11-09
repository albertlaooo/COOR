<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from "axios"
import { store } from '../store.js'

//#region 🧱 REFS & STATE
const schedules = ref([])
const sections = ref([])
const teachersDB = ref([])
const nullSectionIds = ref([])

const isVisibleExportToPDFModal = ref(false)
const isVisibleChooseCourse = ref(false)
const isVisibleChooseSection = ref(false)
const isVisibleChooseTeacher = ref(false)

const exportScheduleBy = ref('')
const exportType = ref('')
const isExporting = ref(false)

const showErrorInput = ref(false)

// Choose Course
const chooseCourse = ref('')
const isChooseCourseOk = ref(false)
const chooseCourseWrapper = ref()
const chooseCourseInputFocused = ref(false)

// Choose Section
const chooseSection = ref('')
const isChooseSectionOk = ref(false)
const chooseSectionWrapper = ref()
const chooseSectionInputFocused = ref(false)

// Choose teacher
const chooseTeacher = ref('')
const isChooseTeacherOk = ref(false)
const chooseTeacherWrapper = ref()
const chooseTeacherInputFocused = ref(false)

//#endregion

//#region 📘 FETCH SECTIONS
const fetchSections = async () => {
    try {
        const res = await axios.get("http://localhost:3000/sections")
        sections.value = res.data

        console.log(sections.value)
    } catch (err) {
        console.error("Error fetching sections:", err)
    }
}

const schedulesNullCheck = async () => {
  try {
    // Fetch all schedules
    const response = await axios.get('http://localhost:3000/get-all-schedules')
    schedules.value = response.data

    // Find schedules with null subject, room, or teacher
    const nullSchedules = schedules.value.filter(sch =>
      sch.subject_id === null ||
      sch.room_id === null ||
      sch.teacher_id === null
    )

    // Log which section has null fields
    nullSchedules.forEach(sch => {
      const nullFields = []
      if (sch.subject_id === null) nullFields.push('subject')
      if (sch.room_id === null) nullFields.push('room')
      if (sch.teacher_id === null) nullFields.push('teacher')
      console.log(`Section ${sch.section_id} has null fields: ${nullFields.join(', ')}`)
    })

    // Get unique section IDs from null schedules
    nullSectionIds.value = [...new Set(nullSchedules.map(sch => sch.section_id))]

    // Mark sections with null schedules as "Partially Set" temporarily
    if (nullSectionIds.value.length > 0) {
      for (const sectionId of nullSectionIds.value) {
        await updateScheduleStatus(sectionId, "Partially Set")
      }
    }

    // -------------------- Count assigned and required subjects per section --------------------
    const sectionSubjectCounts = {} // { section_id: { assigned: X, required: Y } }

    const allSections = await getSections() // fetch all sections

    for (const section of allSections) {
      const sectionId = section.section_id

      // All schedules for this section
      const sectionSchedules = schedules.value.filter(sch => sch.section_id === sectionId)

      // Count only fully assigned schedules
      const assignedCount = sectionSchedules.filter(sch =>
        sch.subject_id !== null &&
        sch.room_id !== null &&
        sch.teacher_id !== null
      ).length

      // Count required subjects for this section
      const courseSubjects = await getRequiredSubjectsForSection(sectionId)

      let requiredCount = 0
      courseSubjects.forEach(sub => {
        const hasLecture = sub.lecture && sub.lecture > 0
        const hasLab = sub.laboratory && sub.laboratory > 0

        if (hasLecture && hasLab) requiredCount += 2
        else if (hasLecture || hasLab) requiredCount += 1
      })

      sectionSubjectCounts[sectionId] = { assigned: assignedCount, required: requiredCount }

      // -------------------- Update schedule status --------------------
      if (sectionSchedules.length === 0) {
        // No schedules at all
        await updateScheduleStatus(sectionId, "Unset")
      } else if (assignedCount < requiredCount) {
        // Some schedules exist but not fully assigned
        await updateScheduleStatus(sectionId, "Partially Set")
      } else if (assignedCount === requiredCount) {
        // Fully assigned schedules
        await updateScheduleStatus(sectionId, "Complete")
      }
    }

  } catch (error) {
    console.error('Error fetching schedules:', error)
    console.log('Failed to load schedules.')
  }
}


// Helper: fetch all sections
const getSections = async () => {
  const res = await axios.get('http://localhost:3000/sections')
  return res.data
}

// Helper: fetch all required subjects for a section
const getRequiredSubjectsForSection = async (sectionId) => {
  const res = await axios.get(`http://localhost:3000/sections/${sectionId}/subjects-required`)
  return res.data // includes subject_id, subject_name, lecture, laboratory
}

// Update schedule status (PUT request)
const updateScheduleStatus = async (sectionId, status) => {
  try {
    const res = await axios.put(
      `http://localhost:3000/update-schedule-status/${sectionId}`,
      { schedule_status: status }
    )
  } catch (err) {
    console.error(`❌ Error updating schedule status for section ${sectionId}:`, err)
    alert("Error saving data for section " + sectionId)
  }
}

const fetchTeachersWithLatestSchedule = async () => {
  try {
    const res = await axios.get("http://localhost:3000/teachers/latest-schedule")

    const data = res.data
    const teachers = data.teachers || []

    teachersDB.value = teachers.map(teacher => ({
      teacher_id: teacher.teacher_id,
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      departments: teacher.departments,
      subjects: teacher.subjects,
      availability: teacher.availability
    }))

    console.log('Latest:', data.latest_semester, data.latest_academic_year)
  } catch (err) {
    console.error("Error fetching latest-schedule teachers:", err)
  }
}

// Group sections by "A.Y. YEAR – Semester"
const groupedSections = computed(() => {
    const groups = {}
    const semesterMap = { 1: "1st Semester", 2: "2nd Semester" }

    sections.value.forEach(sec => {
        const semesterText = semesterMap[sec.semester] || sec.semester
        const key = `A.Y. ${sec.academic_year} – ${semesterText}`
        if (!groups[key]) groups[key] = []
        groups[key].push(sec)
    })

    // Sort groups (latest A.Y. first, 2nd semester before 1st)
    const sortedKeys = Object.keys(groups).sort((a, b) => {
        const extract = str => str.match(/A\.Y\. (\d{4})-(\d{4}) – (.*)/)?.slice(1)
        const [aYearStart,, aSem] = extract(a)
        const [bYearStart,, bSem] = extract(b)

        if (bYearStart !== aYearStart) return bYearStart - aYearStart

        const semOrder = { "1st Semester": 1, "2nd Semester": 2 }
        return semOrder[bSem] - semOrder[aSem]
    })

    const sortedGroups = {}
    sortedKeys.forEach(key => {
        sortedGroups[key] = groups[key]
    })

    return sortedGroups
})

// Compute latest A.Y. and semester (For choose section input)
const completedSectionsLatest = computed(() => {
  if (!sections.value.length) return []

  // Filter only completed sections
  const completedSections = sections.value.filter(sec => sec.schedule_status === 'Complete')
  if (!completedSections.length) return []

  // Sort by academic year (desc) then semester (desc)
  const sorted = [...completedSections].sort((a, b) => {
    const yearA = parseInt(a.academic_year.split('-')[0])
    const yearB = parseInt(b.academic_year.split('-')[0])
    if (yearB !== yearA) return yearB - yearA
    return b.semester - a.semester
  })

  // Get the latest combination of academic_year and semester
  const latestAY = sorted[0].academic_year
  const latestSem = sorted[0].semester

  // Filter only sections that match that latest combination
  return sorted.filter(sec => 
    sec.academic_year === latestAY && sec.semester === latestSem
  )
})

// Filtered sections for search input
const filteredCompletedSections = computed(() => {
  const search = chooseSection.value?.toLowerCase().trim() || ''
  if (!search) return completedSectionsLatest.value

  return completedSectionsLatest.value.filter(sec => 
    sec.section_format.toLowerCase().includes(search)
  )
})

// Filtered sections by course_name only (deduplicated)
const filteredCompletedSectionsByCourse = computed(() => {
  const search = chooseCourse.value?.toLowerCase().trim() || ''

  // Start with all completed sections if no search
  let filtered = completedSectionsLatest.value
  if (search) {
    filtered = filtered.filter(sec => sec.course_name.toLowerCase().includes(search))
  }

  // Deduplicate by course_name
  const seen = new Set()
  const uniqueCourses = []
  filtered.forEach(sec => {
    if (!seen.has(sec.course_name)) {
      seen.add(sec.course_name)
      uniqueCourses.push(sec)
    }
  })

  return uniqueCourses
})

// Filtered all teachers
const filteredTeachers = computed(() => {
    if (!chooseTeacher.value) return teachersDB.value
    return teachersDB.value.filter(tch =>
        (tch.first_name + ' ' + tch.last_name)
            .toLowerCase()
            .includes(chooseTeacher.value.toLowerCase())
    )
})



onMounted(async () => {
  await schedulesNullCheck()
  await fetchSections()
  await fetchTeachersWithLatestSchedule()
})

//#endregion

//#region Export to PDF Modal
function toggleExportToPDFModal() {
    isVisibleExportToPDFModal.value = !isVisibleExportToPDFModal.value

    resetInputs()
}

function selectSection(sec) {
    chooseSection.value = sec.section_format
    chooseSectionInputFocused.value = false
}

function selectCourse(sec) {
    chooseCourse.value = sec.course_name
    chooseCourseInputFocused.value = false
}

function selectTeacher(tch) {
    chooseTeacher.value = tch.last_name + ', ' + tch.first_name
    chooseTeacherInputFocused.value = false
}

function resetInputs() {
    setTimeout(() => {
        exportScheduleBy.value = ''
        exportType.value = ''
        chooseCourse.value = ''
        chooseSection.value = ''
        showErrorInput.value = false
        chooseTeacher.value = ''
    }, 200)
}

function exportToPDFConfirm() {
    showErrorInput.value = false

    let sectionId = null;
    let courseId = null;
    let teacherId = null;

    
    if (exportScheduleBy.value === 'section') {
        if (exportType.value === 'individual') {
            if (isChooseSectionOk.value) {
                // Find section object by section_format
                const sec = completedSectionsLatest.value.find(s => s.section_format === chooseSection.value.trim());
                if (sec) {
                    sectionId = sec.section_id;
                }
                // Check if already selected
                if (store.sectionId === sectionId) {
                    alert("This section is already exported.");
                    return;
                }
                
                isExporting.value = true
                store.sectionId = sec.section_id // update the store
            } else {
                showErrorInput.value = true;

                // animate red border
                showErrorInput.value = false
                setTimeout(() => { showErrorInput.value = true; }, 0);
                return;
            }
        } else if (exportType.value === 'byCourse') {
            if (isChooseCourseOk.value) {
                // Find a section for the selected course
                const sec = completedSectionsLatest.value.find(s => s.course_name === chooseCourse.value.trim());
                if (sec) {
                    courseId = sec.course_id;
                }
                
                isExporting.value = true
                store.byCourseOrAll = 'byCourse'
                    // Filter sections with the same course_name
                    const filteredSections = completedSectionsLatest.value.filter(
                    sec => sec.course_name === chooseCourse.value
                )
                // Store only their section_id values
                store.bulkSectionId = filteredSections.map(sec => sec.section_id)
            } else {
                showErrorInput.value = true;

                // animate red border
                showErrorInput.value = false
                setTimeout(() => { showErrorInput.value = true; }, 0);
                return;
            }
        } else if (exportType.value === 'all') { 
            isExporting.value = true
            store.byCourseOrAll = 'all'
            store.bulkSectionId = completedSectionsLatest.value.map(sec => sec.section_id)
        }
    } else if (exportScheduleBy.value === 'teacher') {
        if (exportType.value === 'individual') {
            if (isChooseTeacherOk.value) {
                // Find teacher object by last_name + first_name
                const tch = teachersDB.value.find(t => {
                    const fullName = (t.last_name + ', ' + t.first_name).trim();
                    return fullName === chooseTeacher.value.trim();
                });
                if (tch) teacherId = tch.teacher_id;

                // Check if already selected
                if (store.teacherId === teacherId) {
                    alert("This section is already exported.");
                    return;
                }

                isExporting.value = true
                store.teacherId = teacherId
            } else {
                showErrorInput.value = true;

                // animate red border
                showErrorInput.value = false
                setTimeout(() => { showErrorInput.value = true; }, 0);
                return;
            }
        } else if (exportType.value === 'all') {
            isExporting.value = true
            store.byCourseOrAll = 'all'
            store.bulkTeacherId = filteredTeachers.value.map(tchrs => tchrs.teacher_id)
        }
        
    }
    toggleExportToPDFModal
}

// 🔍 Watch both exportScheduleBy and exportType
watch([exportScheduleBy, exportType], ([newExportBy, newExportType]) => {

    showErrorInput.value = false;
  
  // Show "Choose Course" if export by section and type is By Course
  if (newExportBy === 'section' && newExportType === 'byCourse') {
    isVisibleChooseCourse.value = true
  } else {
    isVisibleChooseCourse.value = false
    chooseCourse.value = ''
  }

  // Show "Choose Section" if type is Individual
  if (newExportBy === 'section' && newExportType === 'individual') {
    isVisibleChooseSection.value = true
  } else {
    isVisibleChooseSection.value = false
    chooseSection.value = ''
  }

  // Show "Choose Teacher" if type is Individual
  if (newExportBy === 'teacher' && newExportType === 'individual') {
    isVisibleChooseTeacher.value = true
  } else {
    isVisibleChooseTeacher.value = false
    chooseTeacher.value = ''
  }
})

// Watch the input `chooseSection` and validate
watch(chooseSection, (newVal) => {
  const isValid = completedSectionsLatest.value.some(
    sec => sec.section_format === newVal.trim()
  )

  isChooseSectionOk.value = isValid
})

// Watch the input `chooseCourse` and validate
watch(chooseCourse, (newVal) => {
  const isValid = completedSectionsLatest.value.some(
    sec => sec.course_name === newVal.trim()
  )

  isChooseCourseOk.value = isValid
})

// Watch the input `chooseTeacher` and validate (case-insensitive)
watch(chooseTeacher, (newVal) => {
  const input = newVal.trim().toLowerCase(); // normalize input

  const isValid = teachersDB.value.some(tch => {
    const fullName = (tch.last_name + ', ' + tch.first_name).trim().toLowerCase();
    return fullName === input;
  });

  isChooseTeacherOk.value = isValid;
});




function handleClickOutside(event) {
    if (chooseSectionWrapper.value && !chooseSectionWrapper.value.contains(event.target)) {
        chooseSectionInputFocused.value = false
    }

    if (chooseCourseWrapper.value && !chooseCourseWrapper.value.contains(event.target)) {
        chooseCourseInputFocused.value = false
    }

    if (chooseTeacherWrapper.value && !chooseTeacherWrapper.value.contains(event.target)) {
        chooseTeacherInputFocused.value = false
    }
}

onMounted(() => {
    document.addEventListener('mousedown', handleClickOutside)
})

onBeforeUnmount(() => {
    document.removeEventListener('mousedown', handleClickOutside)
})
//#endregion

//#region 🧭 ROUTER
const router = useRouter()
const route = useRoute()
function goToPage(section) {
    router.push({
        path: `/main/class-scheduling/week-table`,
        query: { data: JSON.stringify(section) }
    })
}

// refetch when route changes
watch(
  () => route.fullPath, // or route.name
  () => {
    schedulesNullCheck()
    fetchSections()
  }
)

// Export finish?
watch(
  () => store.exportDone,
  (done) => {
    if (done) {
        toggleExportToPDFModal()
        setTimeout(() => {
            isExporting.value = false;
        }, 200);
        store.exportDone = false
    }
  }
)
//#endregion
</script>

<template>
    <div id="container" v-if="$route.path === '/main/class-scheduling'">

        <header>
            <svg height="100%" viewBox="0 0 114 114" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g filter="url(#filter0_d_58_86)">
                <circle cx="55" cy="53" r="53" fill="#E4F5FF"/>
                </g>
                <g clip-path="url(#clip0_58_86)">
                <path d="M54.5 82.5C38.6875 82.5 25.75 69.5625 25.75 53.75C25.75 37.9375 38.6875 25 54.5 25C70.3125 25 83.25 37.9375 83.25 53.75C83.25 69.5625 70.3125 82.5 54.5 82.5ZM54.5 29.7917C41.3229 29.7917 30.5417 40.5729 30.5417 53.75C30.5417 66.9271 41.3229 77.7083 54.5 77.7083C67.6771 77.7083 78.4583 66.9271 78.4583 53.75C78.4583 40.5729 67.6771 29.7917 54.5 29.7917Z" fill="#0785D4"/>
                <path d="M54.5 56.1465C53.0625 56.1465 52.1042 55.1881 52.1042 53.7506V36.9798C52.1042 35.5423 53.0625 34.584 54.5 34.584C55.9375 34.584 56.8959 35.5423 56.8959 36.9798V53.7506C56.8959 55.1881 55.9375 56.1465 54.5 56.1465Z" fill="#0785D4"/>
                <path d="M64.0834 65.7285C63.3646 65.7285 62.8854 65.4889 62.4063 65.0098L52.8229 55.4264C51.8646 54.4681 51.8646 53.0306 52.8229 52.0723C53.7813 51.1139 55.2188 51.1139 56.1771 52.0723L65.7604 61.6556C66.7188 62.6139 66.7188 64.0514 65.7604 65.0098C65.2813 65.4889 64.8021 65.7285 64.0834 65.7285Z" fill="#0785D4"/>
                </g>
                <defs>
                <filter id="filter0_d_58_86" x="0" y="0" width="114" height="114" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                <feOffset dx="2" dy="4"/>
                <feGaussianBlur stdDeviation="2"/>
                <feComposite in2="hardAlpha" operator="out"/>
                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_58_86"/>
                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_58_86" result="shape"/>
                </filter>
                <clipPath id="clip0_58_86">
                <rect width="57.5" height="57.5" fill="white" transform="translate(25.75 25)"/>
                </clipPath>
                </defs>
            </svg>

            <div style="display: flex; flex-direction: column;">
                <h1>Class Scheduling</h1>
                <p class="paragraph--gray">Centralized section management.</p>
            </div>

            <div class="export-btn" @click="toggleExportToPDFModal()">
                <p>Export to PDF</p>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 13.9536V11.3957C14 10.7818 14.4 10.3725 15 10.3725C15.6 10.3725 16 10.7818 16 11.3957V14.4652C16 15.2838 15.4 16 14.6 16H1.4C0.6 16 0 15.2838 0 14.4652V11.3957C0 10.7818 0.4 10.3725 1 10.3725C1.6 10.3725 2 10.7818 2 11.3957V13.9536H14ZM7 3.41487L5.8 4.64269C5.4 5.05196 4.8 5.05196 4.4 4.64269C4 4.33573 4 3.6195 4.4 3.21023L7.2 0.345324C7.5 0.0383693 7.9 -0.0639488 8.2 0.0383693C8.4 0.0383693 8.6 0.140687 8.7 0.345324L11.5 3.21023C11.9 3.6195 11.9 4.23341 11.5 4.64269C11.1 5.05196 10.5 5.05196 10.1 4.64269L9 3.6195V10.2702C9 10.8841 8.6 11.2934 8 11.2934C7.4 11.2934 7 10.8841 7 10.2702V3.41487Z" fill="white"/>
                </svg>
            </div>
        </header>

        <main>
            <!-- Loading state -->
            <div v-if="!sections.length" 
                style="display: flex; justify-content: center; align-items: center; height: 60vh;">
                <p style="text-align: center; color: black; font-size: 18px;">
                    Loading...
                </p>
            </div>

            <!-- Show only if sections have loaded and there are no sections -->
            <div v-if="sections.length && !Object.keys(groupedSections).length" 
                style="display: flex; justify-content: center; align-items: center; height: 60vh;">
                <p style="text-align: center; color: black; font-size: 18px;">
                    No sections yet.
                </p>
            </div>

            <!-- Loop through grouped sections -->
            <div v-for="(group, groupKey) in groupedSections" :key="groupKey">
                <h3 style="margin: 0; margin-bottom: 24px;">{{ groupKey }}</h3>
                
                <!-- Group by course name -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto; gap: 2.5vw;">

                    <!-- Group by course name -->
                    <div v-for="course in [...new Set(group.map(sec => sec.course_name))]">
                        <div style="display: grid; grid-template-columns: 50% 50%; padding-left: 24px; margin-bottom: 8px;">
                            <label class="paragraph--gray" style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ course }}</label> 
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); text-align: center;">
                                <label class="paragraph--gray" style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Class No.</label>
                                <label class="paragraph--gray" style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Status</label>
                            </div>
                        </div>

                        <!-- Section cards -->
                        <div style="display: flex; 
                                    flex-direction: column; 
                                    background-color: white; 
                                    border-radius: 6px;
                                    border-top: 1px solid var(--color-border); 
                                    border-left: 1px solid var(--color-border); 
                                    border-right: 1px solid var(--color-border); 
                                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);">
                                    
                            <div v-for="section in group.filter(sec => sec.course_name === course)"
                                :key="section.section_id"
                                class="card-content" 
                                @click="goToPage(section)">
                                <label>{{ section.section_format }}</label>
                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); text-align: center;">
                                    <label>{{ section.student_count }}</label>
                                        <label>
                                        <span
                                            :style="{
                                            color:
                                                section.schedule_status === 'Unset'
                                                ? 'red'
                                                : section.schedule_status === 'Complete'
                                                ? 'green'
                                                : section.schedule_status === 'Partially Set'
                                                ? 'gold'
                                                : 'black'
                                            }"
                                        >
                                            ■
                                        </span>
                                        {{ section.schedule_status }}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <!-- Export to PDF Modal -->
        <transition name="fade">
            <div v-show="isVisibleExportToPDFModal" class="modal" @click.self="!isExporting && toggleExportToPDFModal()">
               <div class="modal-content">
                    <h2 style="line-height: 0; margin: 12px 0px; align-self: flex-start;">Export to PDF</h2>

                    <div style="display: flex; flex-direction: column; gap: 14px; width: 100%;">
                        <div style="display: flex; flex-direction: row; gap: 14px;">
                            <div style="flex: 1;">
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Export Schedule By</p>
                                <select v-model="exportScheduleBy" style="width: 100%;" :disabled="isExporting" >
                                    <option value="section">Section</option>
                                    <option value="teacher">Teacher</option>
                                </select>
                            </div>

                            <div style="flex: 1;">
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Export Type</p>
                                <select v-model="exportType" style="width: 100%;" :disabled="isExporting" >
                                    <!-- Only show these if exportScheduleBy has a value -->
                                    <template v-if="exportScheduleBy">
                                    <option value="individual">Individual</option>
                                    <option v-if="exportScheduleBy === 'section'" value="byCourse">By Course</option>
                                    <option value="all">All</option>
                                    </template>
                                </select>
                            </div>
                        </div>

                        <!-- Choose Course -->
                        <div v-show="isVisibleChooseCourse">
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Choose Course</p>
                            <div style="position: relative; width: 100%;" ref="chooseCourseWrapper">
                                <input 
                                v-model="chooseCourse" 
                                @focus="chooseCourseInputFocused = true"
                                placeholder="Search course here.."
                                :class="{ 'error-input-border': showErrorInput && !isChooseCourseOk }"></input>

                                <div v-if="chooseCourseInputFocused" class="dropdown" style="z-index: 2;">
                                    <!-- Dropdown suggestions -->
                                    <div v-for="sec in filteredCompletedSectionsByCourse" 
                                        class="dropdown-item"
                                        @click="selectCourse(sec)">
                                        {{ sec.course_name }}
                                    </div>
                                   
                                    <!-- Show "No results" if empty -->
                                    <div 
                                    v-if="filteredCompletedSectionsByCourse.length === 0" 
                                    class="dropdown-item no-result"
                                    style="text-align: center; color: #7F8D9C; font-style: italic;">
                                    -- No results --
                                    </div>
                                </div>
                                
                            </div>
                        </div>
                        
                        <!-- Choose Section -->
                        <div :style="{
                                display: (isVisibleChooseSection || isVisibleChooseTeacher) ? 'grid' : 'none',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '14px'
                            }">
                            <div v-show="isVisibleChooseSection">
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Choose Section</p>
                                <div style="position: relative; width: 100%;" ref="chooseSectionWrapper">
                                    <input 
                                    v-model="chooseSection" 
                                    @focus="chooseSectionInputFocused = true"
                                    placeholder="Search sections here.."
                                    :class="{ 'error-input-border': showErrorInput && !isChooseSectionOk }"></input>

                                    <div v-if="chooseSectionInputFocused" class="dropdown" style="z-index: 2;">
                                        <!-- Dropdown suggestions -->
                                        <div v-for="sec in filteredCompletedSections" 
                                            :key="sec.section_id"
                                            class="dropdown-item"
                                            @click="selectSection(sec)">
                                            {{ sec.section_format }}
                                        </div>

                                        <!-- Show "No results" if empty -->
                                        <div 
                                            v-if="filteredCompletedSections.length === 0" 
                                            class="dropdown-item no-result"
                                            style="text-align: center; color: #7F8D9C; font-style: italic;">
                                            -- No results --
                                        </div>
                                    </div>
                                    
                                </div>
                            </div>

                            <!-- Choose Teacher -->
                            <div v-show="isVisibleChooseTeacher">
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Choose Teacher</p>
                                <div style="position: relative; width: 100%;" ref="chooseTeacherWrapper">
                                    <input 
                                    v-model="chooseTeacher" 
                                    @focus="chooseTeacherInputFocused = true"
                                    placeholder="Search teacher here.."
                                    :class="{ 'error-input-border': showErrorInput && !isChooseTeacherOk }"></input>

                                    <div v-if="chooseTeacherInputFocused" class="dropdown" style="z-index: 2;">
                                        <!-- Dropdown suggestions -->
                                        <div v-for="tch in filteredTeachers" 
                                            :key="tch.teacher_id"
                                            class="dropdown-item"
                                            @click="selectTeacher(tch)">
                                            {{ tch.last_name + ', ' + tch.first_name }}
                                        </div>

                                        <!-- Show "No results" if empty -->
                                        <div 
                                            v-if="filteredTeachers.length === 0" 
                                            class="dropdown-item no-result"
                                            style="text-align: center; color: #7F8D9C; font-style: italic;">
                                            -- No results --
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: row;">
                        <p style="color: #444141; font-size: 14px"><strong>Note:</strong> Only schedules from the latest academic year and semester will be exported. Ensure that all schedules are marked as Completed.</p>
                    </div>

                    <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto;">
                        <button @click="toggleExportToPDFModal()" class="cancelBtn" :disabled="isExporting">Cancel</button>
                        <button 
                            @click="exportToPDFConfirm" 
                            style="width: 92px;"
                            :disabled="isExporting" 
                            :style="{
                                width: 'fit-content',
                                borderColor: isExporting ? 'rgba(7, 134, 212, 0.42)' : '',
                                backgroundColor: isExporting ? 'rgba(7, 134, 212, 0.93)' : '',
                                color: isExporting ? 'white' : '',
                                cursor: isExporting ? 'not-allowed' : 'pointer'
                            }">{{ isExporting ? 'Exporting..' : 'Export' }}</button>
                    </div>
               </div>
            </div>
        </transition>
    </div>

    <router-view></router-view>
</template>

<style scoped>
    #container{
        height: 100%;
        width: 100%;
    }

    header {
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%;
        height: 72px;
        gap: 12px;
        margin-bottom: 35px;
    }

    main {
        display: flex;
        flex-direction: column;
        gap: 35px;
    }

    .card {
        
    }

    .card-content {
        display: grid; 
        grid-template-columns: 50% 50%; 
        padding: 12px 0; 
        padding-left: 24px; 
        border-bottom: 1px solid var(--color-border);
        transition: all ease 0.3s;
    }

    .card-content:hover {
        background-color: var( --color-secondary);
    }

    .modal-content {
        display: flex;
        flex-direction: column;
        background-color: white;
        height: auto;
        align-items: center;
        width: 520px;
        padding-top: 30px;
        padding-bottom: 30px;
        padding-left: 50px;
        padding-right: 50px;
        box-shadow: -2px 0 8px rgba(0,0,0,0.2);
        border-radius: 6px;
        gap: 26px;
    }

    .export-btn {
        display: flex; 
        flex-direction: row; 
        align-items: center;
        justify-content: center;
        padding: 8px 16px;
        gap: 8px; 
        margin-left: auto;
        margin-top: auto;
        background-color: var(--color-primary); 
        border-radius: 6px; 
        border: 1px solid var(--color-primary);
        transition: all ease 0.1s;
        user-select: none;
        cursor: pointer;
        transition: background-color 0.1s;
    }

    .export-btn:hover {
        background-color: var(--color-primary-hover);
        transition: background-color 0.1s;
    }

    .export-btn:active {
        scale: 0.95;
    }

    .export-btn > p {
        color: white;
    }
</style>