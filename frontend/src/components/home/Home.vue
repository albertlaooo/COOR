<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from "axios";
import router from '@/router';
import { store } from '@/components/store.js'
//#region FETCHING THE LATEST TERM FROM SECTIONS
const latestTerm = ref('')
async function fetchLatestTerm() {
    try {
        const res = await axios.get('http://localhost:3000/sections')
        const sections = res.data

        if (sections.length === 0) {
        latestTerm.value = 'No records found'
        return
        }

        // Sort to get the latest academic year and semester
        const latest = sections.sort((a, b) => {
        // Compare academic_year first
        const [aStart] = a.academic_year.split('-').map(Number)
        const [bStart] = b.academic_year.split('-').map(Number)

        if (bStart !== aStart) {
            return bStart - aStart // latest academic year first
        }

        // If same year, compare semester
        return b.semester - a.semester // latest semester first
        })[0]

        // Format semester text
        let semesterText = ''
        if (latest.semester == 1) semesterText = '1st Semester'
        else if (latest.semester == 2) semesterText = '2nd Semester'
        else semesterText = `${latest.semester}th Semester`

        // Format final string
        latestTerm.value = `A.Y. ${latest.academic_year}, ${semesterText}`

    } catch (error) {
        console.error('Error fetching sections:', error)
    }
}
//#endregion

//#region 📅 DATE & CALENDAR STATE
// Get current date
const currentDate = ref('')

// reactive current date
const today = new Date();
const currentYear = ref(today.getFullYear());
const currentMonth = ref(today.getMonth());

// constants
const dayNames = ["S", "M", "T", "W", "T", "F", "S"];

// computed month name
const monthName = computed(() =>
  new Date(currentYear.value, currentMonth.value).toLocaleString("default", {
    month: "long",
  })
);

// compute total days in month
const totalDays = computed(() =>
  new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
);

// compute first day of the month
const firstDay = computed(() =>
  new Date(currentYear.value, currentMonth.value, 1).getDay()
);

// blank slots before the first day
const blankDays = computed(() => Array(firstDay.value).fill(null));

const events = ref([]);

// Fetch all events with their names
async function fetchEvents() {
    try {
        const res = await axios.get('http://localhost:3000/event');
        // Keep the full object: { event_date, event_name }
        events.value = res.data.map(e => ({
            id: e.event_id,
            date: e.event_date,
            name: e.event_name
        }));
        console.log('Events loaded:', events.value);

        // 🔔 Load current notifications from backend
        const notifRes = await axios.get('http://localhost:3000/notifications');
        const existingMessages = notifRes.data.map(n => n.message);

        events.value.forEach(async (ev) => {
            const today = new Date();
            const eventDate = new Date(ev.date);

            const formattedDay = new Date(ev.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            const diffDays = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));

            // 3-DAY REMINDER
            if (diffDays === 3) {
                const message = `Reminder: <strong>${ev.name}</strong> is happening in 3 days (${formattedDay})`;

                if (!existingMessages.includes(message)) {
                    await axios.post("http://localhost:3000/add-notification", {
                        image: 1,
                        message
                    });
                    console.log("🔔 3-day reminder added");
                    store.notification++;
                }
            }

            // 1-DAY REMINDER
            if (diffDays === 1) {
                const message = `Reminder: <strong>${ev.name}</strong> is happening tomorrow (${formattedDay})`;

                if (!existingMessages.includes(message)) {
                    await axios.post("http://localhost:3000/add-notification", {
                        image: 2,
                        message
                    });
                    console.log("🔔 1-day reminder added");
                    store.notification++;
                }
            }
        });
    } catch (err) {
        console.error('Failed to load events:', err);
    }
}

fetchEvents();

// Check if a day has an event
function hasEvent(day) {
    const fullDate = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.value.some(e => e.date === fullDate);
}

// Get event name by date
function getEventName(day) {
    const fullDate = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const event = events.value.find(e => e.date === fullDate);
    return event ? event.name : '';
}

// Modal states
const isVisibleEventModal = ref(false);
const isDeleteEventVisible = ref(false);
const modalEventLabel = ref('');
const eventDate = ref('');
const inputEventName = ref('');

// Open modal and prefill event if exists
function toggleEventModal(day) {
    modalEventLabel.value = hasEvent(day) ? 'Update Event' : 'Add Event';
    isDeleteEventVisible.value = hasEvent(day) ? true : false;

    if (day) {
        const fullDate = new Date(currentYear.value, currentMonth.value, day);

        // Format: YYYY-MM-DD
        const formatted =
            fullDate.getFullYear() +
            "-" +
            String(fullDate.getMonth() + 1).padStart(2, "0") +
            "-" +
            String(fullDate.getDate()).padStart(2, "0");

        eventDate.value = formatted;
        inputEventName.value = getEventName(day); // prefill if event exists
    } else {
        eventDate.value = '';
        inputEventName.value = '';
    }

    showErrorInput.value = false;
    isVisibleEventModal.value = !isVisibleEventModal.value;
}

// Confirm adding/updating event
async function eventConfirm() {
    const day = eventDate.value;
    const eventName = inputEventName.value.trim();

    if (eventName === '') {
        showErrorInput.value = true;
        return;
    }

    try {
        // Check if event already exists for this day
        const existingEvent = events.value.find(e => e.date === day);

        if (existingEvent) {
            // Update existing event
            const res = await axios.put(`http://localhost:3000/update-event/${existingEvent.id}`, {
                event_name: eventName
            });

            if (res.data.success) {
                console.log("✅ Event updated:", res.data);
                toggleEventModal('');
                fetchEvents(); // refresh events
            } else {
                console.error("❌ Error updating event:", res.data.message);
            }
        } else {
            // Add new event
            const res = await axios.post("http://localhost:3000/add-event", {
                event_date: day,
                event_name: eventName
            });

            if (res.data.success) {
                console.log("✅ Event added:", res.data);

                const formattedDay = new Date(day).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });

                // Add a notification
                try {
                    const notifRes = await axios.post("http://localhost:3000/add-notification", {
                        image: 0,
                        message: `New event added: <strong>${eventName}</strong> on ${formattedDay}`
                    });

                    if (notifRes.data.success) {
                        console.log("🔔 Notification added:", notifRes.data);
                        store.notification++
                    } else {
                        console.error("❌ Error adding notification:", notifRes.data.message);
                    }
                } catch (err) {
                    console.error("❌ Notification request failed:", err);
                }

                toggleEventModal('');
                fetchEvents(); // refresh events
            } else {
                console.error("❌ Error adding event:", res.data.message);
            }
        }
    } catch (err) {
        console.error("❌ Failed to save event:", err);
    }
}

//#endregion

//#region 🔄 MONTH NAVIGATION
function prevMonth() {
  currentMonth.value--;
  if (currentMonth.value < 0) {
    currentMonth.value = 11;
    currentYear.value--;
  }
}

function nextMonth() {
  currentMonth.value++;
  if (currentMonth.value > 11) {
    currentMonth.value = 0;
    currentYear.value++;
  }
}
//#endregion

//#region 🟢 TODAY HIGHLIGHT
function isToday(day) {
  return (
    today.getFullYear() === currentYear.value &&
    today.getMonth() === currentMonth.value &&
    today.getDate() === day
  );
}
//#endregion

//#region 📝 NOTES FETCHING & PINNING
const notes = ref([]);

// ✅ Load notes from the backend
async function fetchNotes() {
  try {
    const res = await axios.get(`http://localhost:3000/notes`);
    if (res.data.success) {
      notes.value = res.data.notes.map(n => ({
        ...n,
        pinned: !!Number(n.pinned)
      }));

      console.log("✅ Notes loaded:", notes.value);
    }
  } catch (err) {
    console.error("❌ Failed to fetch notes:", err);
  }
}

// ✅ Toggle pin/unpin
async function togglePin(index) {
  const noteToUpdate = notes.value[index];
  if (!noteToUpdate) return;

  const newPinned = noteToUpdate.pinned ? 0 : 1;

  try {
    const res = await axios.put(
      `http://localhost:3000/update-note/${noteToUpdate.note_id}`,
      { pinned: newPinned }
    );

    if (res.data.success) {
      console.log(
        `📌 Note ${newPinned ? "pinned" : "unpinned"}:`,
        noteToUpdate.note
      );

      await fetchNotes();
    } else {
      console.error("❌ Failed to update note:", res.data.message);
    }
  } catch (err) {
    console.error("❌ Error updating note:", err);
  }
}
//#endregion

//#region 🧾 NOTE MODAL HANDLING
/////////////////////////////// NOTE MODAL ////////////////////////////
const noteTitle = ref('');
const noteHandler = ref('');
let noteIndexToUpdate = ref('')
const inputNote = ref('');
const inputPinned = ref(0)
const isVisibleNoteModal = ref(false)

const showErrorInput = ref(false)
const errorMessage = ref('')
const isInputNoteOk = ref(false)

const noteConfirm = async () => {
    // 🔹 Blank Input Validation
    if (!inputNote.value.trim()) {
        showErrorInput.value = false;
        setTimeout(() => (showErrorInput.value = true), 0);

        isInputNoteOk.value = !!inputNote.value.trim();

        errorMessage.value = "Note cannot be empty.";
        return;
    }

    try {
        if (noteHandler.value === "add") {

            if (!inputNote.value || inputNote.value.trim() === "") return;

            try {
                const res = await axios.post("http://localhost:3000/add-note", {
                note: inputNote.value.trim(),
                pinned: inputPinned.value
                });

                if (res.data.success) {
                // Re-fetch for updated order
                    await fetchNotes();
                } else {
                console.error("❌ Failed to add note:", res.data.message);
                }
            } catch (err) {
                console.error("❌ Error adding note:", err);
            }


        } else if (noteHandler.value === "update") {

            // ✅ Update note text
            const noteToUpdate = notes.value[noteIndexToUpdate];
            if (!inputNote.value) return;

            if (inputNote.value === null || inputNote.value.trim() === "" || inputNote.value === noteToUpdate.note) return;

            try {
                const res = await axios.put(
                `http://localhost:3000/update-note/${noteToUpdate.note_id}`,
                { note: inputNote.value.trim() }
                );

                if (res.data.success) {
                console.log("✏️ Note updated:", inputNote.value);
                await fetchNotes();
                } else {
                console.error("❌ Failed to update note:", res.data.message);
                }
            } catch (err) {
                console.error("❌ Error updating note:", err);
            }
        }

        // 🔹 Refresh and reset
        fetchNotes();
        toggleNoteModal("cancel");
    } catch (error) {
        console.log(error)
    }
};

