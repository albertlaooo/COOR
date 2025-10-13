<script setup>
//#region 📦 IMPORTS
import { useRouter, useRoute } from 'vue-router'
import { ref, onMounted, watch } from 'vue'
import axios from "axios"
//#endregion

//#region ADD AND REMOVE ROW
function addRow() {
  // Add a new empty time row
  times.value.push({ start: null, end: null })
}

function removeRow() {
  if (!times.value.length) return
  const lastTime = times.value.pop()

  // Remove schedule entries for all days
  const rangeStr = `${formatTime(lastTime.start)}-${formatTime(lastTime.end)}`
  for (const day of Object.keys(schedule.value)) {
    if (schedule.value[day] && schedule.value[day][rangeStr]) {
      delete schedule.value[day][rangeStr]
    }
  }
}
//#endregion


//#region 🧱 REFS & STATE
const selectedSection = ref([])

const isVisibleTeachers = ref(false)
const isVisibleSubjects = ref(false)
const isVisibleEditTimeModal = ref(false)
const isVisibleAddScheduleModal = ref(false)

const days = ['Mon', 'Tue', 'Wed', 'Thurs', 'Fri', 'Sat']

// For tracking clicked cell
const clickedDay = ref(null)
const clickedTime = ref(null)

// Edit Time Modal
const inputStartTime = ref('')
const inputEndTime = ref('')

// Add Schedule Modal
const labelDayASModal = ref('')
const labelTimeASModal = ref('')
const inputSubject = ref('')
const inputRoom = ref('')
const inputTeacher = ref('')

// Fetched Data from DB
const courseSubjectsDB = ref([]) // Filtered subjects base on year and semester

//#endregion

///#region FETCHED DATA FROM DB
const fetchCourseSubjects = async (courseId) => {
  if (!selectedSection.value || !selectedSection.value.year || !selectedSection.value.semester) {
    console.warn("Selected section missing year/semester.");
    return;
  }

  try {
    const response = await axios.get(`http://localhost:3000/courses/${courseId}/subjects`);
    
    // Filter by year and semester based on selectedSection
    courseSubjectsDB.value = response.data.filter(subject => {
      return (
        subject.year === selectedSection.value.year &&
        subject.semester === selectedSection.value.semester
      );
    });

  } catch (err) {
    console.error("Error fetching subjects:", err);
  }
};

//#region 🕒 TIME CONVERSION UTILITIES
// 🔹 Converts "7:00" → 420, "1:30" → 90, etc.
function toMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + (minutes || 0)
}

