<script setup>
//#region 📦 IMPORTS
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue'
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
const isVisibleDeleteModal = ref(false)
const isVisibleBackBtnModal = ref(false)
const nextRoute = ref(null)
const skipGuardOnce = ref(false)

const showErrorInput = ref(false)
const subjectInputFocused = ref(false)
const roomInputFocused = ref(false)
const teacherInputFocused = ref(false)
const subjectWrapper = ref()
const roomWrapper = ref()
const teacherWrapper = ref()

const days = ['Mon', 'Tue', 'Wed', 'Thurs', 'Fri', 'Sat']

// For tracking clicked cell
const activeCell = ref({ day: null, time: null })
const clickedDay = ref(null)
const clickedTime = ref(null)

// Edit Time Modal
const inputStartTime = ref('')
const inputEndTime = ref('')

// Add Schedule Modal
const labelDayASModal = ref('')
const labelTimeASModal = ref('')
const inputSubject = ref('')
const subjectType = ref('')
const subjectTypeOptions = ref([])
const inputRoom = ref('')
const inputTeacher = ref('')
const logs = ref([])
const logsContainer = ref(null)

const fetchedScheduleBackup = ref(null);

const isDeleteScheduleVisible = ref(false)

const isInputSubjectOk = ref(false)
const isInputRoomOk = ref(false)
const isInputTeacherOk = ref(false)

// Fetched Data from DB
const scheduleAssignmentDB = ref([])
const courseSubjectsDB = ref([]) // Filtered subjects base on year and semester
const roomsDB = ref([])
const sectionsDB = ref([])
const teachersDB = ref([])
const teacherSubjectsDB = ref([])
const teacherAvailabilityDB = ref([])

// SCHEDULE DATA
const schedule = ref({})
const times = ref([])
const defaultTimes = [
  '07:00-10:00',
  '10:00-13:00',
  '13:00-14:00',
  '14:00-17:00'
].map(parseTimeRange)
//#endregion


//#region FETCHED DATA FROM DB
const fetchScheduleAssignments = async () => {
  try {
    const response = await fetch('http://localhost:3000/get-all-schedules')
    if (!response.ok) throw new Error('Failed to fetch rooms')
      scheduleAssignmentDB.value = await response.json()

      console.log('Fetched all schedules from DB: ', scheduleAssignmentDB.value)
  } catch (err) {
    console.error('Error fetching rooms:', err)
  }
}

const fetchSectionScheduleAssignments = async () => {
  try {
    const res = await axios.get(`http://localhost:3000/get-schedule/${selectedSection.value.section_id}`)
    if (res.data.success) {
      schedule.value = res.data.schedule // assign the fetched object to schedule.value
      originalSchedule.value = JSON.parse(JSON.stringify(schedule.value)) // ← keep original for back btn
      console.log('Fetched schedule:', schedule.value)
    } else {
      console.warn('No schedule found for this section')
      schedule.value = {} // reset if nothing found
    }
  } catch (err) {
    console.error('Error fetching schedule:', err)
  } 
}

const fetchTimeColumn = async () => {
  try {
    const res = await axios.get(`http://localhost:3000/get-times/${selectedSection.value.section_id}`)
    if (res.data.success && res.data.times.length > 0) {
      times.value = res.data.times.map(t => ({ start: t.start_time, end: t.end_time }));
      originalTimes.value = JSON.parse(JSON.stringify(times.value)) // ← keep original for back btn
    } else {
      // Use default times if nothing returned
      times.value = defaultTimes
      originalTimes.value = JSON.parse(JSON.stringify(defaultTimes));
    }
  } catch (err) {
    console.error('Error fetching times:', err)
    // Use default times if error occurs
    times.value = defaultTimes
  }
}

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

    console.log('Fetched courseSubjects from DB: ', courseSubjectsDB.value)

  } catch (err) {
    console.error("Error fetching subjects:", err);
  }
};

const fetchRooms = async () => {
  try {
    const response = await fetch('http://localhost:3000/rooms')
    if (!response.ok) throw new Error('Failed to fetch rooms')
      roomsDB.value = await response.json()

      console.log('Fetched rooms from DB: ', roomsDB.value)
  } catch (err) {
    console.error('Error fetching rooms:', err)
  }
}

const fetchSections = async () => {
  try {
    const response = await fetch('http://localhost:3000/sections')
    if (!response.ok) throw new Error('Failed to fetch sections')
      sectionsDB.value = await response.json()

      console.log('Fetched sections from DB: ', sectionsDB.value)
  } catch (err) {
    console.error('Error fetching sections:', err)
  }
}

const fetchTeachers = async () => {
try {
    const res = await axios.get("http://localhost:3000/teachers")

    teachersDB.value = res.data.map(teacher => ({
        teacher_id: teacher.teacher_id,
        faculty_id: teacher.faculty_id,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        departments: teacher.departments,
        subjects: teacher.subjects,
        availability: teacher.availability
    }));

} catch (err) {
    console.error("Error fetching teachers:", err)
}
}

const fetchTeacherSubjects = async () => {
  try {
    const res = await axios.get("http://localhost:3000/teacher-subjects");
    if (res.data.success) {
      teacherSubjectsDB.value = res.data.data;
    }
  } catch (err) {
    console.error("Error fetching teacher subjects:", err);
  }
}

const fetchTeacherAvailability = async () => {
  try {
    const res = await axios.get("http://localhost:3000/teacher-availability");

    // Assign the array directly
    teacherAvailabilityDB.value = res.data; 

    // Logs
    console.log('Teacher Availability DB (reactive array):', teacherAvailabilityDB.value)
  } catch (err) {
    console.error("Error fetching teacher availability:", err);
  }
}


//#endregion


