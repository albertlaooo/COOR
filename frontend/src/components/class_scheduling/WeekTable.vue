<script setup>
import { useRouter, useRoute } from 'vue-router'
import { ref, onMounted } from 'vue'
import axios from "axios";

const selectedSection = ref([])

const isVisibleTeachers = ref(false)
const isVisibleSubjects = ref(false)

//#region 🧭 ROUTER
const route = useRoute()
onMounted(() => {
  if (route.query.data) {
    selectedSection.value = JSON.parse(route.query.data)
    console.log('✅ Received:', selectedSection.value)
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
                                    <tr>
                                        <td class="center">PH1001</td>
                                        <td class="truncate">Philippine Historyasdasdasdasdsad</td>
                                        <td class="center">3 hrs</td>
                                        <td class="center">Lecture</td>
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
                <!-- Top Row -->
                <div class="time-label">Time</div>
                <div class="day">Mon</div>
                <div class="day">Tue</div>
                <div class="day">Wed</div>
                <div class="day">Thurs</div>
                <div class="day">Fri</div>
                <div class="day">Sat</div>

                <!-- Row 1 -->
                <div class="time">7:00–9:00
                    <svg class="svg-icon" style="width: 20px; height: 20px; margin-left: 5px; vertical-align: middle; fill: currentcolor; overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
                        <path d="M423.381333 85.333333a42.666667 42.666667 0 0 1 4.992 85.034667L423.381333 170.666667H246.186667a75.52 75.52 0 0 0-75.221334 69.290666L170.666667 246.186667v531.712c0 39.594667 30.506667 72.106667 69.290666 75.221333L246.186667 853.333333h531.712a75.52 75.52 0 0 0 75.221333-69.290666L853.333333 777.813333v-177.237333a42.666667 42.666667 0 0 1 85.034667-4.992l0.298667 4.992v177.237333a160.853333 160.853333 0 0 1-152.533334 160.597334L777.813333 938.666667H246.144a160.853333 160.853333 0 0 1-160.597333-152.533334L85.333333 777.813333V246.144a160.853333 160.853333 0 0 1 152.533334-160.597333L246.186667 85.333333h177.237333z" fill="white"></path>
                        <path d="M716.501333 119.168a133.162667 133.162667 0 0 1 194.133334 182.186667l-5.802667 6.144-362.666667 362.666666a42.666667 42.666667 0 0 1-24.576 12.117334L512 682.666667H384a42.666667 42.666667 0 0 1-42.368-37.674667L341.333333 640v-128a42.666667 42.666667 0 0 1 8.789334-25.941333l3.712-4.266667 362.666666-362.666667z m128 60.330667a47.872 47.872 0 0 0-63.488-3.712l-4.181333 3.712L426.666667 529.664v67.626667h67.626666l350.208-350.122667a47.872 47.872 0 0 0 3.712-63.488l-3.712-4.181333z" fill="white"></path>
                        <path d="M652.501333 183.168a42.666667 42.666667 0 0 1 56.32-3.541333l4.010667 3.541333 128 128a42.666667 42.666667 0 0 1-56.32 63.872l-4.010667-3.541333-128-128a42.666667 42.666667 0 0 1 0-60.330667z" fill="white"></path>
                    </svg>
                </div>
                <div class="cell"></div>
                <div class="cell"></div>
                <div class="cell"></div>
                <div class="cell"></div>
                <div class="cell"></div>
                <div class="cell"></div>

                <!-- Row 2 -->
                <div class="time">10:00–1:00
                    <svg class="svg-icon" style="width: 20px; height: 20px; margin-left: 5px; vertical-align: middle; fill: currentcolor; overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
                        <path d="M423.381333 85.333333a42.666667 42.666667 0 0 1 4.992 85.034667L423.381333 170.666667H246.186667a75.52 75.52 0 0 0-75.221334 69.290666L170.666667 246.186667v531.712c0 39.594667 30.506667 72.106667 69.290666 75.221333L246.186667 853.333333h531.712a75.52 75.52 0 0 0 75.221333-69.290666L853.333333 777.813333v-177.237333a42.666667 42.666667 0 0 1 85.034667-4.992l0.298667 4.992v177.237333a160.853333 160.853333 0 0 1-152.533334 160.597334L777.813333 938.666667H246.144a160.853333 160.853333 0 0 1-160.597333-152.533334L85.333333 777.813333V246.144a160.853333 160.853333 0 0 1 152.533334-160.597333L246.186667 85.333333h177.237333z" fill="white"></path>
                        <path d="M716.501333 119.168a133.162667 133.162667 0 0 1 194.133334 182.186667l-5.802667 6.144-362.666667 362.666666a42.666667 42.666667 0 0 1-24.576 12.117334L512 682.666667H384a42.666667 42.666667 0 0 1-42.368-37.674667L341.333333 640v-128a42.666667 42.666667 0 0 1 8.789334-25.941333l3.712-4.266667 362.666666-362.666667z m128 60.330667a47.872 47.872 0 0 0-63.488-3.712l-4.181333 3.712L426.666667 529.664v67.626667h67.626666l350.208-350.122667a47.872 47.872 0 0 0 3.712-63.488l-3.712-4.181333z" fill="white"></path>
                        <path d="M652.501333 183.168a42.666667 42.666667 0 0 1 56.32-3.541333l4.010667 3.541333 128 128a42.666667 42.666667 0 0 1-56.32 63.872l-4.010667-3.541333-128-128a42.666667 42.666667 0 0 1 0-60.330667z" fill="white"></path>
                    </svg>
                </div>
                <div class="cell"></div><div class="cell"></div><div class="cell"></div>
                <div class="cell"></div><div class="cell"></div><div class="cell"></div>

                <!-- Row 3 -->
                <div class="time">1:30–3:00
                    <svg class="svg-icon" style="width: 20px; height: 20px; margin-left: 5px; vertical-align: middle; fill: currentcolor; overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
                        <path d="M423.381333 85.333333a42.666667 42.666667 0 0 1 4.992 85.034667L423.381333 170.666667H246.186667a75.52 75.52 0 0 0-75.221334 69.290666L170.666667 246.186667v531.712c0 39.594667 30.506667 72.106667 69.290666 75.221333L246.186667 853.333333h531.712a75.52 75.52 0 0 0 75.221333-69.290666L853.333333 777.813333v-177.237333a42.666667 42.666667 0 0 1 85.034667-4.992l0.298667 4.992v177.237333a160.853333 160.853333 0 0 1-152.533334 160.597334L777.813333 938.666667H246.144a160.853333 160.853333 0 0 1-160.597333-152.533334L85.333333 777.813333V246.144a160.853333 160.853333 0 0 1 152.533334-160.597333L246.186667 85.333333h177.237333z" fill="white"></path>
                        <path d="M716.501333 119.168a133.162667 133.162667 0 0 1 194.133334 182.186667l-5.802667 6.144-362.666667 362.666666a42.666667 42.666667 0 0 1-24.576 12.117334L512 682.666667H384a42.666667 42.666667 0 0 1-42.368-37.674667L341.333333 640v-128a42.666667 42.666667 0 0 1 8.789334-25.941333l3.712-4.266667 362.666666-362.666667z m128 60.330667a47.872 47.872 0 0 0-63.488-3.712l-4.181333 3.712L426.666667 529.664v67.626667h67.626666l350.208-350.122667a47.872 47.872 0 0 0 3.712-63.488l-3.712-4.181333z" fill="white"></path>
                        <path d="M652.501333 183.168a42.666667 42.666667 0 0 1 56.32-3.541333l4.010667 3.541333 128 128a42.666667 42.666667 0 0 1-56.32 63.872l-4.010667-3.541333-128-128a42.666667 42.666667 0 0 1 0-60.330667z" fill="white"></path>
                    </svg>
                </div>
                <div class="cell"></div><div class="cell"></div><div class="cell"></div>
                <div class="cell"></div><div class="cell"></div><div class="cell"></div>

                <!-- Row 4 -->
                <div class="time">3:00–4:30
                    <svg class="svg-icon" style="width: 20px; height: 20px; margin-left: 5px; vertical-align: middle; fill: currentcolor; overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
                        <path d="M423.381333 85.333333a42.666667 42.666667 0 0 1 4.992 85.034667L423.381333 170.666667H246.186667a75.52 75.52 0 0 0-75.221334 69.290666L170.666667 246.186667v531.712c0 39.594667 30.506667 72.106667 69.290666 75.221333L246.186667 853.333333h531.712a75.52 75.52 0 0 0 75.221333-69.290666L853.333333 777.813333v-177.237333a42.666667 42.666667 0 0 1 85.034667-4.992l0.298667 4.992v177.237333a160.853333 160.853333 0 0 1-152.533334 160.597334L777.813333 938.666667H246.144a160.853333 160.853333 0 0 1-160.597333-152.533334L85.333333 777.813333V246.144a160.853333 160.853333 0 0 1 152.533334-160.597333L246.186667 85.333333h177.237333z" fill="white"></path>
                        <path d="M716.501333 119.168a133.162667 133.162667 0 0 1 194.133334 182.186667l-5.802667 6.144-362.666667 362.666666a42.666667 42.666667 0 0 1-24.576 12.117334L512 682.666667H384a42.666667 42.666667 0 0 1-42.368-37.674667L341.333333 640v-128a42.666667 42.666667 0 0 1 8.789334-25.941333l3.712-4.266667 362.666666-362.666667z m128 60.330667a47.872 47.872 0 0 0-63.488-3.712l-4.181333 3.712L426.666667 529.664v67.626667h67.626666l350.208-350.122667a47.872 47.872 0 0 0 3.712-63.488l-3.712-4.181333z" fill="white"></path>
                        <path d="M652.501333 183.168a42.666667 42.666667 0 0 1 56.32-3.541333l4.010667 3.541333 128 128a42.666667 42.666667 0 0 1-56.32 63.872l-4.010667-3.541333-128-128a42.666667 42.666667 0 0 1 0-60.330667z" fill="white"></path>
                    </svg>
                </div>
                <div class="cell"></div><div class="cell"></div><div class="cell"></div>
                <div class="cell"></div><div class="cell"></div><div class="cell"></div>

                <!-- Row 5 -->
                <div class="time">4:30–6:00
                    <svg class="svg-icon" style="width: 20px; height: 20px; margin-left: 5px; vertical-align: middle; fill: currentcolor; overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
                        <path d="M423.381333 85.333333a42.666667 42.666667 0 0 1 4.992 85.034667L423.381333 170.666667H246.186667a75.52 75.52 0 0 0-75.221334 69.290666L170.666667 246.186667v531.712c0 39.594667 30.506667 72.106667 69.290666 75.221333L246.186667 853.333333h531.712a75.52 75.52 0 0 0 75.221333-69.290666L853.333333 777.813333v-177.237333a42.666667 42.666667 0 0 1 85.034667-4.992l0.298667 4.992v177.237333a160.853333 160.853333 0 0 1-152.533334 160.597334L777.813333 938.666667H246.144a160.853333 160.853333 0 0 1-160.597333-152.533334L85.333333 777.813333V246.144a160.853333 160.853333 0 0 1 152.533334-160.597333L246.186667 85.333333h177.237333z" fill="white"></path>
                        <path d="M716.501333 119.168a133.162667 133.162667 0 0 1 194.133334 182.186667l-5.802667 6.144-362.666667 362.666666a42.666667 42.666667 0 0 1-24.576 12.117334L512 682.666667H384a42.666667 42.666667 0 0 1-42.368-37.674667L341.333333 640v-128a42.666667 42.666667 0 0 1 8.789334-25.941333l3.712-4.266667 362.666666-362.666667z m128 60.330667a47.872 47.872 0 0 0-63.488-3.712l-4.181333 3.712L426.666667 529.664v67.626667h67.626666l350.208-350.122667a47.872 47.872 0 0 0 3.712-63.488l-3.712-4.181333z" fill="white"></path>
                        <path d="M652.501333 183.168a42.666667 42.666667 0 0 1 56.32-3.541333l4.010667 3.541333 128 128a42.666667 42.666667 0 0 1-56.32 63.872l-4.010667-3.541333-128-128a42.666667 42.666667 0 0 1 0-60.330667z" fill="white"></path>
                    </svg>
                </div>
                <div class="cell"></div><div class="cell"></div><div class="cell"></div>
                <div class="cell"></div><div class="cell"></div><div class="cell"></div>
            </div>
        </main>
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
    border: 1px solid rgba(179, 179, 179, 0.6);
    text-align: left;
    padding: 8px;
    font-size: 14px;
    cursor: pointer;
    transition: all ease 0.1s;
    min-width: 135px;
}

.cell:hover {
    background-color: var(--color-lightgray-hover);
}

/* Highlight Filled Cells */
.cell:not(:empty) {
    background-color: #dff0d8;
    border-color: #b2d8b2;
    color: #333;
}
</style>