// 🔹 Converts minutes → "HH:MM" (e.g., 420 → "07:00")
function toHHMM(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

// 🔹 Converts "7:00-9:00" → { start: 420, end: 540 }
function parseTimeRange(range) {
  const [start, end] = range.split('-')
  return { start: toMinutes(start), end: toMinutes(end) }
}

// 🔹 Converts 24-hour minutes → 24-hour display format (e.g., 780 → "13:00")
function formatTime(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

// 🔹 Converts minutes → 12-hour format (UI display only)
function formatTime12Hour(minutes) {
  if (minutes === null || minutes === undefined) return '--';
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${mins.toString().padStart(2, '0')}`;
}

//#endregion


//#region ⏰ TIME DATA
// ✅ Store times as numeric minute ranges instead of strings (Default)
const times = ref([
  parseTimeRange('07:00-09:00'),
  parseTimeRange('10:00-13:00'),
  parseTimeRange('13:30-15:00'),
  parseTimeRange('15:00-16:30'),
  parseTimeRange('16:30-17:00')
])
//#endregion


//#region 📘 SCHEDULE DATA
const schedule = ref({
  'Mon': {
    '07:00-09:00': {
      room: 'Room 201',
      subject: 'Purposive Communication',
      teacher: 'Santos, Jay'
    },
    '13:30-15:00': {
      room: 'Room 203',
      subject: 'Understanding the Self',
      teacher: 'Dela Cruz, Ana'
    }
  },
  'Tue': {
    '13:30-15:00': {
      room: 'Room 101',
      subject: 'Mathematics in the Modern World',
      teacher: 'Reyes, John'
    },
    '15:00-16:30': {
      room: 'Room 102',
      subject: 'Physical Education',
      teacher: 'Cruz, Mark'
    }
  },
  'Thurs': {
    '07:00-09:00': {
      room: 'Room 204',
      subject: 'Art Appreciation',
      teacher: 'Lopez, Maria'
    }
  }
})
//#endregion


//#region 🧮 EDIT TIME MODAL
function toggleEditTimeModal(which, time) {
  if (which === 'update') {
    clickedTime.value = time
    isVisibleEditTimeModal.value = true

    // ✅ Handle nulls
    inputStartTime.value = time.start !== null ? toHHMM(time.start) : ''
    inputEndTime.value = time.end !== null ? toHHMM(time.end) : ''
    return
  }

  if (which === 'cancel') {
    isVisibleEditTimeModal.value = false
    inputStartTime.value = ''
    inputEndTime.value = ''
    clickedTime.value = null
    return
  }
}

function editTimeConfirm() {
  if (!inputStartTime.value || !inputEndTime.value) {
    alert('Please enter both start and end times.')
    return
  }

  if (!clickedTime.value) {
    alert('No time slot selected to update.')
    return
  }

  const newStart = toMinutes(inputStartTime.value)
  const newEnd = toMinutes(inputEndTime.value)

  if (newEnd <= newStart) {
    alert('End time must be later than start time.')
    return
  }

  // ⚠️ Check for overlapping/conflicting times
  const hasConflict = times.value.some(t => {
    // Skip the currently edited time slot
    if (t.start === clickedTime.value.start && t.end === clickedTime.value.end) return false

    // Overlap condition: (newStart < existingEnd) && (newEnd > existingStart)
    return newStart < t.end && newEnd > t.start
  })

  if (hasConflict) {
    alert('⚠️ The time range overlaps with another existing time slot.')
    return
  }

  // find the index in the reactive times array
  const index = times.value.findIndex(
    t => t.start === clickedTime.value.start && t.end === clickedTime.value.end
  )

  if (index !== -1) {
    const oldRangeStr = `${formatTime(clickedTime.value.start)}-${formatTime(clickedTime.value.end)}`
    const newRangeStr = `${formatTime(newStart)}-${formatTime(newEnd)}`

    // ✅ Update the times array
    times.value[index] = { start: newStart, end: newEnd }

    // ✅ Update schedule keys using the old range
    for (const day of Object.keys(schedule.value)) {
      const daySchedule = schedule.value[day]
      if (daySchedule && daySchedule[oldRangeStr]) {
        daySchedule[newRangeStr] = daySchedule[oldRangeStr]
        delete daySchedule[oldRangeStr]
      }
    }

    // ✅ Automatically sort from earliest to latest
    times.value.sort((a, b) => a.start - b.start)

    console.log('✅ Sorted times:', times.value)
  } else {
    console.warn('⚠️ Could not find the clicked time range to update.')
  }

  toggleEditTimeModal('cancel')
}
//#endregion


//#region WATCH INPUT LIMIT EDIT TIME MODAL
// 🔹 Watch start time — prevent earlier than 7:00 AM or later than 5:00 PM
watch(inputStartTime, (val) => {
  if (!val) return
  if (val < '07:00') inputStartTime.value = '07:00'
  if (val > '17:00') inputStartTime.value = '17:00'

  // If end time is earlier than start, auto-adjust
  if (inputEndTime.value && inputEndTime.value < inputStartTime.value) {
    inputEndTime.value = inputStartTime.value
  }
})

// 🔹 Watch end time — limit between start and 5:00 PM
watch(inputEndTime, (val) => {
  if (!val) return
  if (val < (inputStartTime.value || '07:00')) inputEndTime.value = inputStartTime.value || '07:00'
  if (val > '17:00') inputEndTime.value = '17:00'
})
//#endregion

//#region 🧮 ADD SCHEDULE MODAL
const dayMap = {
  'Mon': 'Monday',
  'Tue': 'Tuesday',
  'Wed': 'Wednesday',
  'Thu': 'Thursday',
  'Fri': 'Friday',
  'Sat': 'Saturday',
  'Sun': 'Sunday'
};
function handleCellClick(day, time) {
    clickedDay.value = day
    clickedTime.value = time // Object {start, end} minutes

    labelDayASModal.value = dayMap[day]
    labelTimeASModal.value = `${formatTime12Hour(time.start)} - ${formatTime12Hour(time.end)}`;


    toggleAddScheduleModal()
}

function toggleAddScheduleModal() {
    isVisibleAddScheduleModal.value = !isVisibleAddScheduleModal.value
}

function addScheduleConfirm() {

}
//#endregion

//#region 🧭 ROUTER
const route = useRoute()
onMounted(() => {
  if (route.query.data) {
    selectedSection.value = JSON.parse(route.query.data)
    fetchCourseSubjects(selectedSection.value.course_id)
  }
})

const router = useRouter()
function backBtn() {
  router.push(`/main/class-scheduling`)
}
//#endregion
</script>



<template>
    <div id="container">

        <header>
            <svg @click="backBtn" width="42" height="42" viewBox="0 0 61 61" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clip-path="url(#clip0_93_1892)">
                <path d="M13.8636 0H47.1364C50.8132 0 54.3395 1.46063 56.9394 4.06056C59.5394 6.6605 61 10.1868 61 13.8636V47.1364C61 50.8132 59.5394 54.3395 56.9394 56.9394C54.3395 59.5394 50.8132 61 47.1364 61H13.8636C10.1868 61 6.6605 59.5394 4.06056 56.9394C1.46063 54.3395 0 50.8132 0 47.1364L0 13.8636C0 10.1868 1.46063 6.6605 4.06056 4.06056C6.6605 1.46063 10.1868 0 13.8636 0ZM39.9661 42.4033L28.0628 30.5L39.9661 18.5967L36.0455 14.676L20.2215 30.5L36.0455 46.324L39.9661 42.4033Z" fill="#0785D4"/>
                </g>
                <defs>
                <clipPath id="clip0_93_1892">
                <rect width="61" height="61" fill="white"/>
                </clipPath>
                </defs>
            </svg>

            <div style="display: flex; flex-direction: column;">
                <h1>{{ selectedSection.section_format }}</h1>
                <p class=".paragraph--gray">Plan and organize class schedules.</p>
            </div>
        </header>

        <main>
            <div style="display: flex; flex-direction: row; gap: 12px;">
                <!-- Teachers -->
                <div style="display: flex; flex-direction: column; gap: 6px;">

                    <!-- Button -->
                    <div class="toggleBtn"
                        :style="{
                                backgroundColor: isVisibleTeachers ? 'var(--color-secondary)' : '',
                                border: isVisibleTeachers ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                            }"
                        @click="isVisibleTeachers = !isVisibleTeachers">
                        <svg width="18" height="18" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9.5003 11.889C11.5005 11.889 13.5838 12.3242 15.7503 13.1945C17.9168 14.0648 19 15.2037 19 16.6113V19H0V16.6113C0 15.2037 1.08324 14.0648 3.24973 13.1945C5.41621 12.3242 7.50013 11.889 9.5003 11.889ZM9.5003 9.5003C8.20412 9.5003 7.09303 9.03729 6.16702 8.11128C5.24101 7.18527 4.778 6.07418 4.778 4.778C4.778 3.48182 5.24101 2.36144 6.16702 1.41687C7.09303 0.472289 8.20412 0 9.5003 0C10.7965 0 11.9076 0.472289 12.8336 1.41687C13.7596 2.36144 14.2226 3.48182 14.2226 4.778C14.2226 6.07418 13.7596 7.18527 12.8336 8.11128C11.9076 9.03729 10.7965 9.5003 9.5003 9.5003Z" :fill="isVisibleTeachers ? 'var(--color-primary)' : '#373737'"/>
                        </svg>

                        <label style="display: flex; align-items: center; line-height: 1; color: #373737;"
                                :style="{
                                        color: isVisibleTeachers ? 'var(--color-primary)' : '#373737'
                                    }">Teachers</label>
                                
                        <svg style="margin-left: auto;" :style="{ transition: 'fill 0.2s ease-in-out, transform 0.2s ease-in-out', transform: isVisibleTeachers ? 'rotate(-180deg)' : 'rotate(0deg)'}" width="18" height="11" viewBox="0 0 20 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19.0625 2.65625L9.53125 12.1562L0 2.65625L2.46875 0.15625L9.53125 7.3125L16.9062 0L19.2812 2.4375L19.0625 2.65625Z" :fill="isVisibleTeachers ? 'var(--color-primary)' : '#373737'"/>
                        </svg>
                    </div>

                    <!-- Content -->
                    <transition name="slide-down">
                        <div v-show="isVisibleTeachers" class="table-container small-table">
                            <table>
                                <!-- Header -->
                                <thead>
                                    <tr>
                                        <th class="name-col">Name</th>
                                        <th class="availability-col">Availability</th>
                                    </tr>
                                </thead>

                                <!-- Content -->
                                <tbody>
                                    <tr>
                                        <td class="truncate">Teacher 1asdasdfasdfasfsfsdfsdfsd</td>
                                        <td class="center">M, T, W, TH, F</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </transition>
                </div>

                <!-- Subjects -->
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <!-- Button -->
                    <div class="toggleBtn"
                        :style="{
                                    backgroundColor: isVisibleSubjects ? 'var(--color-secondary)' : '',
                                    border: isVisibleSubjects ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                                }"
                        @click="isVisibleSubjects = !isVisibleSubjects">
                        <svg width="15" height="20" viewBox="0 0 16 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3.83337 15.7507H15.5V0.583984H3.83337C1.90837 0.583984 0.333374 2.15898 0.333374 4.08398V16.9173C0.333374 18.8423 1.90837 20.4173 3.83337 20.4173H15.5V18.084H3.83337C3.19171 18.084 2.66671 17.559 2.66671 16.9173C2.66671 16.2757 3.19171 15.7507 3.83337 15.7507Z" :fill="isVisibleSubjects ? 'var(--color-primary)' : '#373737'"/>
                        </svg>

                        <label style="display: flex; align-items: center; line-height: 1; color: #373737;"
                                :style="{
                                        color: isVisibleSubjects ? 'var(--color-primary)' : '#373737'
                                    }">Subjects</label>
                                
                        <svg style="margin-left: auto;" width="18" height="11" viewBox="0 0 20 13" fill="none" :style="{ transition: 'fill 0.2s ease-in-out, transform 0.2s ease-in-out', transform: isVisibleSubjects ? 'rotate(-180deg)' : 'rotate(0deg)'}" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19.0625 2.65625L9.53125 12.1562L0 2.65625L2.46875 0.15625L9.53125 7.3125L16.9062 0L19.2812 2.4375L19.0625 2.65625Z" :fill="isVisibleSubjects ? 'var(--color-primary)' : '#373737'"/>
                        </svg>
                    </div>

                    <!-- Content -->
                    <transition name="slide-down">
                        <div v-show="isVisibleSubjects" class="table-container large-table">
                            <table>
                                <!-- Header -->
                                <thead>
                                <tr>
                                    <th class="center">Subject Code</th>
                                    <th class="subject-name-col">Subject Name</th>
                                    <th class="center">Hrs/Week</th>
                                    <th class="center">Room Type</th>
                                </tr>
                                </thead>

                                <!-- Content -->
                                <tbody>
                                <tr v-for="subject in courseSubjectsDB" :key="subject.id">
                                    <td class="center">{{ subject.subject_code }}</td>
                                    <td class="truncate">{{ subject.subject_name }}</td>
                                    <td class="center">{{ subject.lecture }} hrs, {{ subject.laboratory }} hrs</td>
                                    <td class="center">{{ subject.laboratory > 0 ? 'Lec, Lab' : 'Lec' }}</td>
                                </tr>

                                <!-- Optional: show a message if no subjects -->
                                <tr v-if="courseSubjectsDB.length === 0">
                                    <td colspan="4" class="center">No subjects for this section/year/semester.</td>
                                </tr>
                                </tbody>
                            </table>
                        </div>
                    </transition>
                </div>

                <!-- Save Button -->
                <button @click="backBtn()" style="margin-left: auto; margin-top: auto;">Done</button>
            </div>

            <!-- Table -->
            <div class="schedule-grid">
                <!-- Header Row -->
                <div class="time-label">Time</div>
                <div v-for="day in days" 
                :key="day" 
                class="day">{{ day }}</div>

                <!-- Rows -->
                <template v-for="time in times" :key="time.start">
                    <div class="time"
                        @click="toggleEditTimeModal('update', time)">
                         {{ formatTime12Hour(time.start) }} - {{ formatTime12Hour(time.end) }}
                        <svg class="svg-icon" style="width: 20px; height: 20px; margin-left: 5px; vertical-align: middle; fill: currentcolor; overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"> <path d="M423.381333 85.333333a42.666667 42.666667 0 0 1 4.992 85.034667L423.381333 170.666667H246.186667a75.52 75.52 0 0 0-75.221334 69.290666L170.666667 246.186667v531.712c0 39.594667 30.506667 72.106667 69.290666 75.221333L246.186667 853.333333h531.712a75.52 75.52 0 0 0 75.221333-69.290666L853.333333 777.813333v-177.237333a42.666667 42.666667 0 0 1 85.034667-4.992l0.298667 4.992v177.237333a160.853333 160.853333 0 0 1-152.533334 160.597334L777.813333 938.666667H246.144a160.853333 160.853333 0 0 1-160.597333-152.533334L85.333333 777.813333V246.144a160.853333 160.853333 0 0 1 152.533334-160.597333L246.186667 85.333333h177.237333z" fill="white"></path> <path d="M716.501333 119.168a133.162667 133.162667 0 0 1 194.133334 182.186667l-5.802667 6.144-362.666667 362.666666a42.666667 42.666667 0 0 1-24.576 12.117334L512 682.666667H384a42.666667 42.666667 0 0 1-42.368-37.674667L341.333333 640v-128a42.666667 42.666667 0 0 1 8.789334-25.941333l3.712-4.266667 362.666666-362.666667z m128 60.330667a47.872 47.872 0 0 0-63.488-3.712l-4.181333 3.712L426.666667 529.664v67.626667h67.626666l350.208-350.122667a47.872 47.872 0 0 0 3.712-63.488l-3.712-4.181333z" fill="white"></path> <path d="M652.501333 183.168a42.666667 42.666667 0 0 1 56.32-3.541333l4.010667 3.541333 128 128a42.666667 42.666667 0 0 1-56.32 63.872l-4.010667-3.541333-128-128a42.666667 42.666667 0 0 1 0-60.330667z" fill="white"></path> </svg>
                    </div>

                    <div v-for="day in days" 
                        :key="day" 
                        class="cell"
                        @click="handleCellClick(day, time)">
                        <template v-if="schedule[day] && schedule[day][`${formatTime(time.start)}-${formatTime(time.end)}`]">
                            <p>{{ schedule[day][`${formatTime(time.start)}-${formatTime(time.end)}`].room }}</p>
                            <p>{{ schedule[day][`${formatTime(time.start)}-${formatTime(time.end)}`].subject }}</p>
                            <p>{{ schedule[day][`${formatTime(time.start)}-${formatTime(time.end)}`].teacher }}</p>
                        </template>
                    </div>
                </template>
            </div>

            <!-- Add / Remove Buttons Below Table -->
            <div style="margin-top: 12px; display: flex; gap: 6px;">
                <button @click="addRow()" style="background-color: green; color: white; padding: 6px 12px; border-radius: 4px;">Add Row</button>
                <button @click="removeRow()" style="background-color: red; color: white; padding: 6px 12px; border-radius: 4px;">Remove Row</button>
            </div>
            
        </main>
    
        <!-- Edit Time Modal -->
        <transition name="fade">
            <div v-show="isVisibleEditTimeModal" class="modal" style="z-index: 2;" @click.self="toggleEditTimeModal('cancel')">
               <div class="edit-time-modal-content">
                    <div style="border-bottom: 1px solid var(--color-border); width: 100%;">
                        <h3 style="line-height: 0; margin: 12px 0; align-self: flex-start; padding-bottom: 12px; margin-left: 30px; margin-right: 30px;">Edit time</h3>
                    </div>
                        
                    <div style="margin-left: 30px; margin-right: 30px;">
                        <div style="display: flex; flex-direction: row; align-items: center; gap: 14px; width: 100%; margin-bottom: 12px; ">
                            <div style="flex: 1;">
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Start time</p>
                                <input type="time" min="07:00" max="17:00" v-model="inputStartTime" />
                            </div>
                            
                            <label style="margin-top: 22px; font-weight: 500;">—</label>

                            <div style="flex: 1;">
                                <p class="paragraph--black-bold" style="line-height: 1.8;">End Time</p>
                                <input type="time" min="07:00" max="17:00" v-model="inputEndTime" />
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto; margin-right: 30px;">
                        <button @click="toggleEditTimeModal('cancel')" class="cancelBtn">Cancel</button>
                        <button @click="editTimeConfirm()">Confirm</button>
                    </div>
               </div>
            </div>
        </transition>

        <!-- Add Schedule Modal -->
        <transition name="fade">
            <div v-show="isVisibleAddScheduleModal" class="modal" style="z-index: 2;" @click.self="toggleAddScheduleModal('cancel')">
               <div class="add-schedule-modal-content">
                    <div style="display: flex; flex-direction: column; margin-right: auto; gap: 4px;">
                        <h3 style="line-height: 0; margin: 10px 0; font-size: x-large;">{{ labelDayASModal }}</h3>
                        <label>{{ labelTimeASModal }}</label>
                    </div>
                        
                    <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; margin-bottom: 14px;">
                        <div>
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Subject</p>
                            <input v-model="inputSubject" />
                        </div>

                        <div>
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Room</p>
                            <input v-model="inputRoom"/>
                        </div>

                        <div>
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Teacher</p>
                            <input v-model="inputTeacher"/>
                        </div>

                        <div>
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Logs</p>
                            <div class="logs">
                                <label>asdasdasd</label>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto;">
                        <button @click="toggleAddScheduleModal('cancel')" class="cancelBtn">Cancel</button>
                        <button @click="addScheduleConfirm()">Confirm</button>
                    </div>
               </div>
            </div>
        </transition>
    </div>
    
</template>

<style scoped>
/* =============================
   📦 LAYOUT STRUCTURE
============================= */
#container {
    height: 100%;
    width: 100%;
    margin-bottom: 60px;
}

header {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    height: 72px;
    gap: 26px;
    margin-left: 14px;
    margin-bottom: 35px;
}

main {
    display: flex;
    flex-direction: column;
    gap: 20px;
}


/* =============================
   🎚️ TOGGLE BUTTONS
============================= */
.toggleBtn {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
    background-color: var(--color-lightgray);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    color: black;
    width: 200px;
    height: 38px;
    padding: 0 12px;
    transition: all 0.3s;
    user-select: none;
    cursor: pointer;
    z-index: 1;
}

.toggleBtn:hover {
    background-color: var(--color-lightgray-hover);
}


/* =============================
   📋 TABLE STYLES
============================= */

/* Containers */
.table-container {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 0px 12px rgba(0, 0, 0, 0.15);
    overflow: hidden;
}

/* Table Sizes */
.small-table table {
    width: 340px;
    table-layout: fixed;
    border-collapse: collapse;
}

.large-table table {
    width: 700px;
    table-layout: fixed;
    border-collapse: collapse;
}

/* Header Cells */
th {
    padding: 12px 25px;
    font-weight: 600;
    color: black;
    border-bottom: 1px solid var(--color-border);
}

.name-col {
    text-align: left;
    padding-right: 0;
    width: 160px;
}

.availability-col {
    text-align: center;
    padding-right: 12px;
}

.subject-name-col {
    text-align: left;
    padding-right: 0;
}

/* Table Body Cells */
td {
    padding: 12px 25px;
    border-bottom: 1px solid var(--color-border);
}

.center {
    text-align: center;
}

.truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}


/* =============================
   🗓️ SCHEDULE GRID
============================= */
.schedule-grid {
    display: grid;
    grid-template-columns: minmax(140px, 0.8fr) repeat(6, 1fr);
    grid-auto-rows: auto;
    text-align: center;
    border-collapse: collapse;
}

/* Header Row */
.day,
.time-label {
    border: 1px solid rgba(179, 179, 179, 0.6);
    background-color: #009CC6;
    color: white;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 45px;
}

.time-label {
    background-color: #3571B7;
}

/* Time Column */
.time {
    height: 95px;
    border: 1px solid rgba(179, 179, 179, 0.6);
    background-color: #6799C8;
    color: white;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all ease 0.1s;
}

.time:hover {
    background-color: #497dad;
}

/* Default Cell */
.cell {
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(179, 179, 179, 0.6);
    text-align: left;
    padding: 10px;
    font-size: 14px;
    cursor: pointer;
    transition: all ease 0.1s;
    min-width: 135px;
}

.cell > p:nth-of-type(1) {
    margin-left: auto;
}

.cell > p:nth-of-type(2) {
    font-weight: 600; 
    font-size: 0.90rem;
    margin-top: auto;
    margin-bottom: 2px;
}

.cell:hover {
    background-color: var(--color-lightgray-hover);
}

/* Highlight Filled Cells */
.cell:not(:empty) {
    background-color: #dff0d8;
    border-color: #b2d8b2;
    color: #333;
    transition: all ease 0.1s;
}

/* Highlight Filled Cells */
.cell:not(:empty):hover {
    background-color: #cadfc2;
}

/* =============================
    EDIT TIME MODAL
============================= */
.edit-time-modal-content {
    display: flex;
    flex-direction: column;
    background-color: white;
    height: auto;
    max-height: 90vh;
    align-items: center;
    padding-top: 27px;
    padding-bottom: 30px;
    padding-left: 0; 
    padding-right: 0;
    width: auto;
    box-shadow: -2px 0 8px rgba(0,0,0,0.2);
    border-radius: 6px;
    gap: 35px;
    overflow-y: auto;
}

/* =============================
    ADD SCHEDULE MODAL
============================= */
.add-schedule-modal-content {
    display: flex;
    flex-direction: column;
    background-color: white;
    height: auto;
    max-height: 90vh;
    align-items: center;
    padding: 36px;
    width: 450px;
    box-shadow: -2px 0 8px rgba(0,0,0,0.2);
    border-radius: 6px;
    gap: 20px;
    overflow-y: auto;
}

.add-schedule-modal-content input {
    width: 100%;
    box-sizing: border-box;
}

.logs {
    display: flex; 
    flex-direction: column; 
    background-color: var(--color-main-background);
    width: 100%; 
    height: 120px; 
    overflow-y: auto; 
    min-height: 80px; 
    border-radius: 6px; 
    margin-top: 6px; 
    border: 1px solid var(--color-border);
    padding-left: 16px; 
    padding-right: 16px; 
    padding-top: 8px; 
    padding-bottom: 8px; 
    box-sizing: border-box;
}
</style>