<script setup>
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { ref, onMounted } from 'vue'
import axios from 'axios'


async function exportPDF() {
  const element = document.getElementById('pdf-content')

  const canvas = await html2canvas(element, { scale: 2 })
  const imgData = canvas.toDataURL('image/png')

  const pdf = new jsPDF('p', 'mm', 'letter')
  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
  pdf.save('schedule.pdf')
}
</script>

<template>
  <div class="pdf-container">
    <!-- 📄 Content that will be captured for PDF -->
    <div id="pdf-content" class="pdf-box">

        <!-- Logo + School details -->
        <div style="display: flex; flex-direction: row; gap: 10px; align-items: center; justify-content: center;">
            <img src="@/assets/login/lccn_logo.webp" id="LCCN-logo" style="width: 95px; height: 95px;"/>
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
                <p style="font-weight: 600;">FIRST SEMESTER - AY 2025-2026</p>
            </div>

            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <label style="font-weight: 600;">BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY</label>
                <label style="font-weight: bold; font-size: 22px; line-height: 1; margin-top: 5px; text-decoration: underline;">FOURTH YEAR</label>
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
</style>
