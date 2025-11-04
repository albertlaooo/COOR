<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import axios from 'axios'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { store } from '../store.js'

//#region 🧱 REFS & STATE
const subjectIdToExport = computed(() => store.sectionId) // Section Individual
const bulkSectionIdToExport = computed(() => store.bulkSectionId) // Section All
const isItBulk = ref(false)

const semesterAY = ref('')
const course = ref('')
const year = ref('')

// Section Individual
watch(subjectIdToExport, async (newId) => {
  if (newId) {
    console.log('ScheduleExport detected new sectionId:', newId)
    await fetchSectionById()
    await fetchScheduleAssignments()
    await fetchSectionScheduleAssignments()
    await fetchTimeColumn()
    exportPDF()
  }
})


// Bulk Section Id
watch(bulkSectionIdToExport, async (newVal) => {
  if (Array.isArray(newVal) && newVal.length > 0) {
    console.log('Exporting all sections:', newVal)
    isItBulk.value = true

    const zip = new JSZip()

    for (const id of newVal) {
      try {
        // 🔹 Update the section ID being processed
        store.sectionId = id
        await fetchSectionById(id)
        await fetchScheduleAssignments()
        await fetchSectionScheduleAssignments()
        await fetchTimeColumn()

        // 🔹 Generate the PDF in memory
        const element = document.getElementById('pdf-content')
        const canvas = await html2canvas(element, { scale: 2 })
        const imgData = canvas.toDataURL('image/png')

        const pdf = new jsPDF('p', 'mm', 'letter')
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)

        const fileName = `${sectionsDB.value.section_format}_${sectionsDB.value.academic_year}`
          .replace(/\s+/g, '_')

        // 🔹 Add to ZIP as Blob
        const pdfBlob = pdf.output('blob')
        zip.file(`${fileName}.pdf`, pdfBlob)

        console.log(`Added ${fileName}.pdf to zip`)
      } catch (err) {
        console.error(`Failed to export section ${id}:`, err)
      }
    }

    // 🔹 Once all are processed, generate the zip and download
    const zipBlob = await zip.generateAsync({ type: 'blob' })

    if(store.byCourseOrAll === 'all'){
      const semLabel = sectionsDB.value.semester == 1 ? 'Sem1' : 'Sem2';
      saveAs(zipBlob, `Sections_${semLabel}_${sectionsDB.value.academic_year}.zip`);
    }

    else if(store.byCourseOrAll === 'byCourse'){
      const semLabel = sectionsDB.value.semester == 1 ? 'Sem1' : 'Sem2';
      const fileName = `${sectionsDB.value.course_name}_${semLabel}_${sectionsDB.value.academic_year}`.replace(/\s+/g, '_');
      saveAs(zipBlob, `${fileName}.zip`);
    }

    store.exportDone = true
    isItBulk.value = false
    console.log('✅ All sections exported and zipped successfully!')
  }
})

// Fetched Data from DB
const scheduleAssignmentDB = ref([])
const sectionsDB = ref([])

const days = ['Mon', 'Tue', 'Wed', 'Thurs', 'Fri', 'Sat']

// SCHEDULE DATA
const schedule = ref({})
const scheduleDetails = ref([])
const times = ref([])
const defaultTimes = [
  '07:00-09:00',
  '10:00-13:00',
  '13:30-15:00',
  '15:00-16:30',
  '16:30-17:00'
].map(parseTimeRange)
//#endregion

//#region FETCHED DATA FROM DB
const fetchSectionById = async (id) => {
  try {
    const response = await fetch(`http://localhost:3000/sections/${subjectIdToExport.value}`);
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    sectionsDB.value = await response.json();

    // Map numeric semester to text
    const semesterMap = {
      1: 'FIRST SEMESTER',
      2: 'SECOND SEMESTER'
    };

    // Map numeric year to text
    const yearMap = {
      1: 'FIRST YEAR',
      2: 'SECOND YEAR',
      3: 'THIRD YEAR',
      4: 'FOURTH YEAR'
    };

    semesterAY.value = `${semesterMap[sectionsDB.value.semester] || ''} - ${sectionsDB.value.academic_year}`;
    course.value = sectionsDB.value.course_name.toUpperCase();
    year.value = yearMap[sectionsDB.value.year] || '';
  } catch (err) {
    console.error(err);
  }
};

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
    const res = await axios.get(`http://localhost:3000/get-schedule/${subjectIdToExport.value}`)
    if (res.data.success) {
      schedule.value = res.data.schedule // assign the fetched object to schedule.value
      console.log('Fetched schedule:', schedule.value)
    } else {
      console.warn('No schedule found for this section')
      schedule.value = {} // reset if nothing found
    }
    // Populate scheduleDetails dynamically
      loadScheduleDetails()
  } catch (err) {
    console.error('Error fetching schedule:', err)
  } 
}