function toggleNoteModal(which, index) {
    if(which === 'add'){
        noteTitle.value = 'Add Note'
        noteHandler.value = 'add'
        isVisibleNoteModal.value = !isVisibleNoteModal.value
    }

    else if(which === 'update'){
        noteTitle.value = 'Update Note'
        noteHandler.value = 'update'
        noteIndexToUpdate = index
        inputNote.value = notes.value[index].note;
        isVisibleNoteModal.value = !isVisibleNoteModal.value
    }

    else if(which === 'cancel'){
        setTimeout(() => {
            inputNote.value = '';
            noteHandler.value = '';
            showErrorInput.value = false;
            isInputNoteOk.value = false;
        }, 200);

        isVisibleNoteModal.value = !isVisibleNoteModal.value
    }
}

// 🕵️ Watchers to auto-clear red border when typing
watch(inputNote, (newVal) => {
    if (newVal.trim() !== "") {
        isInputNoteOk.value = true;
    }
});
//#endregion

//#region ❌ DELETE NOTE MODAL
/////////////////////////////// DELETE MODAL ////////////////////////////
const isVisibleDeleteModal = ref(false)
let itemToDelete = ref(null)
let deleteType = ref('')

// ✅ Delete event
function deleteEvent() {
    const event = events.value.find(e => e.date === eventDate.value);
    toggleDeleteModal('event', event);
}

// ✅ Delete note
function deleteNote(index) {
    const note = notes.value[index];
    if (!note) return;

    toggleDeleteModal('note', note);
}

function toggleDeleteModal(type = '', item = null) {
    deleteType.value = type;
    itemToDelete.value = item;
    isVisibleDeleteModal.value = !isVisibleDeleteModal.value;
}

async function confirmDelete() {
    if (!itemToDelete.value) return;

    try {
        let url = '';
        if (deleteType.value === 'note') {
            url = `http://localhost:3000/delete-note/${itemToDelete.value.note_id}`;
        } else if (deleteType.value === 'event') {
            url = `http://localhost:3000/delete-event/${itemToDelete.value.id}`;
        }

        const res = await axios.delete(url);

        if (res.data.success || res.data.message) {
            console.log(`✅ ${deleteType.value} deleted:`, itemToDelete.value);
            if (deleteType.value === 'note') await fetchNotes();
            if (deleteType.value === 'event') {
                fetchEvents();
                toggleEventModal(''); // close event modal
            }
        } else {
            console.error("❌ Failed to delete:", res.data.message);
        }
    } catch (err) {
        console.error("❌ Error deleting item:", err);
    }

    toggleDeleteModal();
}


//#endregion

//#region fade-up animation delay
const visible = ref([false, false, false, false]) // one flag per transition

onMounted(() => {
  let delay = 0
  visible.value.forEach((_, i) => {
    setTimeout(() => {
      visible.value[i] = true
    }, delay)
    delay += 100 // adjust delay between transitions (ms)
  })
})
//#endregion

//#region UNASSIGN SECTIONS CHECKER
const unassignedSectionCount = ref(0)
const isUnassignedSectionsFetching = ref(false)
const isScheduleConflictsFetching = ref(false)

const schedulesNullCheck = async () => {
  try {
    // 1️⃣ Fetch all schedules
    const scheduleRes = await axios.get('http://localhost:3000/get-all-schedules')
    const schedulesData = scheduleRes.data

    // 2️⃣ Fetch all sections
    const sectionsRes = await axios.get('http://localhost:3000/sections')
    const sectionsData = sectionsRes.data

    // 3️⃣ Collect section IDs with null fields
    const nullSectionIdsLocal = []

    // 4️⃣ Process each section
    for (const section of sectionsData) {
      const sectionId = section.section_id

      // a) Filter schedules for this section
      const sectionSchedules = schedulesData.filter(sch => sch.section_id === sectionId)

      // b) Count fully assigned schedules
      const assignedCount = sectionSchedules.filter(sch =>
        sch.subject_id !== null &&
        sch.room_id !== null &&
        sch.teacher_id !== null
      ).length

      // c) Count required subjects
      const reqRes = await axios.get(`http://localhost:3000/sections/${sectionId}/subjects-required`)
      const requiredSubjects = reqRes.data

      let requiredCount = 0
      requiredSubjects.forEach(sub => {
        const hasLecture = sub.lecture && sub.lecture > 0
        const hasLab = sub.laboratory && sub.laboratory > 0
        if (hasLecture && hasLab) requiredCount += 2
        else if (hasLecture || hasLab) requiredCount += 1
      })

      // d) Determine status
      let status = ''
      if (sectionSchedules.length === 0) {
        // No schedules at all → Unset
        status = 'Unset'
      } else if (assignedCount < requiredCount) {
        // Some schedules exist but not fully assigned → Partially Set
        status = 'Partially Set'
      } else if (assignedCount === requiredCount) {
        // Fully assigned → Complete
        status = 'Complete'
      }

      // e) Update schedule status
      try {
        await axios.put(
          `http://localhost:3000/update-schedule-status/${sectionId}`,
          { schedule_status: status }
        )
      } catch (err) {
        console.error(`Error updating schedule status for section ${sectionId}:`, err)
        alert("Error saving status data for section " + sectionId)
      }

      // f) Log null fields and collect null section IDs
      sectionSchedules.forEach(sch => {
        const nullFields = []
        if (sch.subject_id === null) nullFields.push('subject')
        if (sch.room_id === null) nullFields.push('room')
        if (sch.teacher_id === null) nullFields.push('teacher')
        if (nullFields.length > 0) {
          console.log(`Section ${sectionId} has null fields: ${nullFields.join(', ')}`)
          if (!nullSectionIdsLocal.includes(sectionId)) nullSectionIdsLocal.push(sectionId)
        }
      })
    }

    console.log('Null section IDs:', nullSectionIdsLocal)
    // Optionally, if you have refs in your component:
    // schedules.value = schedulesData
    // nullSectionIds.value = nullSectionIdsLocal

  } catch (error) {
    console.error('Error fetching schedules or updating status:', error)
  }
}

// Count sections with "Unset" or "Partially Set" schedule_status
async function countUnassignedSections() {
    // Count Unset and Partially Set Sections
    const response = await fetch("http://localhost:3000/sections")
    const data = await response.json()

    // Filter only latest term sections
    const match = latestTerm.value?.match(/A\.Y\. (\d{4}-\d{4}), (\d+)/)
    if (!match) {
        unassignedSectionCount.value = 0
        return
    }

    const [_, latestYear, latestSem] = match

    const latestSections = data.filter(
        s => s.academic_year === latestYear && Number(s.semester) === Number(latestSem)
    )

    unassignedSectionCount.value = latestSections.filter(
        s => s.schedule_status === 'Unset' || s.schedule_status === 'Partially Set'
    ).length
}

//#endregion

//#region CONFLICT CHECKER
const isVisibleScheduleConflictsModal = ref(false)
const conflictCount = ref(0)
const conflicts = ref([])

async function fetchSchedulesAndCheckConflicts() {
  try {
    const res = await axios.get('http://localhost:3000/get-all-schedules-conflict')
    const schedules = res.data

    let count = 0
    const foundConflicts = []

    for (let i = 0; i < schedules.length; i++) {
      for (let j = i + 1; j < schedules.length; j++) {
        const a = schedules[i]
        const b = schedules[j]

        // Check same day
        if (a.day_of_week === b.day_of_week) {
          // Check overlapping time
          const overlap = a.start_time < b.end_time && a.end_time > b.start_time

          // Check same teacher, room, or section
          const sameTeacher = a.teacher_id === b.teacher_id
          const sameRoom = a.room_id === b.room_id
          const sameSection = a.section_id === b.section_id

          if (overlap && (sameTeacher || sameRoom || sameSection)) {
            count++
            foundConflicts.push({
                a_id: a.schedule_assignment_id,
                b_id: b.schedule_assignment_id,
                a_section: a.section_format,
                b_section: b.section_format,
                reason: sameTeacher
                ? 'Same teacher'
                : sameRoom
                ? 'Same room'
                : 'Same section',
                day: a.day_of_week,
                overlap: `${toHHMM(a.start_time)}-${toHHMM(a.end_time)} & ${toHHMM(b.start_time)}-${toHHMM(b.end_time)}`
            })
            }
        }
      }
    }

    conflictCount.value = count
    conflicts.value = foundConflicts

    if (foundConflicts.length > 0) {
      console.log(`🟥 ${count} conflict(s) found:`)
      console.table(foundConflicts)
    } else {
      console.log('✅ No conflicts found.')
    }
  } catch (err) {
    console.error('Error fetching schedules:', err)
  }
}

function toggleScheduleConflictsModal() {
  isVisibleScheduleConflictsModal.value = !isVisibleScheduleConflictsModal.value
}

// 🔹 Converts minutes → "HH:MM" (e.g., 420 → "07:00")
function toHHMM(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  const formattedHours = hours % 12 === 0 ? 12 : hours % 12
  const formattedMins = mins.toString().padStart(2, '0')

  return `${formattedHours}:${formattedMins}`
}


//#endregion

//#region SCHEDULE TODAY
const schedules = ref([])
const searchQuery = ref("")
const activeDay = ref('')

// Helper — convert minutes (e.g., 480) → "08:00 AM"
function formatTime(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const h12 = hours % 12 || 12
  const ampm = hours < 12 ? "AM" : "PM"
  return `${h12}:${mins.toString().padStart(2, "0")} ${ampm}`
}

// Day mapping
const days = ["Sun", "Mon", "Tue", "Wed", "Thurs", "Fri", "Sat"]
const todayDayName = days[today.getDay()]
activeDay.value = todayDayName

// Fetch all schedules and filter today's
async function fetchTodaySchedules() {
  try {
    const res = await axios.get("http://localhost:3000/get-all-schedules-with-details")
    const all = res.data

    // Filter for today's day_of_week
    schedules.value = all.filter(s => s.day_of_week === activeDay.value)
  } catch (err) {
    console.error("❌ Failed to fetch schedules:", err)
  }
}