//#region 🕒 TIME CONVERSION UTILITIES
// 🔹 Converts "7:00" → 420, "1:30" → 90, etc.
function toMinutes(timeStr) {
  if (typeof timeStr === 'number') return timeStr // already in minutes
  if (typeof timeStr !== 'string') return 0 // fallback for null or undefined

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


//#region Filtered Data

// Filtered Subjects for Subjects Table (ignores inputSubject)
const filteredSubjectsForSubjectsTable = computed(() => {
  // Step 1️⃣: Take all subjects from DB
  let subjects = [...courseSubjectsDB.value]; // clone to avoid reactive issues

  // Step 2️⃣: Count scheduled occurrences of each subject
  const subjectCount = {}; // { "Math": 2, "Physics": 1 }

  Object.values(schedule.value).forEach(daySchedule => {
    Object.values(daySchedule).forEach(entry => {
      const subjName = entry.subject;
      if (!subjectCount[subjName]) subjectCount[subjName] = 0;
      subjectCount[subjName]++;
    });
  });

  // Step 3️⃣: Filter out subjects that have already appeared enough times
  const finalSubjects = subjects.filter(subj => {
    const maxCount = (subj.lecture > 0 && subj.laboratory > 0) ? 2 : 1;
    return (subjectCount[subj.subject_name] || 0) < maxCount;
  });

  return finalSubjects; // ✅ Only subjects that haven't reached max schedule
});

// Filtered Subjects For Add Schedule Modal
const filteredSubjects = computed(() => {
  // Step 1️⃣: Base list filtered by input search
  let subjects = inputSubject.value
    ? courseSubjectsDB.value.filter(csubj =>
        csubj.subject_name.toLowerCase().includes(inputSubject.value.toLowerCase())
      )
    : [...courseSubjectsDB.value]; // clone to avoid reactive issues

  // Step 2️⃣: Count scheduled occurrences of each subject
  const subjectCount = {}; // { "Math": 2, "Physics": 1 }

  Object.values(schedule.value).forEach(daySchedule => {
    Object.values(daySchedule).forEach(entry => {
      const subjName = entry.subject;
      if (!subjectCount[subjName]) subjectCount[subjName] = 0;
      subjectCount[subjName]++;
    });
  });

  // Step 3️⃣: Filter out subjects that have already appeared enough times
  const finalSubjects = subjects.filter(subj => {
    const maxCount = (subj.lecture > 0 && subj.laboratory > 0) ? 2 : 1;
    return (subjectCount[subj.subject_name] || 0) < maxCount;
  });

  return finalSubjects;
});

// ✅ Filtered Teachers for Teachers Table (ignores inputSubject)
const filteredTeachersForTeachersTable = computed(() => {
  // Step 1️⃣: Get the filtered subjects that ignore inputSubject
  const availableSubjects = filteredSubjectsForSubjectsTable.value;

  // Step 2️⃣: Extract subject IDs that are still available
  const availableSubjectIds = availableSubjects.map(s => s.subject_id);

  // Step 3️⃣: Return teachers who teach at least one available subject
  const finalTeachers = teachersDB.value.filter(teacher => {
    const teacherSubjects = teacherSubjectsDB.value.filter(
      ts => ts.teacher_id === teacher.teacher_id
    );

    // Check if any of the teacher's subjects are still available
    return teacherSubjects.some(ts => availableSubjectIds.includes(ts.subject_id));
  });

  return finalTeachers;
});

// Filtered Rooms
const filteredRooms = computed(() => {
  if (!roomsDB.value) return []

  const searchTerm = inputRoom.value.trim().toLowerCase()
  const hasTimeAndDay =
    clickedTime.value &&
    clickedTime.value.start != null &&
    clickedTime.value.end != null &&
    clickedDay.value

  // Map each room with occupancy info
  const roomsWithStatus = roomsDB.value.map(room => {
    let isOccupied = false
    let occupiedBy = null

    if (hasTimeAndDay) {
      try {
        const selectedDay = clickedDay.value.toLowerCase()
        const newStart = clickedTime.value.start
        const newEnd = clickedTime.value.end

        const roomSchedules = scheduleAssignmentDB.value.filter(
          sch =>
            sch.room_id === room.room_id &&
            sch.day_of_week.toLowerCase() === selectedDay
        )

        const conflict = roomSchedules.find(sch => {
          const start = Number(sch.start_time)
          const end = Number(sch.end_time)
          return newStart < end && newEnd > start
        })

        if (conflict) {
          const section =
            sectionsDB.value.find(sec => sec.section_id === conflict.section_id)
          const sectionName = section?.section_format || "Unknown section"

          // ✅ If the conflict is in current editing section. do NOT mark as occupied
          if (sectionName !== selectedSection.value.section_format) {
            isOccupied = true
            occupiedBy = sectionName
          }
        }
      } catch (error) {
        console.error(`Error checking room ${room.room_code}:`, error)
      }
    }

    return { ...room, isOccupied, occupiedBy }
  })

  // Apply search filter
  const filtered = roomsWithStatus.filter(r =>
    r.room_code.toLowerCase().includes(searchTerm)
  )

  // Sort available rooms first
  const sorted = filtered.sort((a, b) => a.isOccupied - b.isOccupied)

  return sorted
})

// Filtered Teachers based on subject, availability, and time conflicts.
const filteredTeachersByInputSubject = computed(() => {
  if (!teachersDB.value) return []

  const rawInput = inputSubject.value?.trim().toLowerCase()
  const hasTimeAndDay =
    clickedTime.value &&
    clickedTime.value.start != null &&
    clickedTime.value.end != null &&
    clickedDay.value

  if (!rawInput || !hasTimeAndDay) return []

  const subjectName = rawInput.replace(/\(lec\)|\(lab\)/gi, '').trim()

  // ✅ Make sure subject exists in course-subjects list
  const matchedInCourseSubjects = filteredSubjectsForSubjectsTable.value.find(s =>
    s.subject_name?.toLowerCase().trim() === subjectName
  )
  if (!matchedInCourseSubjects) return []

  const selectedDay = clickedDay.value.toLowerCase()
  const newStart = clickedTime.value.start
  const newEnd = clickedTime.value.end

  // Map each teacher with occupancy info
  const teachersWithStatus = teachersDB.value
    .map(teacher => {
      let isOccupied = false
      let occupiedBy = null

      try {
        // 1️⃣ Check if teacher teaches the subject
        const teacherSubjects = teacherSubjectsDB.value.filter(
          ts => ts.teacher_id === teacher.teacher_id
        )

        const hasSubject = teacherSubjects.some(ts => {
          const cleanSubjectName = ts.subject_name
            ?.toLowerCase()
            .replace(/\(lec\)|\(lab\)/gi, '')
            .trim()
          return cleanSubjectName === subjectName
        })

        if (!hasSubject) return null

        // 2️⃣ Check availability
        const availability = teacherAvailabilityDB.value.filter(
          t => t.teacher_id === teacher.teacher_id
        )

        const day = dayMap[clickedDay.value] // e.g. "Mon" → "Monday"
        const start = clickedTime.value.start
        const end = clickedTime.value.end

        const isAvailable = availability.some(avail => {
          if (avail.day_of_week !== day) return false
          const availStart = toMinutes(avail.time_from || '00:00')
          const availEnd = toMinutes(avail.time_to || '23:59')
          return start >= availStart && end <= availEnd
        })

        if (!isAvailable) return null

        // 3️⃣ Check for schedule conflicts (same as room logic)
        const teacherSchedules = scheduleAssignmentDB.value.filter(
          sch =>
            sch.teacher_id === teacher.teacher_id &&
            sch.day_of_week.toLowerCase() === selectedDay
        )

        const conflict = teacherSchedules.find(sch => {
          const start = Number(sch.start_time)
          const end = Number(sch.end_time)
          return newStart < end && newEnd > start // ⏰ overlap
        })

        if (conflict) {
          const section =
            sectionsDB.value.find(sec => sec.section_id === conflict.section_id)
          const sectionName = section?.section_format || 'Unknown section'

          // ✅ If the conflict is in the current editing section, don't mark as occupied
          if (sectionName !== selectedSection.value.section_format) {
            isOccupied = true
            occupiedBy = sectionName
          }
        }
      } catch (error) {
        console.error(`Error checking teacher ${teacher.last_name}:`, error)
      }

      return { ...teacher, isOccupied, occupiedBy }
    })
    .filter(Boolean) // remove nulls

  // 🔎 Apply name search (optional)
  const searchTerm = inputTeacher.value?.trim().toLowerCase() || ''
  const filtered = teachersWithStatus.filter(t => {
    const fullName = `${t.last_name}, ${t.first_name}`.toLowerCase()
    return fullName.includes(searchTerm)
  })

  // 🔹 Sort available teachers first (same as rooms)
  const sorted = filtered.sort((a, b) => a.isOccupied - b.isOccupied)

  return sorted
})


// 🧩 Disable teacher input if there are no matching teachers
const isTeacherInputDisabled = ref(true)
//#endregion


//#region 🧮 EDIT TIME MODAL
function toggleEditTimeModal(which, time) {
  if (which === 'update') {
    clickedTime.value = time
    isVisibleEditTimeModal.value = true

    // ✅ Handle nulls
    inputStartTime.value = time.start !== null ? toHHMM(time.start) : ''
    inputEndTime.value = time.end !== null ? toHHMM(time.end) : ''

    console.log(inputStartTime.value)
    return
  }

  if (which === 'cancel') {
    isVisibleEditTimeModal.value = false

    setTimeout(() => {
      inputStartTime.value = ''
      inputEndTime.value = ''
    }, 100)
    
    clickedTime.value = null
    return
  }
}

function editTimeConfirm() {
  // ✅ Check if start and end times are provided
  if (!inputStartTime.value || !inputEndTime.value) {
    alert('Please enter both start and end times.')
    return
  }

  // ✅ Check if a time slot is selected
  if (!clickedTime.value) {
    alert('No time slot selected to update.')
    return
  }

  const newStart = toMinutes(inputStartTime.value)
  const newEnd = toMinutes(inputEndTime.value)

  // ✅ Check if the new time is the same as the old time
  if (newStart === clickedTime.value.start && newEnd === clickedTime.value.end) {
    toggleEditTimeModal('cancel')
    return
  }

  // ✅ Check if end time is after start time
  if (newEnd <= newStart) {
    alert('End time must be later than start time.')
    return
  }

  // ⚠️ Find the index in the reactive times array
  const index = times.value.findIndex(
    t => t.start === clickedTime.value.start && t.end === clickedTime.value.end
  )

  if (index === -1) {
    console.warn('⚠️ Could not find the clicked time range to update.')
    toggleEditTimeModal('cancel')
    return
  }

  // ✅ Check if this row already has content (for this time slot)
  const oldRangeStr = `${formatTime(clickedTime.value.start)}-${formatTime(clickedTime.value.end)}`
  let hasContent = false
  for (const day of Object.keys(schedule.value)) {
    const daySchedule = schedule.value[day]
    if (daySchedule && daySchedule[oldRangeStr] && Object.keys(daySchedule[oldRangeStr]).length > 0) {
      hasContent = true
      break
    }
  }

  if (hasContent) {
    alert('⚠️ This time slot already has scheduled content and cannot be edited.')
    return
  }

  // ⚠️ Check for overlapping/conflicting times
  const hasConflict = times.value.some((t, i) => {
    if (i === index) return false // skip the currently edited time slot
    return newStart < t.end && newEnd > t.start
  })

  if (hasConflict) {
    alert('⚠️ The time range overlaps with another existing time slot.')
    return
  }

  // ✅ Update the times array
  times.value[index] = { start: newStart, end: newEnd }

  // ✅ Update schedule keys using the old range
  for (const day of Object.keys(schedule.value)) {
    const daySchedule = schedule.value[day]
    if (daySchedule && daySchedule[oldRangeStr]) {
      const newRangeStr = `${formatTime(newStart)}-${formatTime(newEnd)}`
      daySchedule[newRangeStr] = daySchedule[oldRangeStr]
      delete daySchedule[oldRangeStr]
    }
  }

  // ✅ Automatically sort from earliest to latest
  times.value.sort((a, b) => a.start - b.start)
  console.log('✅ Sorted times:', times.value)

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
  'Thurs': 'Thursday',
  'Fri': 'Friday',
  'Sat': 'Saturday',
  'Sun': 'Sunday'
};

function handleCellClick(day, time) {
    clickedDay.value = day
    clickedTime.value = time // Object {start, end} minutes

    labelDayASModal.value = dayMap[day]
    labelTimeASModal.value = `${formatTime12Hour(time.start)} - ${formatTime12Hour(time.end)}`;

    const rangeStr = `${formatTime(time.start)}-${formatTime(time.end)}`;

    // ✅ Check if there's already data for this day and time
    if (schedule.value[day] && schedule.value[day][rangeStr]) {
      // Open Modal
      toggleAddScheduleModal()
      activeCell.value = { day, time }
      isDeleteScheduleVisible.value = true
      

      const existingData = schedule.value[day][rangeStr]

      // ✅ Fetch subject value (and others if needed)
      inputSubject.value = existingData.subject || ''
      inputTeacher.value = existingData.teacher || ''
      inputRoom.value = existingData.room || ''
      subjectType.value = existingData.type || ''

      // ✅ Backup the schedule before deleting (for restore)
      fetchedScheduleBackup.value = {
        day,
        rangeStr,
        data: { ...existingData }
      };

      // ✅ Delete from current schedule for watchers functions.
      delete schedule.value[day][rangeStr];
      if (Object.keys(schedule.value[day]).length === 0) {
        delete schedule.value[day];
      }

      // Sets a delay on Reset Logs
      
      setTimeout(() => {
        logs.value = []
        logs.value.push({
          message: `Fetched Schedule.`,
          color: 'Green'
        })
      }, 20);
      

    } else {
      toggleAddScheduleModal()
      resetInputs()
    }
}

function isCellActive(day, time) {
  return (
    activeCell.value.day === day &&
    activeCell.value.time.start === time.start &&
    activeCell.value.time.end === time.end
  )
}

// ✅ RESTORE / CANCEL BUTTON
function cancelScheduleBtn() {
  // Restore deleted schedule if there's a backup
  if (fetchedScheduleBackup.value) {
    // Close the modal
    toggleAddScheduleModal()

    const { day, rangeStr, data } = fetchedScheduleBackup.value;

    // Ensure day object exists
    if (!schedule.value[day]) {
      schedule.value[day] = {};
    }

    resetInputs()

    // Restore the deleted data
    schedule.value[day][rangeStr] = data;

    // Clear backup
    fetchedScheduleBackup.value = null;
  } else {
    toggleAddScheduleModal()
  }
}

function deleteSchedule() {
  toggleDeleteModal()
}

function confirmDelete(){
  toggleDeleteModal()
  toggleAddScheduleModal()
}

function toggleDeleteModal() {
  isVisibleDeleteModal.value = !isVisibleDeleteModal.value
}

function selectSubject(csubj) {
  inputSubject.value = csubj.subject_name
  subjectInputFocused.value = false
}

function selectRoom(room) {
  inputRoom.value = room.room_code
  roomInputFocused.value = false
}

function selectTeacher(tchrs) {
  inputTeacher.value = tchrs.last_name + ', ' + tchrs.first_name
  teacherInputFocused.value = false
}

// ✅ Watcher for input subject with availability + duration check
watch([filteredTeachersByInputSubject, inputSubject], ([newTeachers, newSubject]) => {
  // ────────────────────────────────────────────────
  // 🟤 CASE 1: Input is empty → reset everything
  // ────────────────────────────────────────────────
  if (!newSubject || newSubject.trim() === '') {
    subjectTypeOptions.value = []
    subjectType.value = ''
    if (isInputSubjectOk.value) {
      isInputSubjectOk.value = false
      console.log('isInputSubjectOk:', isInputSubjectOk.value)
    }
    return
  }

  // ────────────────────────────────────────────────
  // 🟣 Find matching subject from subjects table
  // ────────────────────────────────────────────────
  const matchedSubject = filteredSubjectsForSubjectsTable.value.find(
    s => s.subject_name.toLowerCase() === newSubject.trim().toLowerCase()
  )

  if (!matchedSubject) {
    // No match → reset fields
    subjectTypeOptions.value = []
    subjectType.value = ''
    isInputSubjectOk.value = false
    isTeacherInputDisabled.value = true
    console.log('isInputSubjectOk:', isInputSubjectOk.value)
    return
  }

  if(matchedSubject){
    if (!isInputSubjectOk.value) {
      isInputSubjectOk.value = true
      isTeacherInputDisabled.value = false
      console.log('isInputSubjectOk:', isInputSubjectOk.value)
    }
  }

  // ────────────────────────────────────────────────
  // 🔵 Compute durations and time range
  // ────────────────────────────────────────────────
  const selectedDuration = clickedTime.value
    ? clickedTime.value.end - clickedTime.value.start
    : 0

  const timeRange = clickedTime.value
    ? `${formatTime12Hour(clickedTime.value.start)} - ${formatTime12Hour(clickedTime.value.end)}`
    : ''

  const lectureDuration = matchedSubject.lecture ? matchedSubject.lecture * 60 : 0
  const labDuration = matchedSubject.laboratory ? matchedSubject.laboratory * 60 : 0

  const canFitLecture = lectureDuration > 0 && selectedDuration === lectureDuration
  const canFitLab = labDuration > 0 && selectedDuration === labDuration

  // ────────────────────────────────────────────────
  // 🟢 Build subject type options (Lec / Lab)
  // ────────────────────────────────────────────────
  let options = []
  if (lectureDuration > 0) options.push({ label: 'Lec', disabled: !canFitLecture })
  if (labDuration > 0) options.push({ label: 'Lab', disabled: !canFitLab })

  const latestLog = logs.value.at(-1)?.message

  // ────────────────────────────────────────────────
  // Helper: Check if a subject type is already in the schedule
  // ────────────────────────────────────────────────
  const isAlreadyScheduled = (subjectName, type) => {
    for (const day in schedule.value) {
      for (const range in schedule.value[day]) {
        const entry = schedule.value[day][range]
        if (
          entry.subject.toLowerCase() === subjectName.trim().toLowerCase() &&
          entry.type === type
        ) {
          return true
        }
      }
    }
    return false
  }

  // ────────────────────────────────────────────────
  // 🔴 Log duration mismatches
  // ────────────────────────────────────────────────
// ✅ Lecture check
  if (!canFitLecture && lectureDuration > 0) {
    // Check if the Lecture component is already in the schedule
    if (!isAlreadyScheduled(newSubject, 'Lec')) {
      const msg = `Lecture: requires ${matchedSubject.lecture} hrs (selected: ${selectedDuration / 60} hrs)`

      // Check recent logs one by one
      let exists = false
      for (let i = logs.value.length - 1; i >= 0; i--) {
        if (logs.value[i].message === msg) {
          exists = true
          break
        }
      }

      if (!exists) {
        logs.value.push({ message: msg, color: 'red' })
      }
    }
  }

  // ✅ Laboratory check
  if (!canFitLab && labDuration > 0) {
    // Check if the Laboratory component is already in the schedule
    if (!isAlreadyScheduled(newSubject, 'Lab')) {
      const msg = `Laboratory: requires ${matchedSubject.laboratory} hrs (selected: ${selectedDuration / 60} hrs)`

      // Check recent logs one by one
      let exists = false
      for (let i = logs.value.length - 1; i >= 0; i--) {
        if (logs.value[i].message === msg) {
          exists = true
          break
        }
      }

      if (!exists) {
        logs.value.push({ message: msg, color: 'red' })
      }
    }
  }

  // ────────────────────────────────────────────────
  // 🔴 If both can't fit → stop here
  // ────────────────────────────────────────────────
  if (!canFitLecture && !canFitLab) {
    subjectTypeOptions.value = []
    subjectType.value = ''
    isInputSubjectOk.value = false
    isTeacherInputDisabled.value = true
    return
  }

  // ────────────────────────────────────────────────
  // 🟣 Disable options already used in schedule
  // ────────────────────────────────────────────────
  for (const day in schedule.value) {
    for (const range in schedule.value[day]) {
      const entry = schedule.value[day][range]
      if (entry.subject.toLowerCase() === newSubject.trim().toLowerCase()) {
        const opt = options.find(o => o.label === entry.type)
        if (opt) opt.disabled = true
      }
    }
  }

  // ────────────────────────────────────────────────
  // 🟠 Handle enabled/disabled subject type options
  // ────────────────────────────────────────────────
  subjectTypeOptions.value = options
  const firstEnabled = options.find(o => !o.disabled)
  subjectType.value = firstEnabled ? firstEnabled.label : ''

  const allDisabled = options.length > 0 && options.every(o => o.disabled)

  // 🟥 If all options disabled → reset everything
  if (allDisabled) {
    subjectTypeOptions.value = []
    subjectType.value = ''
    isInputSubjectOk.value = false
    isTeacherInputDisabled.value = true
    console.log('All options disabled → subject reset')
    return
  }

  // 🟩 If some options are available → log as selected
  if (!allDisabled) {
    const enabledLabels = options.filter(o => !o.disabled).map(o => o.label).join(', ')
    const msg = `${matchedSubject.subject_name} (${enabledLabels}) Selected.`

    // Check recent logs one by one from the end
    let exists = false
    for (let i = logs.value.length - 1; i >= 0; i--) {
      if (logs.value[i].message === msg) {
        exists = true
        break
      }
    }

    if (!exists) {
      logs.value.push({ message: msg, color: 'green' })
    }
  }
})

// ✅ Watcher for input room
watch([filteredRooms, inputRoom], ([newFilteredRooms, newRoom]) => {
  if (!newRoom || newRoom.trim() === '') {
    if (isInputRoomOk.value) {
      isInputRoomOk.value = false
      console.log('isInputRoomOk:', isInputRoomOk.value)
    }
    return
  }

  const latestLog = logs.value.at(-1)?.message

  const matchedRoom = newFilteredRooms.find(
    r => r.room_code.toLowerCase() === newRoom.toLowerCase()
  )

  if (matchedRoom) {
    // 🧠 Room exists in filtered list
    if (matchedRoom.isOccupied) {
      // 🚫 Room is occupied — show red log
      const message = `${matchedRoom.room_code} is occupied by ${matchedRoom.occupiedBy}.`
      if (latestLog !== message) {
        logs.value.push({
          message,
          color: 'red'
        })
      }

      if (isInputRoomOk.value) {
        isInputRoomOk.value = false
        console.log('isInputRoomOk:', isInputRoomOk.value)
      }
    } else {
      // ✅ Room available — normal log
      const message = `Room ${matchedRoom.room_code} selected.`
      if (latestLog !== message) {
        logs.value.push({
          message,
          color: 'blue'
        })
      }

      if (!isInputRoomOk.value) {
        isInputRoomOk.value = true
        console.log('isInputRoomOk:', isInputRoomOk.value)
      }
    }
  } else {
    // Input changed but no match found
    if (isInputRoomOk.value) {
      isInputRoomOk.value = false
      console.log('isInputRoomOk:', isInputRoomOk.value)
    }
  }
})

// ✅ Watcher for input teacher
watch([filteredTeachersByInputSubject, inputTeacher], ([newFilteredTeachers, newTeacher]) => {
  if (!newTeacher || newTeacher.trim() === '') {
    if (isInputTeacherOk.value) {
      isInputTeacherOk.value = false
      console.log('isInputTeacherOk:', isInputTeacherOk.value)
    }
    return
  }

  const latestLog = logs.value.at(-1)?.message

  // Normalize teacher name for exact match
  const matchedTeacher = newFilteredTeachers.find(t => {
    const fullName = `${t.last_name}, ${t.first_name}`.toLowerCase().trim()
    return fullName === newTeacher.toLowerCase().trim()
  })

  if (matchedTeacher) {
    if (matchedTeacher.isOccupied) {
      // 🚫 Teacher is occupied — show red log
      const message = `${matchedTeacher.last_name}, ${matchedTeacher.first_name} is occupied by ${matchedTeacher.occupiedBy}.`
      if (latestLog !== message) {
        logs.value.push({
          message,
          color: 'red'
        })
      }

      if (isInputTeacherOk.value) {
        isInputTeacherOk.value = false
        console.log('isInputTeacherOk:', isInputTeacherOk.value)
      }
    } else {
      // ✅ Teacher available — normal log
      const message = `Teacher ${matchedTeacher.last_name}, ${matchedTeacher.first_name} selected.`
      if (latestLog !== message) {
        logs.value.push({
          message,
          color: 'blue'
        })
      }

      if (!isInputTeacherOk.value) {
        isInputTeacherOk.value = true
        console.log('isInputTeacherOk:', isInputTeacherOk.value)
      }
    }
  } else {
    // Input changed but no exact match found
    if (isInputTeacherOk.value) {
      isInputTeacherOk.value = false
      console.log('isInputTeacherOk:', isInputTeacherOk.value)
    }
  }
})

// Watch logs and scroll to bottom on update
watch(
  logs,
  async () => {
    await nextTick() // wait for DOM update
    if (logsContainer.value) {
      logsContainer.value.scrollTop = logsContainer.value.scrollHeight
    }
  },
  { deep: true } // 🔹 important for array mutations
)

// watcher for confirm status
watch([isInputSubjectOk, isInputRoomOk, isInputTeacherOk], ([subjectOk, roomOk, teacherOk]) => {
  // Check if all are true
  if (subjectOk && roomOk && teacherOk) {
    // Avoid duplicate log if the latest message is already the same
    const latestLog = logs.value.at(-1)?.message
    if (latestLog !== 'No conflicts. You may confirm.') {
      logs.value.push({
        message: 'Validation complete — no issues detected.',
        color: 'green'
      })
    }
  }
})

function handleClickOutside(event) {
    if (subjectWrapper.value && !subjectWrapper.value.contains(event.target)) {
        subjectInputFocused.value = false
    }

    if (roomWrapper.value && !roomWrapper.value.contains(event.target)) {
        roomInputFocused.value = false
    }

    if (teacherWrapper.value && !teacherWrapper.value.contains(event.target)) {
        teacherInputFocused.value = false
    }
}

onMounted(() => {
    document.addEventListener('mousedown', handleClickOutside)
})

onBeforeUnmount(() => {
    document.removeEventListener('mousedown', handleClickOutside)
})

function toggleAddScheduleModal() {
  isVisibleAddScheduleModal.value = !isVisibleAddScheduleModal.value;

  if (isVisibleAddScheduleModal.value === false) {
    activeCell.value = { day: null, time: null }
  }

  isDeleteScheduleVisible.value = false
}

function resetInputs(){
    inputSubject.value = '';
    inputRoom.value = '';
    inputTeacher.value = '';
    logs.value = [];
    showErrorInput.value = false;
    fetchedScheduleBackup.value = null;
}


function addScheduleConfirm() {
  if (isInputSubjectOk.value && isInputRoomOk.value && isInputTeacherOk.value) {
    toggleAddScheduleModal()
    showErrorInput.value = false;
    
    const day = clickedDay.value
    const rangeStr = `${formatTime(clickedTime.value.start)}-${formatTime(clickedTime.value.end)}`


    // Initialize the day's schedule if it doesn't exist
    if (!schedule.value[day]) {
      schedule.value[day] = {}
    }

    // Determine the type: empty string if only 1 option, otherwise use selected type
    const typeValue = subjectTypeOptions.value.length === 1 ? '' : subjectType.value;

    // Add/update the schedule entry
    schedule.value[day][rangeStr] = {
      subject: inputSubject.value,
      room: inputRoom.value,
      teacher: inputTeacher.value,
      type: typeValue
    }

    resetInputs()

  } else {
    showErrorInput.value = false
    setTimeout(() => { showErrorInput.value = true; }, 0);
  }
}

const saveScheduleToDB = async () => {
  // ✅ Check for null values in schedule.value before saving
  if (schedule.value) {
    for (const day in schedule.value) {
      for (const range in schedule.value[day]) {
        const entry = schedule.value[day][range];
        if (
          !entry ||
          entry.subject === "null" ||
          entry.room === "null" ||
          entry.teacher === "null"
        ) {
          alert("There shouldn't be null values in the schedule.");
          return; // stop saving
        }
      }
    }
  }
  
  const saveData = async (url, payload) => {
    try {
      const res = await axios.post(url, payload)
      if (res.data.success) {
        // ✅ Sync to prevent unsaved changes prompt
        originalSchedule.value = JSON.parse(JSON.stringify(schedule.value))
        originalTimes.value = JSON.parse(JSON.stringify(times.value))
      } else {
        alert('Failed to save')
        return
      }
    } catch (err) {
      console.error(`Error saving data to ${url}:`, err)
      alert('Error saving data')
    }
  }

  // Save schedule
  await saveData('http://localhost:3000/add-schedule', {
    section_id: selectedSection.value.section_id,
    schedule: schedule.value
  })

  // Save times
  await saveData('http://localhost:3000/add-times', {
    section_id: selectedSection.value.section_id,
    times: times.value.map(t => ({ start: t.start, end: t.end }))
  })

  // 3️⃣ Determine schedule_status dynamically
  let scheduleStatus = 'Unset' // default

  if (Object.keys(schedule.value).length === 0) {
    scheduleStatus = 'Unset'
  } else if (filteredSubjectsForSubjectsTable.value.length === 0) {
    scheduleStatus = 'Complete'
  } else {
    scheduleStatus = 'Partially Set'
  }

  try {
    const res = await axios.put(
      `http://localhost:3000/update-schedule-status/${selectedSection.value.section_id}`,
      { schedule_status: scheduleStatus }
    )
    console.log("Schedule status updated:", res.data)
  } catch (err) {
    console.error("Error updating schedule status:", err)
    alert("Error saving data")
  }

  router.push(`/main/class-scheduling`)
};
//#endregion


//#region 🧭 ROUTER
const route = useRoute()
onMounted(() => {
  if (route.query.data) {
    selectedSection.value = JSON.parse(route.query.data)
    fetchScheduleAssignments()
    fetchSectionScheduleAssignments()
    fetchTimeColumn()
    fetchCourseSubjects(selectedSection.value.course_id)
    fetchRooms()
    fetchSections()
    fetchTeachers()
    fetchTeacherSubjects()
    fetchTeacherAvailability()
  }
})

const router = useRouter()

//#endregion


//#region 🧮 BACK BTN MODAL
const originalSchedule = ref({})
const originalTimes = ref([])

function hasUnsavedChanges() {

  const scheduleChanged = JSON.stringify(schedule.value) !== JSON.stringify(originalSchedule.value)
  const timesChanged = JSON.stringify(times.value) !== JSON.stringify(originalTimes.value)

  return scheduleChanged || timesChanged
}



function toggleBackBtnModal() {
  if (hasUnsavedChanges()) {
    isVisibleBackBtnModal.value = !isVisibleBackBtnModal.value
  } else {
    router.push('/main/class-scheduling')
  }
}

// 🔒 When user tries to leave the route
onBeforeRouteLeave((to, from, next) => {

  if (skipGuardOnce.value) {
    skipGuardOnce.value = false
    next()
    return
  }

  if (hasUnsavedChanges()) {
    isVisibleBackBtnModal.value = true
    nextRoute.value = to
    next(false)
  } else {
    next()
  }
})

function discardChanges() {
  isVisibleBackBtnModal.value = false

  // Reset unsaved state to avoid triggering the guard again
  skipGuardOnce.value = true

  if (nextRoute.value) {
    router.push(nextRoute.value.fullPath)
    nextRoute.value = null
  } else {
    router.push('/main/class-scheduling')
  }
}
//#endregion
</script>

<template>
    <div id="container">

        <header>
            <svg @click="toggleBackBtnModal" width="42" height="42" viewBox="0 0 61 61" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                                    }">Available Teachers</label>
                                
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
                                    <!-- Check if there are any teachers -->
                                    <tr v-if="filteredTeachersForTeachersTable.length === 0" style="">
                                        <td colspan="6" style="height: 40px; color: #444141; text-align: center;">--- No Teachers ---</td>
                                    </tr>

                                    <tr v-for="item in filteredTeachersForTeachersTable" :key="item.id">
                                        <td class="truncate"  :title="item.first_name + ', ' + item.last_name">{{ item.first_name + ', ' + item.last_name }}</td>
                                        <td class="truncate" :title="item.availability.replaceAll(/,\s*/g, '\n')">{{ item.availability }}</td>
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
                                    }">Unassigned Subjects</label>
                                
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
                                  <!-- show a message if no subjects -->
                                  <tr v-if="courseSubjectsDB.length === 0">
                                    <td colspan="4" class="center">No subjects for this section/year/semester.</td>
                                  </tr>

                                  <!-- show a message if all subjects assigned -->
                                  <tr
                                    v-if="courseSubjectsDB.length > 0 && filteredSubjectsForSubjectsTable.length === 0"
                                    style=""
                                  >
                                    <td colspan="6" style="height: 40px; color: #444141; text-align: center;">
                                      --- All Subjects Assigned ---
                                    </td>
                                  </tr>

                                  <tr v-for="subject in filteredSubjectsForSubjectsTable" :key="subject.id">
                                      <td class="center">{{ subject.subject_code }}</td>
                                      <td class="truncate">{{ subject.subject_name }}</td>
                                      <td class="center">
                                        {{ subject.laboratory > 0 && subject.lecture > 0 
                                          ? subject.lecture + ' hrs, ' + subject.laboratory + ' hrs' 
                                          : subject.laboratory > 0 
                                          ? subject.laboratory + ' hrs' 
                                          : subject.lecture + ' hrs' }}
                                      </td>
                                      <td class="center">
                                        {{ subject.laboratory > 0 && subject.lecture > 0 
                                          ? 'Lec, Lab' 
                                          : subject.laboratory > 0 
                                          ? 'Lab' 
                                          : 'Lec' }}
                                      </td>
                                  </tr>
                                </tbody>
                            </table>
                        </div>
                    </transition>
                </div>

                <!-- Save Button -->
                <button @click="saveScheduleToDB()" style="margin-left: auto; margin-top: auto;">Save</button>
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
                        @click="handleCellClick(day, time)"
                        :class="{ 'clicked-cell': isCellActive(day, time) }">
                        <template v-if="schedule[day] && schedule[day][`${formatTime(time.start)}-${formatTime(time.end)}`]">
                            <p>Room: {{ schedule[day][`${formatTime(time.start)}-${formatTime(time.end)}`].room }}</p>
                            <div style="display: flex; flex-direction: row; gap: 4px;">
                              <p>{{ schedule[day][`${formatTime(time.start)}-${formatTime(time.end)}`].subject }}</p>
                              <p>
                                {{ schedule[day][`${formatTime(time.start)}-${formatTime(time.end)}`].type 
                                  ? `(${schedule[day][`${formatTime(time.start)}-${formatTime(time.end)}`].type})` 
                                  : '' }}
                              </p>
                            </div>
                            <p>{{ schedule[day][`${formatTime(time.start)}-${formatTime(time.end)}`].teacher }}</p>
                            
                        </template>
                    </div>
                </template>
            </div>

            <!-- Add / Remove Buttons Below Table -->
            <div style="margin-top: 12px; display: flex; gap: 6px;">
                <button @click="addRow()" style="background-color: green; border: 1px solid green; color: white; padding: 6px 12px; border-radius: 4px;">Add Row</button>
                <button @click="removeRow()" style="background-color: #a83838; border: 1px solid #a83838; color: white; padding: 6px 12px; border-radius: 4px;">Remove Row</button>
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
            <div v-show="isVisibleAddScheduleModal" class="modal" style="z-index: 2;" @click.self="cancelScheduleBtn()">
               <div class="add-schedule-modal-content">
                    <div style="display: flex; flex-direction: column; margin-right: auto; gap: 4px;">
                        <h3 style="line-height: 0; margin: 10px 0; font-size: x-large;">{{ labelDayASModal }}</h3>
                        <label>{{ labelTimeASModal }}</label>
                    </div>
                        
                    <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; margin-bottom: 14px;">
                        <div style="display: flex; flex-direction: row; gap: 4px;">
                          <div style="flex: 1;">
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Subject</p>
                            <div style="position: relative; width: 100%;" ref="subjectWrapper">
                                <input v-model="inputSubject" 
                                        @focus="subjectInputFocused = true" 
                                        placeholder="Enter subject"
                                        :class="{ 'error-input-border': showErrorInput && !isInputSubjectOk }"></input>

                                <!-- Dropdown suggestions -->
                                <div v-if="subjectInputFocused" class="dropdown" style="z-index: 2;">
                                  <!-- Show subjects if any -->
                                  <div 
                                    v-for="(csubj, index) in filteredSubjects" 
                                    :key="csubj.subject_id" 
                                    @click="selectSubject(csubj)" 
                                    class="dropdown-item"
                                  >
                                    {{ csubj.subject_name }}
                                  </div>

                                  <!-- Show "No results" if empty -->
                                  <div 
                                    v-if="filteredSubjects.length === 0" 
                                    class="dropdown-item no-result"
                                    style="text-align: center; color: #7F8D9C; font-style: italic;">
                                    -- No results --
                                  </div>
                                </div>
                            </div>
                          </div>

                          <div>
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Type</p>
                            <select v-model="subjectType" 
                                    :disabled="!isInputSubjectOk" 
                                    style="width: 120px;">
                                <option v-for="opt in subjectTypeOptions" :key="opt.label" :value="opt.label" :disabled="opt.disabled">{{ opt.label }}</option>
                            </select>
                          </div>
                        </div>


                        <div>
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Room</p>
                            <div style="position: relative; width: 100%;" ref="roomWrapper">
                                <input v-model="inputRoom" 
                                        @focus="roomInputFocused = true"
                                        placeholder="Enter room"
                                        :class="{ 'error-input-border': showErrorInput && !isInputRoomOk }"></input>

                                <!-- Dropdown suggestions -->
                                <div v-if="roomInputFocused" class="dropdown" style="z-index: 2;">
                                  <!-- Show rooms if any -->
                                  <div 
                                    v-for="rm in filteredRooms" 
                                    :key="rm.room_id" 
                                    class="dropdown-item" 
                                    :class="{ 'occupied': rm.isOccupied }" 
                                    @click="selectRoom(rm)"
                                  >
                                    {{ rm.room_code }}
                                  </div>

                                  <!-- Show "No results" if empty -->
                                  <div 
                                    v-if="filteredRooms.length === 0" 
                                    class="dropdown-item no-result"
                                    style="text-align: center; color: #7F8D9C; font-style: italic;">
                                    -- No results --
                                  </div>
                                </div>

                            </div>
                        </div>

                        <div>
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Teacher</p>
                              <div style="position: relative; width: 100%;" ref="teacherWrapper">
                                <input v-model="inputTeacher"
                                        :disabled="isTeacherInputDisabled"
                                        @focus="teacherInputFocused = true"
                                        placeholder="Enter teacher"
                                        :class="{
                                          'error-input-border': showErrorInput && !isInputTeacherOk,
                                          'disabled-input-bg': isTeacherInputDisabled
                                        }"></input>

                                <!-- Dropdown suggestions -->
                                <div v-if="teacherInputFocused" class="dropdown" style="z-index: 2;">
                                  <!-- Show teachers if any -->
                                  <div 
                                    v-for="tchrs in filteredTeachersByInputSubject" 
                                    :key="tchrs.teacher_id" 
                                    class="dropdown-item" 
                                    :class="{ 'occupied': tchrs.isOccupied }" 
                                    @click="selectTeacher(tchrs)"
                                  >
                                    {{ tchrs.last_name + ', ' + tchrs.first_name }}
                                  </div>

                                  <!-- Show "No results" if empty -->
                                  <div 
                                    v-if="filteredTeachersByInputSubject.length === 0" 
                                    class="dropdown-item no-result"
                                    style="text-align: center; color: #7F8D9C; font-style: italic;">
                                    -- No results --
                                  </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Logs</p>
                            <div class="logs" ref="logsContainer">
                              <small v-for="(log, index) in logs" :key="index" :style="{ color: log.color }">
                                {{ log.message }}
                              </small>
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: row; width: 100%;">
                      <button v-show="isDeleteScheduleVisible" @click="deleteSchedule()" class="outlineBtn" style="font-size: 1.2rem; padding: 3px 6px;">
                          <i class='bx bx-trash'></i>
                      </button>
                      <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto;">
                          <button @click="cancelScheduleBtn()" class="cancelBtn">Cancel</button>
                          <button @click="addScheduleConfirm()">Confirm</button>
                      </div>
                    </div>

               </div>
            </div>
        </transition>

        <!-- Delete Schedule Modal -->
        <transition name="fade">
            <div v-show="isVisibleDeleteModal" class="modal" style="z-index: 3;" @click.self="toggleDeleteModal"> 
                <div class="delete-modal-content">
                    <div style="display: flex; flex-direction: column; width: 100%; gap: 24px;">
                        <div style="display: flex; flex-direction: row; gap: 10px; align-items: center; justify-content: start;">
                            <svg class="svg-icon" style="width: 2.5em; height: 2.5em; vertical-align: middle;fill: #b84343;overflow: hidden;" viewBox="188 129 648 784" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M779.3 228.2h-113v-35.4c0-34.9-28.4-63.3-63.3-63.3H425c-34.9 0-63.3 28.4-63.3 63.3v35.4h-113c-32.9 0-59.7 26.8-59.7 59.7v38.5c0 32.9 26.8 59.7 59.7 59.7h1.8v412.8c0 54.1 44 98.1 98.1 98.1h330.9c54.1 0 98.1-44 98.1-98.1V386.1h1.8c32.9 0 59.7-26.8 59.7-59.7v-38.5c-0.1-32.9-26.8-59.7-59.8-59.7z m-374.9-35.4c0-11.4 9.2-20.6 20.6-20.6h178c11.4 0 20.6 9.2 20.6 20.6v35.4H404.4v-35.4z m330.4 606c0 30.5-24.8 55.4-55.4 55.4H348.5c-30.5 0-55.4-24.8-55.4-55.4V386.1h441.7v412.7z m61.5-472.4c0 9.4-7.6 17-17 17H248.7c-9.4 0-17-7.6-17-17v-38.5c0-9.4 7.6-17 17-17h530.7c9.4 0 17 7.6 17 17v38.5z"  /><path d="M377.9 462.3h42.7v317.5h-42.7zM492.6 462.3h42.7v317.5h-42.7zM607.4 462.3h42.7v317.5h-42.7z"  /></svg>
                            <h3 style="line-height: 0; font-size: x-large; margin: 10px 0px;">Delete Confirmation</h3>
                        </div>
                        
                        <p>Are you sure you want to delete this schedule?</p>

                        <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto; margin-top: 12px;">
                            <button @click="toggleDeleteModal" class="cancelBtn">Cancel</button>
                            <button @click="confirmDelete()"  class="delete-btn">Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        </transition>

        <!-- Back Btn Confirmation -->
        <transition name="fade">
            <div v-show="isVisibleBackBtnModal" class="modal" style="z-index: 2;" @click.self="toggleBackBtnModal()">
               <div class="back-btn-modal-content">
                    <h3 style="font-size: 1.3rem; line-height: 0; margin: 12px 0; align-self: flex-start;">Discard schedule changes?</h3>

                    <p style="align-self: flex-start;">You will lose all the changes made to this schedule table.</p>
                    <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto; margin-top: 20px;">
                        <button @click="toggleBackBtnModal()" style="background-color: transparent; border: 1px solid black; color: black;">Keep Editing</button>
                        <button class="delete-btn" @click="discardChanges()">Discard changes</button>
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
    max-height: 250px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 0px 12px rgba(0, 0, 0, 0.15);
    overflow-y: auto;
}