const fetchTimeColumn = async () => {
  try {
    const res = await axios.get(`http://localhost:3000/get-times/${subjectIdToExport.value}`)
    if (res.data.success && res.data.times.length > 0) {
      times.value = res.data.times.map(t => ({ start: t.start_time, end: t.end_time }));
    } else {
      // Use default times if nothing returned
      times.value = defaultTimes
    }
  } catch (err) {
    console.error('Error fetching times:', err)
    // Use default times if error occurs
    times.value = defaultTimes
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

const loadScheduleDetails = () => {
  const details = []

  for (const day of Object.keys(schedule.value)) {
    const timeslots = schedule.value[day]
    for (const timeRange of Object.keys(timeslots)) {
      const item = timeslots[timeRange]
      details.push({
        code: item.subject_code || 'N/A',
        title: item.subject || 'N/A',
        professor: item.teacher || 'N/A',
        gender: item.gender || 'N/A'
      })
    }
  }

  // Remove duplicates
  const uniqueDetails = []
  const seen = new Set()

  for (const d of details) {
    const key = `${d.code}|${d.title}|${d.professor}|${d.gender}`
    if (!seen.has(key)) {
      seen.add(key)
      uniqueDetails.push(d)
    }
  }

  scheduleDetails.value = uniqueDetails
  console.log('Unique scheduleDetails:', scheduleDetails.value)
}
//#endregion

const formatTeacher = (teacherFull, gender, showFull = false) => {
  if (!teacherFull || teacherFull === 'null') return 'N/A';

  const prefix = gender === 'male' ? 'Mr.' : gender === 'female' ? 'Ms.' : '';
  const [lastName, firstName] = teacherFull.split(',').map(s => s.trim());

  if (showFull && firstName) {
    // Mr. Smith, John
    return `${prefix} ${lastName}, ${firstName}`;
  } else {
    // Mr. Smith
    return `${prefix} ${lastName}`;
  }
};

async function exportPDF() {
  const element = document.getElementById('pdf-content')

  const canvas = await html2canvas(element, { scale: 2 })
  const imgData = canvas.toDataURL('image/png')

  const pdf = new jsPDF('p', 'mm', 'letter')
  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
  const fileName = `${sectionsDB.value.section_format}_${sectionsDB.value.academic_year}`.replace(/\s+/g, '_');

  if(!isItBulk.value){
    pdf.save(`${fileName}.pdf`);

    // ✅ Signal ClassScheduling.vue that export is done
    store.exportDone = true
  }


}
</script>

<template>
  <div class="pdf-container">
    <!-- 📄 Content that will be captured for PDF -->
    <div id="pdf-content" class="pdf-box">

        <!-- Logo + School details -->
        <div style="display: flex; flex-direction: row; gap: 10px; align-items: center; justify-content: center;">
            <img src="@/assets/login/lccn_logo.webp" id="LCCN-logo" style="width: 105px; height: 105px;"/>
            <div style="display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <label style="font-family: 'Satisfy', cursive; font-size: 2.4rem;">La Consolacion College</label>
                <label style="font-size: 0.95rem; font-weight: 600; line-height: 1;">Villa Maria Subd., Deparo, Novaliches, Caloocan City</label>
                <label style="font-size: 0.95rem; font-weight: 600; line-height: 1.3;">Telephone Nos.: 8-2871013 • 8-2806156</label>
                <label style="font-size: 0.8rem; font-weight: 600; line-height: 1.3;">Email Add.: lacoco_rdo@yahoo.com.ph</label>
                <label style="font-size: 0.8rem; font-weight: 600; line-height: 1.3;">FB Page: La Consolacion College of Deparo, Novaliches</label>
            </div> 
        </div>
    
        <!-- Section Details -->
        <div style="display: flex; flex-direction: column; gap: 18px; margin-top: 35px; margin-bottom: 25px;">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <h1 style="font-size: 22px; line-height: 1; margin-bottom: 5px; font-weight: bold;">COLLEGE CLASS PROGRAM</h1>
                <p style="font-weight: 600;">{{ semesterAY }}</p>
            </div>

            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <label style="font-weight: 600;">{{ course }}</label>
                <label style="font-weight: bold; font-size: 22px; line-height: 1; margin-top: 5px; text-decoration: underline;">{{ year }}</label>
            </div>

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
                    </div>

                <div v-for="day in days" 
                    :key="day" 
                    class="cell">
                    <template v-if="schedule[day] && schedule[day][`${formatTime(time.start)}-${formatTime(time.end)}`]">
                        <p>Rm: {{ schedule[day][`${formatTime(time.start)}-${formatTime(time.end)}`].room }}</p>
                        <div style="display: flex; flex-direction: row; gap: 4px;">
                            <p>{{ schedule[day][`${formatTime(time.start)}-${formatTime(time.end)}`].subject_code }}</p>
                        </div>
                        <p>
                          {{
                            formatTeacher(
                              schedule[day][`${formatTime(time.start)}-${formatTime(time.end)}`].teacher,
                              schedule[day][`${formatTime(time.start)}-${formatTime(time.end)}`].gender
                            )
                          }}
                        </p>
                        
                    </template>
                </div>
            </template>
        </div>

        <!-- Table Details -->
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>SUBJECT CODE</th>
              <th>DESCRIPTIVE TITLE</th>
              <th>PROFESSOR</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(subject, index) in scheduleDetails" :key="index">
              <td>{{ subject.code }}</td>
              <td>{{ subject.title }}</td>
              <td>{{ formatTeacher(subject.professor, subject.gender, true) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 🖨️ Export button -->
    <button @click="exportPDF" class="export-btn">Export PDF</button>
  </div>
</template>

<style scoped>
.pdf-container {
  padding: 30px;
  background-color: #f5f6fa;
  min-height: 100vh;
  box-sizing: border-box;

  position: absolute; 
  top: -9999px; 
  left: -9999px;
}

.pdf-box {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
  width: 800px;
  margin: 0 auto 20px auto;
}


.export-btn {
  display: block;
  margin: 0 auto;
  padding: 10px 20px;
  border: none;
  background: #3498db;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
}

.export-btn:hover {
  background: #2980b9;
}

/* =============================
   🗓️ SCHEDULE GRID
============================= */
.schedule-grid {
    display: grid;
    grid-template-columns: minmax(95px, auto) repeat(6, 1fr);
    grid-auto-rows: auto;
    width: 100%; /* ensure grid doesn't overflow container */
    text-align: center;
    border-collapse: collapse;
    margin-bottom: 20px;
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
    height: 38px;
    font-size: 14px;
}

.time-label {
    background-color: #3571B7;
}

/* Time Column */
.time {
    height: 75px;
    border: 1px solid rgba(179, 179, 179, 0.6);
    background-color: #6799C8;
    color: white;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all ease 0.1s;
    font-size: 14px;
}

/* Default Cell */
.cell {
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(179, 179, 179, 0.6);
    text-align: center;
    justify-content: center;
    align-items: center; /* Center all children horizontally */
    padding: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all ease 0.1s;
    min-width: 110px;
    width: 100%; /* ensure full width */
    box-sizing: border-box;
    word-break: break-word; /* allow text to wrap */
}

/* Room and Teacher */
.cell > p:nth-of-type(1),
.cell > p:nth-of-type(2) {
  display: inline-block; 
  width: auto;
  max-width: 95%; 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis;
  text-align: center;
  font-weight: 600;
}

.cell > div {
  margin: 2px 0;
  height: 18px;
  justify-content: center; /* Center horizontally */
  align-items: center;     /* Center vertically */  
  gap: 4px;
  width: 100%; /* Optional: make it span full cell width */
}

/* Subject */
.cell > div > p:nth-of-type(1) {
  display: inline-block; 
  width: auto;
  max-width: 95%; 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis;
  font-size: 14px;
  text-align: center; /* Ensure text is centered */
}

/* Highlight Filled Cells */
.cell:not(:empty) {
    background-color: #dff0d8;
    border-color: #b2d8b2;
    color: #333;
    transition: all ease 0.1s;
}

/* =============================
   🗓️ SCHEDULE DETAILS
============================= */
/* Container */
.table-container {
  width: 100%;
  overflow-x: auto; /* Horizontal scroll if table is too wide */
  margin-top: 1rem;
  font-family: Arial, sans-serif;
}

/* Table Styles */
.table-container table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  min-width: 500px; /* optional */
}

.table-container thead th {
  color: white;
  padding: 8px 12px;
  font-weight: bold;
  font-size: 14px;
  vertical-align: middle;
}

/* Table Header */
.table-container thead th:nth-child(1) {
  background-color: #3571B7; /* Blue header */
}

.table-container thead th:nth-child(2) {
  background-color: #009CC6; /* Blue header */
}

.table-container thead th:nth-child(3) {
  background-color: #009CC6; /* Blue header */
  border-left: 1px solid rgba(179, 179, 179, 0.6);
}

/* Table Body */
.table-container tbody td {
  padding: 8px 12px;
  border: 1px solid rgba(179, 179, 179, 0.6);
  font-size: 14px;
}

</style>
