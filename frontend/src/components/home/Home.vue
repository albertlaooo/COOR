<script setup>
import { ref, onMounted, computed } from 'vue'

// Get current date
const currentDate = ref('')

onMounted(() => {
  const now = new Date()
  currentDate.value = now.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
})

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

// navigation
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

// highlight today's date
function isToday(day) {
  return (
    today.getFullYear() === currentYear.value &&
    today.getMonth() === currentMonth.value &&
    today.getDate() === day
  );
}

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
                <p class="paragraph--gray">Simplifying your daily workflow.</p>
            </div>
        </header>

        <main>
            <div style="display: flex; flex-direction: row; gap: 20px;">
                
                <!-- 1st column -->
                <div style="flex: 1; display: flex; flex-direction: column; gap: 20px; width: 100%;">
                    <!-- Card Greeting -->
                    <div
                        style="
                        display: flex;
                        flex-direction: row;
                        align-items: center;
                        justify-content: space-between;
                        width: 100%;
                        max-width: 100%;
                        height: 250px;
                        background: linear-gradient(to right, #0785D4, #87D3FF);
                        border-radius: 8px;
                        padding: 0 50px;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                        overflow: hidden;
                        box-sizing: border-box;
                        "
                    >
                        <!-- Text -->
                        <div style="display: flex; flex-direction: column; height: 100%; justify-content: center; gap: 35px;">
                            <p id="dashboard-card-date" style="color: #F4F4F4; margin: 0;">{{ currentDate }}</p>
                            <div style="display: flex; flex-direction: column; gap: 4px;">
                                <h2 style="color: white; margin: 0; white-space: nowrap;">Welcome back, Coordinator!</h2>
                                <p style="color: #F4F4F4; margin: 0;">Back in control, Let’s make it happen!</p>
                            </div>

                            <button class="whiteBtn" style="width: fit-content; padding: 14px 38px; border-radius: 22px;">Scheduling Review</button>
                        </div>

                        <!-- Image -->
                        <img
                        src="@/assets/home/mechanic.webp"
                        style="
                            height: 100%;
                            max-height: 250px;
                            width: auto;
                            object-fit: contain;
                        "
                        />
                    </div>

                    <div style="display: flex; flex-direction: row; gap: 12px;">
                        <div style="flex: 1; display: flex; flex-direction: row; gap: 12px;">
                            <!-- UNASSIGNED SECTIONS -->
                            <div id="unassigned-sections">
                                <div style="display: flex; flex-direction: row; justify-content: space-between;">
                                    <p style="color: #991B1B; font-weight: 600;">UNASSIGNED SECTIONS</p>
                                    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g clip-path="url(#clip0_408_455)">
                                        <path d="M23.7299 20.0474C24.499 21.3597 23.5336 23 21.9975 23H2.00228C0.463236 23 -0.497681 21.3571 0.269902 20.0474L10.2677 2.98376C11.0371 1.67089 12.9643 1.67327 13.7324 2.98376L23.7299 20.0474ZM12 16.5195C10.9415 16.5195 10.0834 17.3642 10.0834 18.4062C10.0834 19.4483 10.9415 20.293 12 20.293C13.0586 20.293 13.9167 19.4483 13.9167 18.4062C13.9167 17.3642 13.0586 16.5195 12 16.5195ZM10.1803 9.73776L10.4894 15.3159C10.5039 15.5769 10.7231 15.7812 10.9887 15.7812H13.0114C13.2769 15.7812 13.4962 15.5769 13.5107 15.3159L13.8197 9.73776C13.8354 9.45582 13.6073 9.21875 13.3205 9.21875H10.6795C10.3927 9.21875 10.1647 9.45582 10.1803 9.73776Z" fill="#991B1B"/>
                                        </g>
                                        <defs>
                                        <clipPath id="clip0_408_455">
                                        <rect width="24" height="21" fill="white" transform="translate(0 2)"/>
                                        </clipPath>
                                        </defs>
                                    </svg>
                                </div>
                                <div style="width: 100%; border-bottom: 1px solid #991B1B; margin-bottom: 6px;">
                                    <h2 style="color: #991B1B; margin: 16px 0;">5</h2>
                                </div>
                                <small style="color: #991B1B;">Assign sections now.</small>
                            </div>

                            <!-- UNASSIGNED ROOMS -->
                            <div id="unassigned-rooms">
                                <div style="display: flex; flex-direction: row; justify-content: space-between;">
                                    <p style="color: #854D0E; font-weight: 600;">UNASSIGNED ROOMS</p>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M15.75 2.25V4.5H18V19.5H15.75V21.75H20.25V2.25H15.75ZM3.75 21.75L14.25 23.25V0.75L3.75 2.25V21.75ZM11.4375 10.6875C11.8829 10.7421 12.2893 10.9689 12.5696 11.3193C12.8499 11.6697 12.982 12.116 12.9375 12.5625C12.982 13.009 12.8499 13.4553 12.5696 13.8057C12.2893 14.1561 11.8829 14.3829 11.4375 14.4375C10.9921 14.3829 10.5857 14.1561 10.3054 13.8057C10.0251 13.4553 9.89301 13.009 9.9375 12.5625C9.89301 12.116 10.0251 11.6697 10.3054 11.3193C10.5857 10.9689 10.9921 10.7421 11.4375 10.6875Z" fill="#854D0E"/>
                                    </svg>
                                </div>
                                <div style="width: 100%; border-bottom: 1px solid #854D0E; margin-bottom: 6px;">
                                    <h2 style="color: #854D0E; margin: 16px 0;">8</h2>
                                </div>
                                <small style="color: #854D0E;">Assign rooms now.</small>
                            </div>
                        </div>

                        <!-- Today's Schedule -->
                        <div style="display: flex; flex-direction: column; width: 380px; padding: 20px 26px; background-color: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); gap: 12px;">
                            <div style="border-bottom: 1px solid var(--color-border); padding-bottom: 12px;">
                                <p class="paragraph--black-bold">Today's Schedule</p>
                            </div>
                            
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                <div style="display: flex; flex-direction: row; justify-content: space-between;">
                                    <p>8:00 AM - 9:00 AM</p>
                                    <p>BSIT 4.1A</p>
                                    <p>Room 201</p>
                                </div>

                                <div style="display: flex; flex-direction: row; justify-content: space-between;">
                                    <p>8:00 AM - 9:00 AM</p>
                                    <p>BSIT 4.1A</p>
                                    <p>Room 201</p>
                                </div>

                                <div style="display: flex; flex-direction: row; justify-content: space-between;">
                                    <p>8:00 AM - 9:00 AM</p>
                                    <p>BSIT 4.1A</p>
                                    <p>Room 201</p>
                                </div>

                                <div style="display: flex; flex-direction: row; justify-content: space-between;">
                                    <p>8:00 AM - 9:00 AM</p>
                                    <p>BSIT 4.1A</p>
                                    <p>Room 201</p>
                                </div>

                                <div style="display: flex; flex-direction: row; justify-content: space-between;">
                                    <p>8:00 AM - 9:00 AM</p>
                                    <p>BSIT 4.1A</p>
                                    <p>Room 201</p>
                                </div>

                                <div style="display: flex; flex-direction: row; justify-content: space-between;">
                                    <p>8:00 AM - 9:00 AM</p>
                                    <p>BSIT 4.1A</p>
                                    <p>Room 201</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 2nd column -->
                <div style="display: flex; flex-direction: column; gap: 20px; width: 360px;">

                    <!-- calendar -->
                    <div class="calendar">
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
                            :class="{ active: isToday(day) }"
                        >
                            {{ day }}
                        </div>
                        </div>
                    </div>

                    <!-- notes -->
                    <div style="display: flex; flex-direction: column; padding: 25px; background-color: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); gap: 12px;">
                        <div style="display: flex; flex-direction: row; border-bottom: 1px solid var(--color-border); padding-bottom: 12px;">
                            <p class="paragraph--black-bold">Notes</p>
                            <svg style="margin-left: auto;" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 15H11V11H15V9H11V5H9V9H5V11H9V15ZM10 20C8.61667 20 7.31667 19.7417 6.1 19.225C4.88333 18.6917 3.825 17.975 2.925 17.075C2.025 16.175 1.30833 15.1167 0.775 13.9C0.258333 12.6833 0 11.3833 0 10C0 8.61667 0.258333 7.31667 0.775 6.1C1.30833 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.31667 6.1 0.799999C7.31667 0.266666 8.61667 0 10 0C11.3833 0 12.6833 0.266666 13.9 0.799999C15.1167 1.31667 16.175 2.025 17.075 2.925C17.975 3.825 18.6833 4.88333 19.2 6.1C19.7333 7.31667 20 8.61667 20 10C20 11.3833 19.7333 12.6833 19.2 13.9C18.6833 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6917 13.9 19.225C12.6833 19.7417 11.3833 20 10 20ZM10 18C12.2333 18 14.125 17.225 15.675 15.675C17.225 14.125 18 12.2333 18 10C18 7.76667 17.225 5.875 15.675 4.325C14.125 2.775 12.2333 2 10 2C7.76667 2 5.875 2.775 4.325 4.325C2.775 5.875 2 7.76667 2 10C2 12.2333 2.775 14.125 4.325 15.675C5.875 17.225 7.76667 18 10 18Z" fill="#1D1B20"/>
                            </svg>
                        </div>
                        
                        <!-- content -->
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <p>Sample note bla bla</p>
                            <p>Sample note bla bla</p>
                            <p>Sample note bla bla</p>
                            <p>Sample note bla bla</p>
                        </div>
                    </div>
                </div>
            </div>
        </main>

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

    #unassigned-sections {
        flex: 1; 
        width: clamp(250px, 15vw, 15vw);
        min-width: 250px;
        max-height: 120px;
        border: 1px solid #FEE2E2;
        background-color: #FEE2E2; 
        border-radius: 8px; 
        padding: 20px;
        transition: border 0.2s;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    #unassigned-sections:hover {
        border: 1px solid #991B1B
    }

    #unassigned-rooms {
         flex: 1; 
         width: clamp(250px, 15vw, 15vw);
         min-width: 250px; 
         max-height: 120px;
         border: 1px solid #FEF9C3;
         background-color: #FEF9C3; 
         border-radius: 8px; 
         padding: 20px;
         transition: border 0.2s;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    #unassigned-rooms:hover { 
        border: 1px solid #854D0E;
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
</style>