/* Table column widths */
.large-table th:nth-child(1),
.large-table td:nth-child(1) {
    width: 24%;
}

.large-table th:nth-child(2),
.large-table td:nth-child(2) {
    width: 50%;
}

.large-table th:nth-child(3),
.large-table td:nth-child(3) {
    width: 23%;
}

.large-table th:nth-child(4),
.large-table td:nth-child(4) {
    width: 23%;
}

.large-table table {
    width: 700px;
    table-layout: fixed;
    border-collapse: collapse;
}

.large-table thead th {
  position: sticky;
  background-color: white;
  top: 0;
  z-index: 1;
}

/* Table Sizes */
.small-table table {
    width: 400px;
    border-collapse: collapse;
}

.small-table thead th {
  position: sticky;
  background-color: white;
  top: 0;
  z-index: 1;
}

/* Header Cells */
th {
    padding: 12px 25px;
    font-weight: 600;
    color: black;
    border-bottom: 1px solid var(--color-border);
}

.name-col,
td.truncate {
    max-width: 160px;
    width: auto;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis; 
    text-align: left;
}

.availability-col {
    text-align: left;
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
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
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
    background-color: white;
}

.cell > p:nth-of-type(1) {
  display: inline-block; 
  width: auto;
  max-width: 85%; 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis;
  margin-left: auto;
    
}