const groupedSchedules = computed(() => {
  // Group schedules by time range
  const map = {}
  schedules.value.forEach(s => {
    const range = `${formatTime(s.start_time)} - ${formatTime(s.end_time)}`
    if (!map[range]) map[range] = []
    map[range].push(s)
  })

  // Apply search filter
  const q = searchQuery.value.toLowerCase()
  const filtered = {}
  for (const [range, items] of Object.entries(map)) {
    const matches = items.filter(i => {
        // Build display name without the dot for searching
        const prefix = i.gender === 'male' ? 'mr' : 'ms'
        const displayName = `${prefix} ${i.last_name}`.toLowerCase()
        
        return (
            i.section_format?.toString().toLowerCase().includes(q) ||
            i.room_code?.toString().toLowerCase().includes(q) ||
            displayName.includes(q.replace('.', '').toLowerCase()) // remove dots from query
        )
    })
    if (matches.length > 0) filtered[range] = matches
  }

  // Sort by start_time but keep your time text the same
  const sorted = Object.entries(filtered)
    .sort((a, b) => {
        const aStart = a[1][0].start_time
        const bStart = b[1][0].start_time

        if (aStart !== bStart) return aStart - bStart

        // secondary sort: earlier end_time comes first
        const aEnd = a[1][0].end_time
        const bEnd = b[1][0].end_time
        return aEnd - bEnd
    })
    .reduce((acc, [range, items]) => {
      acc[range] = items
      return acc
    }, {})

  return sorted
})

async function dayCardClicked(day) {
  activeDay.value = day
  console.log(activeDay.value)
  await fetchTodaySchedules()
}

//#endregion

//#region TOTAL OVERVIEW
const totalTeachers = ref(0)
const totalStudents = ref(0)
const totalSections = ref(0)
const totalDepartments = ref(0)
const totalCourses = ref(0)
const totalSubjects = ref(0)
const totalRooms = ref(0)

// Count teachers
async function countTeachers() {
    const response = await fetch("http://localhost:3000/teachers")
    const data = await response.json()
    totalTeachers.value = data.length
}

// Count students and sections (Latest Term)
async function countStudentsAndSections() {
    const sections = ref([])
  const sectionRes = await fetch("http://localhost:3000/sections")
  const sectionData = await sectionRes.json()
  sections.value = sectionData

  // If latestTerm is not yet set, skip
  if (!latestTerm.value || latestTerm.value === 'No records found') {
    totalStudents.value = 0
    totalSections.value = 0
    return
  }

  // Extract academic_year and semester number from latestTerm.value
  const match = latestTerm.value.match(/A\.Y\. (\d{4}-\d{4}), (\d+)/)
  if (!match) {
    totalStudents.value = 0
    totalSections.value = 0
    return
  }

  const [_, latestYear, latestSem] = match

  // Filter only sections from that latest term
  const latestSections = sectionData.filter(
    s => s.academic_year === latestYear && Number(s.semester) === Number(latestSem)
  )

  // Count matching sections
  totalSections.value = latestSections.length

  // Sum up student_count from those sections
  totalStudents.value = latestSections.reduce(
    (sum, s) => sum + (s.student_count || 0),
    0
  )
}

// Count departments
async function countDepartments() {
    const response = await fetch("http://localhost:3000/departments")
    const data = await response.json()
    totalDepartments.value = data.length
}

// Count courses
async function countCourses() {
    const response = await fetch("http://localhost:3000/courses")
    const data = await response.json()
    totalCourses.value = data.length
}

// Count subjects
async function countSubjects() {
    const response = await fetch("http://localhost:3000/subjects")
    const data = await response.json()
    totalSubjects.value = data.length
}

// Count rooms
async function countRooms() {
    const response = await fetch("http://localhost:3000/rooms")
    const data = await response.json()
    totalRooms.value = data.length
}


//#endregion

//#region NAVIGATION
function goToPage(which){
    router.push(which)
}
//#endregion

//#region 🚀 LIFECYCLE
onMounted(async () => {
    const now = new Date()
        currentDate.value = now.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    })

    isUnassignedSectionsFetching.value = true
    isScheduleConflictsFetching.value = true
    await fetchLatestTerm()
    await schedulesNullCheck()
    await countUnassignedSections()
    isUnassignedSectionsFetching.value = false
    await fetchSchedulesAndCheckConflicts()
    isScheduleConflictsFetching.value = false
    await fetchTodaySchedules()
    await countTeachers()
    await countStudentsAndSections()
    await countDepartments()
    await countCourses()
    await countSubjects()
    await countRooms()
    await fetchNotes()
})
//#endregion
</script>

