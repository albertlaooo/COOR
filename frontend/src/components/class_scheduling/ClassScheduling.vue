<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from "axios"

//#region 📘 FETCH SECTIONS
const sections = ref([])

const fetchSections = async () => {
    try {
        const res = await axios.get("http://localhost:3000/sections")
        sections.value = res.data
    } catch (err) {
        console.error("Error fetching sections:", err)
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

onMounted(fetchSections)
//#endregion

//#region 🧭 ROUTER
const router = useRouter()
function goToPage(section) {
    router.push({
        path: `/main/class-scheduling/week-table`,
        query: { data: JSON.stringify(section) }
    })
}
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
        </header>

        <main>
            <!-- Loop through grouped sections -->
            <div v-for="(group, groupKey) in groupedSections" :key="groupKey">
                <h3 style="margin: 0; margin-bottom: 24px;">{{ groupKey }}</h3>
                
                <!-- Group by course name -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto; gap: 2.5vw;">

                    <!-- Group by course name -->
                    <div v-for="course in [...new Set(group.map(sec => sec.course_name))]">
                        <div style="display: grid; grid-template-columns: 50% 50%; padding-left: 24px; margin-bottom: 8px;">
                            <label class="paragraph--gray" style="font-weight: 600;">{{ course }}</label> 
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); text-align: center;">
                                <label class="paragraph--gray" style="font-weight: 600;">Class No.</label>
                                <label class="paragraph--gray" style="font-weight: 600;">Status</label>
                            </div>
                        </div>

                        <!-- Section cards -->
                        <div style="display: flex; 
                                    flex-direction: column; 
                                    background-color: white; 
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
                                    <label>■ Unset</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
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
</style>