.cell > div {
  margin-top: auto;
  margin-bottom: 1px;
  height: 18px;
}

.cell > div > p:nth-of-type(1) {
  display: inline-block; 
  width: auto;
  max-width: 85%; 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis;
  font-weight: 600; 
  font-size: 0.90rem;
}

.cell > div > p:nth-of-type(2) {
  display: inline-block;
  white-space: nowrap; 
  font-weight: 600; 
  font-size: 0.90rem;
}

.cell > p:nth-of-type(2) {
  display: inline-block; 
  width: auto;
  max-width: 85%; 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis;
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

.clicked-cell {
  position: relative;
  background-color: #cadfc2 !important;
  color: transparent !important; /* Hide original text */
  transition: background-color 0.2s ease;
  backdrop-filter: blur(4px); /* Blur background */
  pointer-events: none; /* Prevent clicks while waiting */
}

.clicked-cell::after {
  content: "waiting...";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #3a3a3a;
  font-weight: bold;
  font-size: 14px;
  text-shadow: 0 1px 2px rgba(255,255,255,0.8);
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

.occupied {
  color: #666;
  background-color: #f0f0f0;
}

.occupied:hover {
  background-color: #e0e0e0;
}

.logs {
    display: flex; 
    flex-direction: column; 
    background-color: var(--color-lightgray);
    width: 100%; 
    height: 120px; 
    overflow-y: auto; 
    min-height: 80px; 
    border-radius: 6px; 
    margin-top: 6px; 
    border: 1px solid var(--color-border);
    padding-left: 16px; 
    padding-right: 16px; 
    padding-top: 12px; 
    padding-bottom: 12px; 
    gap: 3px;
    box-sizing: border-box;
}

/* =============================
    BACK BTN MODAL
============================= */
.back-btn-modal-content {
    display: flex;
    flex-direction: column;
    background-color: white;
    height: auto;
    max-height: 90vh;
    align-items: center;
    padding-top: 27px;
    padding-bottom: 27px;
    padding-left: 23px; 
    padding-right: 23px; 
    width: 450px;
    box-shadow: -2px 0 8px rgba(0,0,0,0.2);
    border-radius: 6px;
    gap: 20px;
    overflow-y: auto;
}
</style>