<template>
    <div id="container">

        <header>
            <svg height="100%" viewBox="0 0 114 114" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g filter="url(#filter0_d_152_59)">
                <circle cx="55" cy="53" r="53" fill="#E4F5FF"/>
                </g>
                <path d="M35.9583 79.4166H75.0417C76.5225 79.4166 77.9426 78.8284 78.9897 77.7813C80.0368 76.7342 80.625 75.3141 80.625 73.8333V48.7083C80.6271 48.3409 80.5567 47.9767 80.4178 47.6365C80.2789 47.2964 80.0742 46.987 79.8154 46.7262L57.4821 24.3929C56.959 23.8729 56.2515 23.5811 55.514 23.5811C54.7764 23.5811 54.0689 23.8729 53.5458 24.3929L31.2125 46.7262C30.9487 46.9847 30.7389 47.2931 30.5951 47.6333C30.4513 47.9735 30.3765 48.3389 30.375 48.7083V73.8333C30.375 75.3141 30.9632 76.7342 32.0103 77.7813C33.0574 78.8284 34.4775 79.4166 35.9583 79.4166ZM49.9167 73.8333V59.8749H61.0833V73.8333H49.9167ZM35.9583 49.8528L55.5 30.3112L75.0417 49.8528V73.8333H66.6667V59.8749C66.6667 58.3941 66.0784 56.974 65.0313 55.9269C63.9843 54.8798 62.5641 54.2916 61.0833 54.2916H49.9167C48.4359 54.2916 47.0157 54.8798 45.9687 55.9269C44.9216 56.974 44.3333 58.3941 44.3333 59.8749V73.8333H35.9583V49.8528Z" fill="#0785D4"/>
                <defs>
                <filter id="filter0_d_152_59" x="0" y="0" width="114" height="114" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                <feOffset dx="2" dy="4"/>
                <feGaussianBlur stdDeviation="2"/>
                <feComposite in2="hardAlpha" operator="out"/>
                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_152_59"/>
                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_152_59" result="shape"/>
                </filter>
                </defs>
            </svg>

            <div style="display: flex; flex-direction: column;">
                <h1>Dashboard</h1>
                <p class="paragraph--gray">Simplify your daily workflow.</p>
            </div>
        </header>

        <main>
            <div style="display: flex; flex-direction: row; gap: 20px;">
                
                <!-- 1st column -->
                <div style="flex: 1; display: flex; flex-direction: column; gap: 20px; width: 100%; margin-bottom: 20px;">
                    <!-- Card Greeting -->
                    <transition name="fade-up" appear>
                        <div v-if="visible[0]"
                            class="card-glare">

                            <!-- Glare effect -->
                            <div class="glare"></div>

                            <!-- Text -->
                            <div style="display: flex; flex-direction: column; height: 100%; justify-content: space-between; gap: 35px;">
                                <p id="dashboard-card-date" style="color: #F4F4F4; margin: 0;">{{ currentDate }}</p>
                                <div style="display: flex; flex-direction: column; gap: 4px;">
                                <h2 style="color: white; margin: 0; white-space: nowrap;">{{ latestTerm }}</h2>
                                <p style="color: #F4F4F4; margin: 0;">La Consolacion College – Novaliches </p>
                                </div>
                            </div>

                            <!-- Image (ignores padding) -->
                            <img
                                src="@/assets/home/mechanic.webp"
                                style="
                                position: absolute;
                                right: 0;
                                top: 0;
                                bottom: 0;
                                height: 100%;
                                width: auto;
                                object-fit: cover;
                                "
                            />
                        </div>
                    </transition>

                    <transition name="fade-up" appear>
                        <div v-if="visible[1]" style="display: flex; flex-direction: row; gap: 12px;">
                            <div style="flex: 1; display: flex; flex-direction: column; gap: 12px;">

                                <!-- UNASSIGNED SECTIONS -->
                                <div
                                    id="unassigned-sections"
                                    :class="['unassigned-sections', { 'has-unassigned': unassignedSectionCount > 0}]"
                                    @click="goToPage('/main/class-scheduling')">

                                      <!-- Overlay for Gathering Data -->
                                    <div v-if="isUnassignedSectionsFetching" class="overlay">
                                        <span>Fetching Data...</span>
                                    </div>
                                    <div :class="['content', { 'blurred': isUnassignedSectionsFetching }]">
                                        <div style="display: flex; flex-direction: row; justify-content: space-between;">
                                            <p :style="{ color: unassignedSectionCount > 0 ? '#854D0E' : '#1A401C', fontWeight: 600 }">
                                                UNASSIGNED SECTIONS
                                            </p>

                                            <!-- Check SVG -->
                                            <svg v-show="unassignedSectionCount == 0" class="svg-icon" style="width: 23px; height: 23px;vertical-align: middle;fill: #1A401C;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M528.544303 46.535873c-247.186775 0-447.601294 200.38996-447.601294 447.601294 0 247.211335 200.415542 447.601294 447.601294 447.601294 247.194962 0 447.601294-200.38996 447.601294-447.601294C976.146621 246.924809 775.740288 46.535873 528.544303 46.535873M789.830191 372.900965 483.425709 670.0302c-5.210675 5.053086-11.95938 7.569396-18.690688 7.569396-6.880711 0-13.752212-2.622734-18.99768-7.867178L326.355371 550.349423c-10.500145-10.490935-10.500145-29.53364 0-40.024575 10.489912-10.490935 27.476795-12.537548 37.96773-2.046612l100.691283 100.676957 287.437501-278.719956c10.629081-10.29753 27.607778-8.024767 37.97387 2.641153C800.734542 343.523891 800.489972 362.566596 789.830191 372.900965"  /></svg>
                                            
                                            <!-- Caution SVG -->
                                            <svg 
                                                class="svg-icon"
                                                v-show="unassignedSectionCount > 0" 
                                                width="23" 
                                                height="23" 
                                                viewBox="0 0 24 24" 
                                                fill="none" 
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <g clip-path="url(#clip0_408_455)">
                                                    <path 
                                                        d="M23.7299 20.0474C24.499 21.3597 23.5336 23 21.9975 23H2.00228C0.463236 23 -0.497681 21.3571 0.269902 20.0474L10.2677 2.98376C11.0371 1.67089 12.9643 1.67327 13.7324 2.98376L23.7299 20.0474ZM12 16.5195C10.9415 16.5195 10.0834 17.3642 10.0834 18.4062C10.0834 19.4483 10.9415 20.293 12 20.293C13.0586 20.293 13.9167 19.4483 13.9167 18.4062C13.9167 17.3642 13.0586 16.5195 12 16.5195ZM10.1803 9.73776L10.4894 15.3159C10.5039 15.5769 10.7231 15.7812 10.9887 15.7812H13.0114C13.2769 15.7812 13.4962 15.5769 13.5107 15.3159L13.8197 9.73776C13.8354 9.45582 13.6073 9.21875 13.3205 9.21875H10.6795C10.3927 9.21875 10.1647 9.45582 10.1803 9.73776Z" 
                                                        :fill="unassignedSectionCount > 0 ? '#854D0E' : '#1A401C'"
                                                    />
                                                </g>
                                                <defs>
                                                    <clipPath id="clip0_408_455">
                                                        <rect width="24" height="21" fill="white" transform="translate(0 2)"/>
                                                    </clipPath>
                                                </defs>
                                            </svg>
                                        </div>
                                    
                                        <div 
                                            style="width: 100%; margin-bottom: 6px; border-bottom: 1px solid;"
                                            :style="{ borderColor: unassignedSectionCount > 0 ? '#854D0E' : '#1A401C' }"
                                        >
                                            <h2 :style="{ color: unassignedSectionCount > 0 ? '#854D0E' : '#1A401C', margin: '16px 0' }">
                                                {{ unassignedSectionCount }}
                                            </h2>
                                        </div>

                                        <small :style="{ color: unassignedSectionCount > 0 ? '#854D0E' : '#1A401C' }">
                                            {{ unassignedSectionCount > 0 ? 'Assign sections now.' : 'All sections are assigned.' }}
                                        </small>
                                    </div>
                                </div>

                                <!-- SCHEDULE CONFLICTS -->
                                <div
                                    class="schedule-conflicts"
                                    :class="['schedule-conflicts', { 'has-conflict': conflictCount > 0 }]"
                                    @click="toggleScheduleConflictsModal">
                                    <!-- Overlay for blurring -->
                                    <div v-if="isScheduleConflictsFetching" class="overlay">
                                        <span>Gathering Data...</span>
                                    </div>

                                    <div :class="['content', { 'blurred': isScheduleConflictsFetching }]">
                                        <div style="display: flex; flex-direction: row; justify-content: space-between;">
                                            <p :style="{ color: conflictCount > 0 ? '#991B1B' : '#1A401C', fontWeight: 600 }">
                                                SCHEDULE CONFLICTS
                                            </p>


                                            <!-- Check SVG -->
                                            <svg v-show="conflictCount == 0" class="svg-icon" style="width: 23px; height: 23px;vertical-align: middle;fill: #1A401C;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M528.544303 46.535873c-247.186775 0-447.601294 200.38996-447.601294 447.601294 0 247.211335 200.415542 447.601294 447.601294 447.601294 247.194962 0 447.601294-200.38996 447.601294-447.601294C976.146621 246.924809 775.740288 46.535873 528.544303 46.535873M789.830191 372.900965 483.425709 670.0302c-5.210675 5.053086-11.95938 7.569396-18.690688 7.569396-6.880711 0-13.752212-2.622734-18.99768-7.867178L326.355371 550.349423c-10.500145-10.490935-10.500145-29.53364 0-40.024575 10.489912-10.490935 27.476795-12.537548 37.96773-2.046612l100.691283 100.676957 287.437501-278.719956c10.629081-10.29753 27.607778-8.024767 37.97387 2.641153C800.734542 343.523891 800.489972 362.566596 789.830191 372.900965"  /></svg>

                                            <!-- Caution SVG -->
                                            <svg v-show="conflictCount > 0" class="svg-icon" width="23" height="23" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <g clip-path="url(#clip0_408_455)">
                                                    <path
                                                        d="M23.7299 20.0474C24.499 21.3597 23.5336 23 21.9975 23H2.00228C0.463236 23 -0.497681 21.3571 0.269902 20.0474L10.2677 2.98376C11.0371 1.67089 12.9643 1.67327 13.7324 2.98376L23.7299 20.0474ZM12 16.5195C10.9415 16.5195 10.0834 17.3642 10.0834 18.4062C10.0834 19.4483 10.9415 20.293 12 20.293C13.0586 20.293 13.9167 19.4483 13.9167 18.4062C13.9167 17.3642 13.0586 16.5195 12 16.5195ZM10.1803 9.73776L10.4894 15.3159C10.5039 15.5769 10.7231 15.7812 10.9887 15.7812H13.0114C13.2769 15.7812 13.4962 15.5769 13.5107 15.3159L13.8197 9.73776C13.8354 9.45582 13.6073 9.21875 13.3205 9.21875H10.6795C10.3927 9.21875 10.1647 9.45582 10.1803 9.73776Z"
                                                        fill="#991B1B"
                                                    />
                                                </g>
                                                <defs>
                                                <clipPath id="clip0_408_455">
                                                    <rect width="24" height="21" fill="white" transform="translate(0 2)" />
                                                </clipPath>
                                                </defs>
                                            </svg>
                                        </div>

                                        <div style="width: 100%; margin-bottom: 6px; border-bottom: 1px solid;"
                                            :style="{ borderColor: conflictCount > 0 ? '#991B1B' : '#1A401C' }">
                                            <h2 :style="{ color: conflictCount > 0 ? '#991B1B' : '#1A401C', margin: '16px 0' }">
                                                {{ conflictCount }}
                                            </h2>
                                        </div>

                                        <small :style="{ color: conflictCount > 0 ? '#991B1B' : '#1A401C' }">
                                            {{ conflictCount > 0 ? 'Conflicts detected.' : 'There are no problems here.' }}
                                        </small>
                                    </div>
                                </div>

                            </div>

                            <!-- Today's Schedule -->
                            <div class="todays-schedule-container">
                                
                                <p style="font-size: 20px; margin-bottom: 6px;" class="paragraph--black-bold">Schedule Today</p>

                                <!-- Days -->
                                <div style="display: flex; flex-direction: row; gap: 4px;">
                                   <div class="day-card" 
                                        :style="activeDay === 'Mon' ? { backgroundColor: 'var(--color-primary)' } : {}" 
                                        @click="dayCardClicked('Mon')">
                                        <p style="font-size: small;" 
                                            :style="activeDay === 'Mon' ? { color: 'white' } : {}">
                                            Mon
                                        </p>
                                    </div>

                                    <div class="day-card" 
                                        :style="activeDay === 'Tue' ? { backgroundColor: 'var(--color-primary)' } : {}" 
                                        @click="dayCardClicked('Tue')">
                                        <p style="font-size: small;" 
                                            :style="activeDay === 'Tue' ? { color: 'white' } : {}">
                                            Tue
                                        </p>
                                    </div>

                                    <div class="day-card" 
                                        :style="activeDay === 'Wed' ? { backgroundColor: 'var(--color-primary)' } : {}" 
                                        @click="dayCardClicked('Wed')">
                                        <p style="font-size: small;" 
                                            :style="activeDay === 'Wed' ? { color: 'white' } : {}">
                                            Wed
                                        </p>
                                    </div>

                                    <div class="day-card" 
                                        :style="activeDay === 'Thurs' ? { backgroundColor: 'var(--color-primary)' } : {}" 
                                        @click="dayCardClicked('Thurs')">
                                        <p style="font-size: small;" 
                                            :style="activeDay === 'Thurs' ? { color: 'white' } : {}">
                                            Thu
                                        </p>
                                    </div>

                                    <div class="day-card" 
                                        :style="activeDay === 'Fri' ? { backgroundColor: 'var(--color-primary)' } : {}" 
                                        @click="dayCardClicked('Fri')">
                                        <p style="font-size: small;" 
                                            :style="activeDay === 'Fri' ? { color: 'white' } : {}">
                                            Fri
                                        </p>
                                    </div>

                                    <div class="day-card" 
                                        :style="activeDay === 'Sat' ? { backgroundColor: 'var(--color-primary)' } : {}" 
                                        @click="dayCardClicked('Sat')">
                                        <p style="font-size: small;" 
                                            :style="activeDay === 'Sat' ? { color: 'white' } : {}">
                                            Sat
                                        </p>
                                    </div>

                                    <div class="day-card" 
                                        :style="activeDay === 'Sun' ? { backgroundColor: 'var(--color-primary)' } : {}" 
                                        @click="dayCardClicked('Sun')">
                                        <p style="font-size: small;" 
                                            :style="activeDay === 'Sun' ? { color: 'white' } : {}">
                                            Sun
                                        </p>
                                    </div>

                                </div>

                                <div style="position: relative; display: inline-block;">
                                    <svg 
                                        width="20" 
                                        height="20" 
                                        viewBox="0 0 22 22" 
                                        fill="none" 
                                        xmlns="http://www.w3.org/2000/svg"
                                        style="position: absolute; top: 50%; left: 15px; transform: translateY(-50%); pointer-events: none;"
                                    >
                                        <path d="M8.69175 16.529C10.5945 16.529 12.3917 15.8545 13.8219 14.6276L20.7744 21.5978C20.9031 21.7272 21.0727 21.7919 21.2417 21.7919C21.41 21.7919 21.5789 21.7279 21.7076 21.5992C21.9657 21.3418 21.9663 20.924 21.7089 20.6659L14.7506 13.6904C17.3556 10.5791 17.2038 5.9202 14.2853 2.99507C12.791 1.49687 10.8044 0.671875 8.69109 0.671875C6.57778 0.671875 4.59117 1.49687 3.09693 2.99507C0.0140752 6.08586 0.0140752 11.1157 3.09693 14.2065C4.59183 15.704 6.57843 16.529 8.69175 16.529ZM4.03215 3.92699C5.27691 2.67893 6.93153 1.99187 8.69175 1.99187C10.452 1.99187 12.1066 2.67893 13.3514 3.92699C15.9221 6.50429 15.9221 10.6973 13.3514 13.2746C12.1066 14.5226 10.452 15.2097 8.69175 15.2097C6.93153 15.2097 5.27691 14.5226 4.03215 13.2746C1.46211 10.6973 1.46211 6.50429 4.03215 3.92699Z" fill="#757070"/>
                                    </svg>

                                    <input 
                                        v-model="searchQuery"
                                        style="width: 100%; padding-left: 45px;"
                                        placeholder="Search"
                                    />
                                </div>
                                
                                <div style="display: flex; flex-direction: column; height: 100%; margin-top: 4px; gap: 16px; overflow-y: auto; overflow-x: hidden;">
                                    <template v-if="Object.keys(groupedSchedules).length > 0">
                                    <div
                                        v-for="(items, timeRange) in groupedSchedules"
                                        :key="timeRange"
                                        style="display: flex; flex-direction: column; gap: 4px;"
                                    >
                                        <p style="font-weight: 600;">{{ timeRange }}</p>
                                        <div style="display: flex; flex-direction: column; gap: 2px; margin-left: 16px;">
                                        <p v-for="item in items"
                                            :key="item.schedule_id">
                                                • {{ item.section_format }} 
                                                <span style="display: inline-block; max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; vertical-align: bottom;">
                                                    ({{ item.gender === 'male' ? 'Mr.' : 'Ms.' }} {{ item.last_name }}
                                                </span>) - Room {{ item.room_code }}
                                        </p>
                                        </div>
                                    </div>
                                    </template>

                                    <div v-else style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; height: 100%;">
                                        <svg v-show="activeDay === 'Sun'" width="3em" height="3em" viewBox="0 0 641 565" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M617.858 506.063H423.958C462.758 488.463 493.058 459.463 514.158 420.163C520.558 421.363 526.758 422.063 532.658 422.063C578.058 422.063 608.358 390.863 609.758 389.463C657.758 341.263 636.358 293.963 628.058 283.963C605.158 255.963 567.958 261.563 548.858 266.863V244.563C548.858 233.663 539.358 224.863 527.758 224.863H101.458C89.8582 224.863 80.3581 231.963 80.3581 244.563V275.063C84.2581 391.063 128.158 471.063 205.458 506.063H12.7582C0.0581522 506.063 -1.24185 518.663 0.758152 525.763C6.25815 544.963 46.7582 564.063 84.0582 564.963H546.458C589.058 563.463 625.758 537.263 628.758 520.963C630.058 514.863 627.158 506.063 617.858 506.063ZM611.058 297.963C611.258 298.263 635.158 332.863 593.958 374.263C593.658 374.563 564.858 404.163 523.858 399.663C536.958 368.463 545.058 331.863 547.858 290.263C557.558 286.763 593.158 275.963 611.058 297.963ZM102.258 246.763H526.958C526.958 246.763 526.658 278.963 526.558 281.263H102.558C102.458 279.163 102.258 246.763 102.258 246.763ZM103.858 299.563H525.358C517.658 384.463 483.158 479.263 371.158 500.063C370.958 500.063 352.558 502.463 314.658 502.463C277.258 502.463 258.858 500.163 258.758 500.163C146.058 479.163 111.458 384.263 103.858 299.563ZM546.258 546.863H84.4582C53.3582 545.963 28.4582 532.263 20.7582 524.363H605.458C595.358 533.263 573.058 545.863 546.258 546.863ZM298.258 189.863C307.658 196.563 319.058 185.963 310.258 176.163C307.758 173.963 286.658 153.863 305.858 129.063C331.158 96.3627 314.858 65.9627 302.658 54.5627C291.058 46.9627 283.158 60.9627 290.158 67.7627C292.458 70.0627 312.558 90.7627 291.458 117.863C267.358 149.063 285.358 178.563 298.258 189.863ZM348.358 123.763C340.158 135.163 352.458 142.363 360.358 137.463C373.258 126.163 391.258 96.6627 367.158 65.4627C346.158 38.2627 366.158 17.5627 368.458 15.3627C375.458 6.36274 367.158 -4.63726 355.958 2.06274C343.758 13.5627 327.458 43.8627 352.758 76.5627C372.058 101.463 350.858 121.563 348.358 123.763Z" fill="#7F8D9C"/>
                                        </svg>
                                        <p style="text-align: center; color: #7F8D9C; font-style: italic;">{{ activeDay === 'Sun' ? 'Chill Day' : 'No schedule today' }}</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Total Overview -->
                            <div style="display: flex; flex-direction: column; width: 320px; padding: 20px 26px; background-color: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); gap: 12px;">
                                <p style="font-size: 20px; margin-bottom: 10px;" class="paragraph--black-bold">Total Overview</p>
                                
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">

                                    <div class="total-overview-buttons" @click="goToPage('/main/masterlist/teachers')">
                                        <svg style="position: absolute; left: 20px; top: 20px;" width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M14.5 16.9354C16.5393 16.9354 18.6633 17.379 20.8721 18.2663C23.081 19.1537 24.1854 20.3149 24.1854 21.75V24.1854H4.814V21.75C4.814 20.3149 5.91841 19.1537 8.12725 18.2663C10.3361 17.379 12.4601 16.9354 14.4994 16.9354H14.5ZM14.5 14.5C13.1785 14.5 12.0457 14.0279 11.1016 13.0838C10.1574 12.1397 9.68539 11.0069 9.68539 9.68536C9.68539 8.36385 10.1574 7.22157 11.1016 6.25853C12.0457 5.29549 13.1785 4.81396 14.5 4.81396C15.8215 4.81396 16.9543 5.29549 17.8984 6.25853C18.8425 7.22157 19.3146 8.36385 19.3146 9.68536C19.3146 11.0069 18.8425 12.1397 17.8984 13.0838C16.9543 14.0279 15.8215 14.5 14.5 14.5Z" fill="#1E90FF"/>
                                        </svg>
                                        
                                        <p style="font-size: 25px;">{{ totalTeachers }}</p>
                                        <p style="color: #7F8D9C;">Teachers</p>
                                    </div>

                                    <div class="total-overview-buttons">
                                        <svg style="position: absolute; left: 20px; top: 20px;" width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <g clip-path="url(#clip0_587_102)">
                                            <path d="M26.2186 11.7976L14.9161 7.64313C14.2115 7.37049 14.3593 7.36876 13.6604 7.63916L2.2898 11.7603C1.59092 12.0307 1.59545 12.4709 2.30003 12.7435L5.00194 13.7233C3.80545 14.9628 3.72789 16.2514 3.71181 17.7456C3.24941 17.9361 2.92117 18.4153 2.92117 18.9767C2.92117 19.4923 3.19799 19.9385 3.60121 20.1555C3.40957 21.6737 2.86114 23.4081 1.25 25.4631C2.04702 26.1227 2.45838 26.3426 3.07541 26.5625C5.3277 25.5286 5.05389 22.7795 4.87858 20.0454C5.18794 19.8057 5.38932 19.4164 5.38932 18.9768C5.38932 18.5054 5.15791 18.0921 4.81012 17.8587C4.85018 16.3946 5.14849 15.0848 6.17235 14.2374C6.18074 14.215 6.20454 14.1944 6.24878 14.1755L14.0187 10.8184C14.3068 10.6949 14.6341 10.8445 14.7496 11.1526L14.7598 11.1798C14.8754 11.4879 14.7354 11.8377 14.4472 11.9612L7.88089 14.7673L13.7568 16.8981C14.4613 17.1707 14.3135 17.1724 15.0124 16.902L26.2288 12.7808C26.9277 12.5104 26.9231 12.0702 26.2186 11.7976ZM13.739 18.4921L6.62632 15.9147V17.8531C6.99816 18.2173 7.20333 18.7397 7.20333 19.3203C7.20333 19.8423 7.03273 20.3171 6.74458 20.6723C6.83886 20.9767 7.00305 21.2743 7.23758 21.3679C11.3769 23.814 17.0985 23.7865 21.7006 21.1205C22.0419 20.8167 22.3059 20.4404 22.3059 20.0761V15.8066L14.9999 18.4961C14.3011 18.7665 14.4435 18.7647 13.739 18.4921Z" fill="#32CD32"/>
                                            </g>
                                            <defs>
                                            <clipPath id="clip0_587_102">
                                            <rect width="29" height="29" fill="white"/>
                                            </clipPath>
                                            </defs>
                                        </svg>

                                        <p style="font-size: 25px;">{{ totalStudents }}</p>
                                        <p style="color: #7F8D9C;">Students</p>
                                    </div>

                                    <div class="total-overview-buttons" @click="goToPage('/main/masterlist/sections')">
                                        <svg style="position: absolute; left: 20px; top: 20px;" width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <g clip-path="url(#clip0_587_109)">
                                            <path d="M14.7911 3.04868C14.52 3.09757 14.5245 3.09757 9.18223 5.5109C5.73334 7.07534 4.23112 7.77312 4.12889 7.8709C4.03112 7.96423 3.97778 8.05312 3.97778 8.12868C3.97778 8.29312 4.12889 8.57757 4.27556 8.67979C4.51112 8.84423 14.4045 14.0131 14.5778 14.062C14.8222 14.1287 15.2133 14.1242 15.4489 14.0487C15.7822 13.9465 25.72 8.65757 25.8533 8.5109C26.0845 8.26201 26.0533 7.9509 25.7867 7.78201C25.7333 7.74646 23.48 6.71979 20.7778 5.49757C15.6356 3.16868 15.1778 2.98201 14.7911 3.04868Z" fill="#FFA500"/>
                                            <path d="M3.46667 10.3553C3.23555 10.4353 3.05333 10.6531 3.02222 10.8842C3.00889 10.9864 3 13.2976 3.00889 16.022L3.02222 20.9776L3.14667 21.2309C3.40889 21.7687 3.4 21.7598 8.46222 24.4176C10.9867 25.7464 13.1378 26.8709 13.24 26.9153C13.4978 27.0264 13.7422 26.9642 13.9556 26.7287L14.1111 26.5553L14.1022 21.2976L14.0889 16.0442L13.9911 15.862C13.8 15.502 13.5556 15.3464 11.2889 14.1731C10.0933 13.5509 7.94222 12.4309 6.51111 11.6887C5.08 10.942 3.85333 10.3242 3.77778 10.3109C3.70667 10.2976 3.56444 10.3198 3.46667 10.3553Z" fill="#FFA500"/>
                                            <path d="M25.8667 10.4578C25.1867 10.7911 16.7111 15.1911 16.5778 15.28C16.3467 15.4356 16.1067 15.6844 16.0089 15.8667L15.9111 16.0444L15.8978 21.3067L15.8889 26.5644L16.0844 26.76C16.2133 26.8933 16.32 26.9556 16.4044 26.96C16.6533 26.9733 16.84 26.9467 16.8889 26.8889C16.9111 26.8578 19.0044 25.7422 21.5333 24.4133C26.5911 21.76 26.5956 21.76 26.8533 21.2356L26.9778 20.9778V15.8667V10.7556L26.8756 10.6089C26.7556 10.4489 26.6044 10.3556 26.3778 10.3111C26.2533 10.2889 26.1511 10.32 25.8667 10.4578Z" fill="#FFA500"/>
                                            </g>
                                            <defs>
                                            <clipPath id="clip0_587_109">
                                            <rect width="24" height="24" fill="white" transform="translate(3 3)"/>
                                            </clipPath>
                                            </defs>
                                        </svg>
                                        
                                        <p style="font-size: 25px;">{{ totalSections }}</p>
                                        <p style="color: #7F8D9C;">Sections</p>
                                    </div>

                                    <div class="total-overview-buttons" @click="goToPage('/main/masterlist/departments')">
                                        <svg style="position: absolute; left: 20px; top: 20px;" width="27" height="27" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M9 16L8.883 16.007C8.63975 16.0357 8.41547 16.1526 8.25272 16.3356C8.08996 16.5187 8.00003 16.7551 8 17V19H9C9.24493 19 9.48134 19.09 9.66437 19.2527C9.84741 19.4155 9.96434 19.6397 9.993 19.883L10 20V24C10 24.2652 9.89464 24.5196 9.70711 24.7071C9.51957 24.8946 9.26522 25 9 25H5C4.73478 25 4.48043 24.8946 4.29289 24.7071C4.10536 24.5196 4 24.2652 4 24V20C4 19.7348 4.10536 19.4804 4.29289 19.2929C4.48043 19.1054 4.73478 19 5 19H6V17L6.005 16.824C6.04989 16.0601 6.38499 15.3422 6.94174 14.8173C7.49848 14.2923 8.23479 14 9 14H13V11H10C9.75507 11 9.51866 10.91 9.33563 10.7473C9.15259 10.5845 9.03566 10.3603 9.007 10.117L9 10V6C9 5.73478 9.10536 5.48043 9.29289 5.29289C9.48043 5.10536 9.73478 5 10 5H18C18.2652 5 18.5196 5.10536 18.7071 5.29289C18.8946 5.48043 19 5.73478 19 6V10C19 10.2652 18.8946 10.5196 18.7071 10.7071C18.5196 10.8946 18.2652 11 18 11H15V14H19C19.7652 14 20.5015 14.2923 21.0583 14.8173C21.615 15.3422 21.9501 16.0601 21.995 16.824L22 17V19H23C23.2449 19 23.4813 19.09 23.6644 19.2527C23.8474 19.4155 23.9643 19.6397 23.993 19.883L24 20V24C24 24.2652 23.8946 24.5196 23.7071 24.7071C23.5196 24.8946 23.2652 25 23 25H19C18.7348 25 18.4804 24.8946 18.2929 24.7071C18.1054 24.5196 18 24.2652 18 24V20C18 19.7348 18.1054 19.4804 18.2929 19.2929C18.4804 19.1054 18.7348 19 19 19H20V17C20 16.7551 19.91 16.5187 19.7473 16.3356C19.5845 16.1526 19.3602 16.0357 19.117 16.007L19 16H9Z" fill="#800080"/>
                                        </svg>
     
                                        <p style="font-size: 25px;">{{ totalDepartments }}</p>
                                        <p style="color: #7F8D9C;">Departments</p>
                                    </div>

                                    <div class="total-overview-buttons" @click="goToPage('/main/masterlist/courses')">
                                        <svg style="position: absolute; left: 20px; top: 20px;" width="30" height="30" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M7.66667 6.625H3.66667C3.3 6.625 3 6.92031 3 7.28125V21.7188C3 22.0797 3.3 22.375 3.66667 22.375H7.66667C8.03333 22.375 8.33333 22.0797 8.33333 21.7188V7.28125C8.33333 6.92031 8.03333 6.625 7.66667 6.625ZM7 10.5625H4.33333V9.25H7V10.5625ZM14.3333 6.625H10.3333C9.96667 6.625 9.66667 6.92031 9.66667 7.28125V21.7188C9.66667 22.0797 9.96667 22.375 10.3333 22.375H14.3333C14.7 22.375 15 22.0797 15 21.7188V7.28125C15 6.92031 14.7 6.625 14.3333 6.625ZM13.6667 10.5625H11V9.25H13.6667V10.5625Z" fill="#FF69B4"/>
                                            <path d="M18.9387 7.63971L15.3667 9.41159C15.2094 9.49032 15.09 9.62703 15.0345 9.79196C14.9791 9.9569 14.9921 10.1367 15.0707 10.2923L21.0707 22.0129C21.1507 22.1678 21.2895 22.2853 21.4571 22.3398C21.6246 22.3944 21.8073 22.3816 21.9653 22.3043L25.5373 20.5324C25.6947 20.4537 25.814 20.317 25.8695 20.152C25.9249 19.9871 25.9119 19.8073 25.8333 19.6517L19.8333 7.93109C19.7534 7.77622 19.6145 7.65872 19.4469 7.60415C19.2794 7.54958 19.0967 7.56236 18.9387 7.63971Z" fill="#FF69B4"/>
                                            <path d="M22.3333 21.7188C22.3333 21.8928 22.2631 22.0597 22.1381 22.1828C22.013 22.3059 21.8435 22.375 21.6667 22.375C21.4899 22.375 21.3203 22.3059 21.1953 22.1828C21.0702 22.0597 21 21.8928 21 21.7188C21 21.5447 21.0702 21.3778 21.1953 21.2547C21.3203 21.1316 21.4899 21.0625 21.6667 21.0625C21.8435 21.0625 22.013 21.1316 22.1381 21.2547C22.2631 21.3778 22.3333 21.5447 22.3333 21.7188Z" fill="#FF69B4"/>
                                        </svg>
                                        
                                        <p style="font-size: 25px;">{{ totalCourses }}</p>
                                        <p style="color: #7F8D9C;">Courses</p>
                                    </div>

                                    <div class="total-overview-buttons" @click="goToPage('/main/masterlist/subjects')">
                                        <svg style="position: absolute; left: 20px; top: 20px;" width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M9.5 4.5H23V22.5H9.5V4.5Z" fill="#FFD700"/>
                                            <path d="M6.32656 24C6.32656 22.5 7.01563 22.5 7.65547 22.5H8V4.5H6.5C5.67031 4.5 5 5.17031 5 6V24C5 24.8297 5.67031 25.5 6.5 25.5H23V24H6.32656Z" fill="#FFD700"/>
                                        </svg>
                                        
                                        <p style="font-size: 25px;">{{ totalSubjects }}</p>
                                        <p style="color: #7F8D9C;">Subjects</p>
                                    </div>

                                    <div class="total-overview-buttons" @click="goToPage('/main/masterlist/rooms')">
                                        <svg style="position: absolute; left: 20px; top: 20px;" width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect width="24" height="24" transform="translate(3 3)" fill="white"/>
                                            <path d="M11.8973 4.52472C9.09452 4.92746 6.79726 5.25623 6.79315 5.26033C6.77671 5.26033 6.77671 24.7398 6.79315 24.7398C6.79726 24.7398 9.13151 25.0727 11.9795 25.4795C14.8274 25.8864 17.1699 26.2192 17.1863 26.2192C17.2068 26.2192 17.2192 21.1727 17.2192 15.0001V3.78088L17.1082 3.78499C17.0425 3.7891 14.7 4.11787 11.8973 4.52472ZM14.9795 13.8453C15.3247 14.0179 15.6164 14.3055 15.789 14.659C15.9247 14.9384 15.9247 14.9384 15.9247 15.5549V16.1754L15.7685 16.4877C15.5342 16.9644 15.1644 17.2686 14.6548 17.4001C13.9767 17.5768 13.1055 16.8823 12.9452 16.0275C12.7479 14.9918 13.2 14.0836 14.0671 13.7631C14.363 13.6521 14.6384 13.6768 14.9795 13.8453Z" fill="#A52A2A"/>
                                            <path d="M18.7808 6.36988V7.47947H19.8904H21V15V22.5206H19.8904H18.7808V23.6302V24.7397H21H23.2192V15V5.26029H21H18.7808V6.36988Z" fill="#A52A2A"/>
                                        </svg>
                                        
                                        <p style="font-size: 25px;">{{ totalRooms }}</p>
                                        <p style="color: #7F8D9C;">Rooms</p>
                                    </div>

                                </div>

                            </div>

                            
                        </div>
                    </transition>
                </div>

                <!-- 2nd column -->
                <div style="display: flex; flex-direction: column; gap: 20px; width: 360px;">

                    <!-- calendar -->
                    <transition name="fade-up" appear>
                        <div v-show="visible[1]" class="calendar">
                            <h2>{{ currentYear }}</h2>

                            <div
                            style="display: flex; flex-direction: row; justify-content: center; align-items: center; gap: 35px; margin-top: 8px; margin-bottom: 15px;"
                            >
                            <!-- Previous Month -->
                            <svg
                                class="arrow"
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                @click="prevMonth"
                            >
                                <path
                                d="M13.293 6.293 7.586 12l5.707 5.707 1.414-1.414L10.414 12l4.293-4.293z"
                                ></path>
                            </svg>

                            <h3 style="margin: 0; width: 100px; user-select: none;">{{ monthName }}</h3>

                            <!-- Next Month -->
                            <svg
                                class="arrow"
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                @click="nextMonth"
                            >
                                <path
                                d="M10.707 17.707 16.414 12l-5.707-5.707-1.414 1.414L13.586 12l-4.293 4.293z"
                                ></path>
                            </svg>
                            </div>

                            <hr class="divider" />

                            <!-- Calendar Grid -->
                            <div class="days">
                                <div v-for="day in dayNames" :key="day" class="day-name">{{ day }}</div>

                                <div
                                    v-for="(slot, index) in blankDays"
                                    :key="'b' + index"
                                ></div>

                                <div
                                    v-for="day in totalDays"
                                    :key="day"
                                    class="number"
                                    @click="toggleEventModal(day)"
                                    :class="{
                                        active: isToday(day)
                                    }"
                                >
                                    {{ day }}
                                    <span v-if="hasEvent(day)" class="event-line"></span>
                                </div>
                            </div>
                        </div>
                    </transition>

                    <!-- notes -->
                    <transition name="fade-up" appear>
                        <div v-show="visible[2]" style="display: flex; flex-direction: column; padding: 25px 16px; background-color: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); gap: 12px;">
                            <div style="display: flex; flex-direction: row; padding-bottom: 4px; padding: 0px 9px;">
                                <p style="font-size: 20px;" class="paragraph--black-bold">Notes</p>
                                <div class="add-note" @click="toggleNoteModal('add')">
                                    <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M17.3107 10.3107H11.6893V4.68921C11.6893 4.30829 11.3805 4 11 4C10.6196 4 10.3108 4.30829 10.3108 4.68921V10.3107H4.68924C4.3088 10.3107 4 10.6195 4 11C4 11.3809 4.3088 11.6893 4.68924 11.6893H10.3108V17.3107C10.3108 17.6917 10.6196 18 11 18C11.3805 18 11.6893 17.6917 11.6893 17.3107V11.6893H17.3107C17.6912 11.6893 18 11.3809 18 11C18 10.6195 17.6912 10.3107 17.3107 10.3107Z" fill="black"/>
                                    </svg>
                                </div>
                            </div>
                            
                            <!-- content -->
                            <div class="notes-container">
                                <!-- ✅ Show this message when there are no notes -->
                                <div v-if="notes.length === 0" style="text-align: center; color: #7F8D9C; font-style: italic;">
                                    Add new note
                                </div>

                                <div v-else v-for="(note, index) in notes"
                                    :key="note.note_id"
                                    class="note-item"
                                    >
                                    <svg class="svg-icon" style="width: 7px; height: 7px; fill: currentColor; overflow: hidden; flex-shrink: 0; margin-top: 7px;" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M512.006827 3.413333C792.855893 3.413333 1020.586667 231.10656 1020.586667 511.993173 1020.586667 792.8832 792.855893 1020.586667 512.006827 1020.586667S3.413333 792.85248 3.413333 511.993173 231.120213 3.413333 512.006827 3.413333z" />
                                    </svg>
                                    <p class="update-note" @click="toggleNoteModal('update', index)">{{ note.note }}</p>
                                    <div class="note-actions">
                                        <svg class="pin-icon" @click="togglePin(index)" style="width: 18px; height: 18px;vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M682.666667 512V170.666667h42.666666V85.333333H298.666667v85.333334h42.666666v341.333333l-85.333333 85.333333v85.333334h221.866667v256h68.266666v-256H768v-85.333334l-85.333333-85.333333z" :fill="note.pinned ? 'var(--color-primary)' : '#7F8D9C'"/></svg>
                                        <svg class="delete-icon" @click="deleteNote(index)" width="16" height="16" viewBox="0 0 30 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M11.1427 25.6427V11.4999C11.1427 11.313 11.0827 11.1587 10.9627 11.037C10.8427 10.9153 10.6884 10.8553 10.4998 10.857H9.21411C9.02726 10.857 8.87297 10.917 8.75126 11.037C8.62954 11.157 8.56954 11.3113 8.57126 11.4999V25.6427C8.57126 25.8296 8.63126 25.9839 8.75126 26.1056C8.87126 26.2273 9.02554 26.2873 9.21411 26.2856H10.4998C10.6867 26.2856 10.841 26.2256 10.9627 26.1056C11.0844 25.9856 11.1444 25.8313 11.1427 25.6427ZM16.2855 25.6427V11.4999C16.2855 11.313 16.2255 11.1587 16.1055 11.037C15.9855 10.9153 15.8313 10.8553 15.6427 10.857H14.357C14.1701 10.857 14.0158 10.917 13.8941 11.037C13.7724 11.157 13.7124 11.3113 13.7141 11.4999V25.6427C13.7141 25.8296 13.7741 25.9839 13.8941 26.1056C14.0141 26.2273 14.1684 26.2873 14.357 26.2856H15.6427C15.8295 26.2856 15.9838 26.2256 16.1055 26.1056C16.2273 25.9856 16.2873 25.8313 16.2855 25.6427ZM21.4284 25.6427V11.4999C21.4284 11.313 21.3684 11.1587 21.2484 11.037C21.1284 10.9153 20.9741 10.8553 20.7855 10.857H19.4998C19.313 10.857 19.1587 10.917 19.037 11.037C18.9153 11.157 18.8553 11.3113 18.857 11.4999V25.6427C18.857 25.8296 18.917 25.9839 19.037 26.1056C19.157 26.2273 19.3113 26.2873 19.4998 26.2856H20.7855C20.9724 26.2856 21.1267 26.2256 21.2484 26.1056C21.3701 25.9856 21.4301 25.8313 21.4284 25.6427ZM10.4998 5.71415H19.4998L18.5355 3.36386C18.4413 3.24386 18.3273 3.17015 18.1935 3.14272H11.8241C11.6904 3.17015 11.5764 3.24386 11.4821 3.36386L10.4998 5.71415ZM29.1427 6.357V7.64272C29.1427 7.82957 29.0827 7.98386 28.9627 8.10557C28.8427 8.22729 28.6884 8.28729 28.4998 8.28558H26.5713V27.3296C26.5713 28.4404 26.2567 29.4013 25.6275 30.2121C24.9984 31.023 24.2415 31.4284 23.357 31.4284H6.64268C5.75811 31.4284 5.00125 31.0367 4.37211 30.2533C3.74297 29.4699 3.4284 28.5227 3.4284 27.4119V8.28558H1.49983C1.31297 8.28558 1.15868 8.22557 1.03697 8.10557C0.915255 7.98557 0.855255 7.83129 0.856969 7.64272V6.357C0.856969 6.17015 0.916969 6.01586 1.03697 5.89415C1.15697 5.77243 1.31126 5.71243 1.49983 5.71415H7.70725L9.11383 2.35843C9.3144 1.863 9.67611 1.44129 10.199 1.09329C10.7218 0.745289 11.2507 0.571289 11.7855 0.571289H18.2141C18.749 0.571289 19.2778 0.745289 19.8007 1.09329C20.3235 1.44129 20.6853 1.863 20.8858 2.35843L22.2924 5.71415H28.4998C28.6867 5.71415 28.841 5.77415 28.9627 5.89415C29.0844 6.01415 29.1444 6.16843 29.1427 6.357Z" fill="#7F8D9C"/>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </transition>
                </div>
            </div>
        </main>

        <!-- Add Calendar Event Modal -->
        <transition name="fade">
            <div v-show="isVisibleEventModal" class="modal" style="z-index: 2;" @click.self="toggleEventModal()">
               <div class="add-event-modal-content">
                    <div style="display: flex; flex-direction: column; margin-right: auto; gap: 4px;">
                        <h3 style="line-height: 0; margin: 10px 0; font-size: x-large;">{{ modalEventLabel }}</h3>
                        <label>{{ eventDate }}</label>
                    </div>
                        
                    <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; margin-bottom: 20px;">
                        <div>
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Event Name</p>
                            <div style="position: relative; width: 100%;">
                                <input v-model="inputEventName" :class="{ 'error-input-border': showErrorInput && inputEventName.trim() === '' }"></input>
                            </div>
                        </div>

                    </div>

                    <div style="display: flex; flex-direction: row; width: 100%;">
                      <button v-show="isDeleteEventVisible" @click="deleteEvent()" class="outlineBtn" style="font-size: 1.2rem; padding: 3px 6px;">
                          <i class='bx bx-trash'></i>
                      </button>
                      <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto;">
                          <button @click="toggleEventModal()" class="cancelBtn">Cancel</button>
                          <button @click="eventConfirm()">Confirm</button>
                      </div>
                    </div>

               </div>
            </div>
        </transition>

        <!-- Add / Rename Note Modal -->
        <transition name="fade">
            <div v-show="isVisibleNoteModal" class="modal" @click.self="toggleNoteModal('cancel')">
               <div class="modal-content-note-input">
                    <h2 style="align-self: flex-start; line-height: 0; margin: 12px 0px;">{{ noteTitle }}</h2>

                    <div style="display: flex; flex-direction: column; width: 100%; gap: 14px;">
                        <!-- Note -->
                        <div>
                            <p class="paragraph--black-bold" style="line-height: 1.8; margin-bottom: 4px;">Note</p>
                            <textarea
                                v-model="inputNote"
                                maxlength="500"
                                style="height: 120px; width: 100%; min-height: 70px; max-height: 350px; max-width: 100%; padding: 8px; margin-bottom: 6px; border-radius: 6px; resize: vertical; box-sizing: border-box; background-color: #ffffff; border: 1px solid var(--color-border); color: black; font-family: var(--font-inter);"
                                :class="{ 'error-input-border': showErrorInput && !isInputNoteOk }">
                            </textarea>
                            <div style="display: flex; flex-direction: row;">
                                <label v-show="showErrorInput && !isInputNoteOk" style="color: red; font-size: 0.95rem; margin-right: auto;">{{ errorMessage }}</label>
                                <small style="margin-left: auto; color: gray;">{{ inputNote.length }}/500</small>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto;">
                        <button @click="toggleNoteModal('cancel')" class="cancelBtn">Cancel</button>
                        <button @click="noteConfirm()">Confirm</button>
                    </div>
               </div>
            </div>
        </transition>

        <!-- Delete Modal -->
        <transition name="fade">
            <div v-show="isVisibleDeleteModal" class="modal" @click.self="toggleDeleteModal"> 
                <div class="delete-modal-content">
                    <div style="display: flex; flex-direction: column; width: 100%; gap: 24px;">
                        <div style="display: flex; flex-direction: row; gap: 10px; align-items: center; justify-content: start;">
                            <svg class="svg-icon" style="width: 2.5em; height: 2.5em; vertical-align: middle;fill: #b84343;overflow: hidden;" viewBox="188 129 648 784" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M779.3 228.2h-113v-35.4c0-34.9-28.4-63.3-63.3-63.3H425c-34.9 0-63.3 28.4-63.3 63.3v35.4h-113c-32.9 0-59.7 26.8-59.7 59.7v38.5c0 32.9 26.8 59.7 59.7 59.7h1.8v412.8c0 54.1 44 98.1 98.1 98.1h330.9c54.1 0 98.1-44 98.1-98.1V386.1h1.8c32.9 0 59.7-26.8 59.7-59.7v-38.5c-0.1-32.9-26.8-59.7-59.8-59.7z m-374.9-35.4c0-11.4 9.2-20.6 20.6-20.6h178c11.4 0 20.6 9.2 20.6 20.6v35.4H404.4v-35.4z m330.4 606c0 30.5-24.8 55.4-55.4 55.4H348.5c-30.5 0-55.4-24.8-55.4-55.4V386.1h441.7v412.7z m61.5-472.4c0 9.4-7.6 17-17 17H248.7c-9.4 0-17-7.6-17-17v-38.5c0-9.4 7.6-17 17-17h530.7c9.4 0 17 7.6 17 17v38.5z"  /><path d="M377.9 462.3h42.7v317.5h-42.7zM492.6 462.3h42.7v317.5h-42.7zM607.4 462.3h42.7v317.5h-42.7z"  /></svg>
                            <h3 style="line-height: 0; font-size: x-large; margin: 10px 0px;">Delete Confirmation</h3>
                        </div>
                        
                        <p>Are you sure you want to delete this?</p>

                        <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto; margin-top: 12px;">
                            <button @click="toggleDeleteModal" class="cancelBtn">Cancel</button>
                            <button @click="confirmDelete()"  class="delete-btn">Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        </transition>

        <!-- Schedule Conflicts Modal -->
        <transition name="fade">
        <div
            v-show="isVisibleScheduleConflictsModal"
            class="modal"
            @click.self="toggleScheduleConflictsModal()"
        >
            <div class="modal-content-schedule-conflicts">
            <h2 style="align-self: flex-start; line-height: 0; margin: 12px 0px;">
                Conflict Logs
            </h2>

            <div style="width: 100%;">
                <table class="conflict-table">
                <thead>
                    <tr>
                    <th>#</th>
                    <th>Section A</th>
                    <th>Section B</th>
                    <th>Reason</th>
                    <th>Day</th>
                    <th>Overlap</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="conflicts.length === 0">
                    <td colspan="6" style="text-align: center; color: #7F8D9C; font-style: italic;">
                        No conflicts.
                    </td>
                    </tr>
                    <tr v-else v-for="(conflict, index) in conflicts" :key="index">
                    <td>{{ index + 1 }}</td>
                    <td>{{ conflict.a_section }}</td>
                    <td>{{ conflict.b_section }}</td>
                    <td>{{ conflict.reason }}</td>
                    <td>{{ conflict.day }}</td>
                    <td>{{ conflict.overlap }}</td>
                    </tr>
                </tbody>
                </table>
            </div>

            <button
                @click="toggleScheduleConflictsModal()"
                class="cancelBtn"
                style="align-self: flex-end; margin-top: auto;">
                Close
            </button>
            </div>
        </div>
        </transition>
    </div>
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
        gap: 0px;
        max-width: 1800px;
    }


    /* Card */
    .card-glare {
        position: relative;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        max-width: 100%;
        height: 250px;
        background: linear-gradient(to right, #0785D4, #87D3FF);
        border-radius: 8px;
        padding: 25px 50px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        overflow: hidden;
        box-sizing: border-box;
    }

    .card-glare .glare {
        content: '';
        position: absolute;
        top: 0;
        left: -75%;
        width: 50%;
        height: 100%;
        background: linear-gradient(
            120deg,
            rgba(255,255,255,0) 0%,
            rgba(255,255,255,0.4) 50%,
            rgba(255,255,255,0) 100%
        );
        transform: skewX(-20deg);
        animation: glareOnce 1.5s forwards; /* one-time animation */
    }

    @keyframes glareOnce {
        0% { left: -75%; }
        100% { left: 125%; }
    }

    .add-event-modal-content {
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
        gap: 12px;
        overflow-y: auto;
    }

    .unassigned-sections {
        position: relative; /* important for overlay */
        flex: 1;
        min-width: 250px;
        max-height: 120px;
        border-radius: 8px;
        background-color: #E5FFE6; /* default */
        border: 1px solid transparent;
        padding: 20px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: border 0.2s, background-color 0.2s;
        cursor: pointer;
    }

    .unassigned-sections:hover {
        border: 1px solid #1A401C;
    }

    .unassigned-sections.has-unassigned {
        background-color: #FEF9C3;
    }

    .unassigned-sections.has-unassigned:hover {
        border: 1px solid #854D0E;
    }

    .content.blurred {
        position: relative;
        filter: blur(3px);
        pointer-events: none; /* prevent clicks */
    }

    .unassigned-sections .overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(235, 235, 235, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 1rem;
        z-index: 10;
        border-radius: 8px;
        pointer-events: none; /* allow clicks to pass through? Remove if needed */
    }

    .schedule-conflicts {
        position: relative;
        flex: 1;
        min-width: 250px;
        max-height: 120px;
        border-radius: 8px;
        background-color: #E5FFE6;
        border: 1px solid transparent;
        padding: 20px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: border 0.2s;
    }

    .schedule-conflicts:hover {
        border: 1px solid #1A401C;
    }

    .schedule-conflicts.has-conflict {
        background-color: #FEE2E2;
    }

    .schedule-conflicts.has-conflict:hover {
        border: 1px solid #991B1B;
    }

    .schedule-conflicts .content.blurred {
        filter: blur(3px);
        pointer-events: none; /* prevent clicks while blurred */
    }

    .schedule-conflicts .overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(235, 235, 235, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 1rem;
        z-index: 10;
        border-radius: 8px;
        pointer-events: none;
    }

    .conflict-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
    }

    .conflict-table th,
    .conflict-table td {
        border: 1px solid #ccc;
        padding: 6px 8px;
        text-align: center;
    }

    .conflict-table th {
        background-color: #f4f4f4;
        font-weight: bold;
    }

    /* Schedule Today */
    .todays-schedule-container {
        display: flex; 
        flex-direction: column; 
        min-width: 380px; 
        height: 420px; 
        overflow: hidden; 
        max-width: 100%; 
        padding: 20px 26px; 
        background-color: white; 
        border-radius: 12px; 
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); 
        gap: 12px;
    }

    .day-card {
        padding: 6px 0px; 
        width: 50px; 
        border: 1px solid var(--color-primary);
        border-radius: 4px; 
        text-align: center;
        user-select: none;
    }

    .day-card > p {
        color: var(--color-primary);
    }

    .day-card:hover {
        background-color: var(--color-lightgray-hover);
        transition: 0.1s ease-in-out;
    }

    /* Calendar */
    .calendar {
    width: auto;
    height: auto;
    padding: 25px;
    border-radius: 8px;
    text-align: center;
    background-color: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .calendar h2 {
    margin: 0;
    font-size: 35px;
    color: var(--color-primary);
    }

    .calendar h3 {
    margin: 5px 0 15px;
    font-size: 18px;
    font-weight: normal;
    }

    .days {
    position: relative;
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 5px;
    }

    .days div {
    padding: 8px;
    border-radius: 50%;
    }

    .day-name {
    font-weight: bold;
    color: black;
    }

    .number {
    cursor: pointer;
    transition: 0.3s;
    color: black;
    user-select: none;
    }

    .number:hover {
    background: var(--color-lightgray-hover);
    }

    .active {
    background: var(--color-primary);
    color: white;
    }

    .number.active:hover {
    background: var(--color-primary);
    color: white;
    }

    
    .event-line {
        position: absolute;
        display: block;
        width: 26px;
        height: 3px;
        background-color: orange;
        margin-top: 10px;
        border-radius: 2px;
    }

    .arrow {
    fill: black;
    cursor: pointer;
    transition: transform 0.2s ease, fill 0.2s ease;
    }

    .arrow:hover {
    transform: scale(1.4);
    }

    .arrow:active {
    transform: scale(0.9);
    fill: var(--color-primary);
    }


    .total-overview-buttons {
        position: relative; 
        display: flex; 
        padding: 18px 0px; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        gap: 4px; 
        background-color: #F7F8FA; 
        border-radius: 6px; 
        border: 1px solid transparent;
        box-shadow: rgba(0, 0, 0, 0.20) 0px 0px 4px;
        transition: all 0.2s ease-in-out;
        cursor: pointer;
    }

    .total-overview-buttons:hover {
        border: 1px solid var(--color-primary);
    }


    /* Note */
    .add-note {
        display: flex; 
        align-items: center; 
        justify-content: center; 
        padding: 4px; 
        margin-left: auto; 
        background-color: var(--color-lightgray);
        box-shadow: 0 0px 4px rgba(0, 0, 0, 0.1); 
        border: 1px solid rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        transition: all 0.2s ease;
        cursor: pointer;
    }

    .add-note:hover {
        background-color: var(--color-secondary);
        box-shadow: 0 0px 4px var(--color-primary);
    }

    .add-note:active {
        scale: 0.85;
    }

    .notes-container {
        display: flex; 
        flex-direction: column;
        gap: 12px;
        max-height: 250px;  
        padding-bottom: 4px; 
        overflow-y: auto; 
        overflow-x: hidden;
        padding: 0px 9px;
    }

    .note-item {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        gap: 8px;
        width: 100%;
    }

    .update-note {
        flex: 1;
        word-break: break-all;
        overflow-wrap: anywhere;
        white-space: normal;
        margin-right: 4px;
        transition: color 0.1s ease-in-out;
        cursor: pointer;

        /* ✅ Ellipsis after 3 lines */
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .update-note:hover {
        color: var(--color-primary);
    }

    .note-actions {
        display: flex;
        flex-direction: row;
        gap: 4px;
        align-items: center;
        flex-shrink: 0;
    }

    .delete-icon, .pin-icon {
        cursor: pointer;
        transition: fill 0.3s ease;
    }

    .delete-icon path, .pin-icon path {
        transition: fill 0.3s ease;
    }

    .delete-icon:hover path {
        fill: #A83838; /* hover color (e.g. DodgerBlue) */
    }

    .pin-icon:hover path {
        fill: #1E90FF; /* hover color (e.g. DodgerBlue) */
    }

    .modal-content-note-input {
        display: flex;
        flex-direction: column;
        background-color: white;
        height: auto;
        align-items: center;
        width: 420px;
        padding-top: 35px;
        padding-bottom: 35px;
        padding-left: 45px;
        padding-right: 45px;
        box-shadow: -2px 0 8px rgba(0,0,0,0.2);
        border-radius: 6px;
        gap: 20px;
    }

    .modal-content-schedule-conflicts {
        display: flex;
        flex-direction: column;
        background-color: white;
        height: 450px;
        width: 850px;
        align-items: center;
        padding-top: 35px;
        padding-bottom: 35px;
        padding-left: 45px;
        padding-right: 45px;
        box-shadow: -2px 0 8px rgba(0,0,0,0.2);
        border-radius: 6px;
        gap: 20px;
    }
</style>