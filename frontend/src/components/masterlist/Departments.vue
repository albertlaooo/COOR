<script setup>
    import { ref } from "vue"
    import { useRouter } from 'vue-router'

    const router = useRouter()

    // Images
    import engineeringLogo from '@/assets/departments/college_of_engineering_and_technology.webp'
    import businessLogo from '@/assets/departments/college_of_business_and_accountancy.webp'
    import educationLogo from '@/assets/departments/college_of_education.webp'

    // Create an array for easier handling
    const preloadedImages = [
        engineeringLogo,
        businessLogo,
        educationLogo
    ]

    // Preload images programmatically
    preloadedImages.forEach(src => {
    const img = new Image()
    img.src = src
    })

    function backBtn() {
        router.push(`/main/masterlist`)
    }

    function navBtn(which) {
        router.push(`/main/masterlist/${which}`)
    }

    // Departments List
    const departments = ref([
    {
        name: "College of Engineering and Technology",
        code: "CET",
        img: engineeringLogo,
        courses: 5,
        teachers: 4
    },
    {
        name: "College of Business and Accountancy",
        code: "CBA",
        img: businessLogo,
        courses: 7,
        teachers: 6
    },
    {
        name: "College of Education",
        code: "CE",
        img: educationLogo,
        courses: 4,
        teachers: 3
    }
    ])

    // Selected Department
    const selectedDept = ref(null)

    function departmentClick(dept) {
    selectedDept.value = dept
    console.log("Clicked department:", dept.code)
    }

    /////////////////////////////// Add Department Modal ////////////////////////////
    const isVisibleAddDepartment = ref(false)

    function departmentConfirm() {
        toggleAddDepartment()
    }

    function toggleAddDepartment() {
        isVisibleAddDepartment.value = !isVisibleAddDepartment.value        
    }
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
                <h1>Departments</h1>
                <p class="paragraph--gray">Add, edit, or remove departments.</p>
            </div>
        </header>

        <div id="masterdata-nav">
            <div @click="navBtn('departments')" class="navBtn active">
                <p>Departments</p>
            </div>
            <div @click="navBtn('courses')" class="navBtn">
                <p>Courses</p>
            </div>
            <div @click="navBtn('subjects')" class="navBtn">
                <p>Subjects</p>
            </div>
            <div @click="navBtn('rooms')" class="navBtn">
                <p>Rooms</p>
            </div>
        </div>

        <main>
            <div class="grid-container">
                <div style="display: flex; align-items: center; padding-left: 12px; padding-right: 12px;">
                    <p class="paragraph--black-bold">Title</p>
                    <svg @click="toggleAddDepartment" style="margin-left: auto;" width="27" height="27" viewBox="0 0 33 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="33" height="32" rx="4" fill="#0785D4"/>
                        <path d="M17.0228 11.1006V20.7433M12.3677 15.9219H21.6779" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>

                <div></div>
        
                <div class="card-container">
                    <div 
                        v-for="(dept, index) in departments" 
                        :key="index" 
                        class="card"
                        @click="departmentClick(dept)"
                        >
                        <img :src="dept.img" :alt="dept.name" />
                        <div style="display: flex; flex-direction: column;">
                            <div style="width: 100%; min-width: 200px;">
                                <h3> {{ dept.name }} </h3>
                            </div>
                            
                            <p>{{ dept.courses }} Courses</p>
                            <p>{{ dept.teachers }} Teachers</p>
                        </div>
                    </div>
                </div>

                <div class="card-container empty">
                </div>

            </div>
        </main>

        <!-- Add Department Modal -->
        <transition name="fade">
            <div v-show="isVisibleAddDepartment" class="modal" @click.self="toggleAddDepartment">
               <div class="modal-content-add-department">
                    <h2 style="color: var(--color-primary); line-height: 0; margin: 12px;">Department Information</h2>

                    <div style="display: flex; flex-direction: column; width: 100%; gap: 14px;">
                        <!-- Department Name -->
                        <div>
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Department Name</p>
                            <input v-model="deptName"></input>
                        </div>

                        <div>
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Department Code</p>
                            <input v-model="deptCode" style="display: flex; flex-direction: column; width: 120px;"></input>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto;">
                        <button @click="toggleAddDepartment" class="cancelBtn">Cancel</button>
                        <button @click="departmentConfirm">Confirm</button>
                    </div>
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
        gap: 26px;
        margin-left: 14px;
        margin-bottom: 35px;
    }

    main {
        display: flex;
        flex-direction: column;
        gap: 35px;
    }

    #masterdata-nav {
        display: flex;
        flex-direction: row;
        margin-bottom: 35px;
    }

    .navBtn {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 120px;
        height: 40px;
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
        border-bottom: 1px solid #0786D4;
        padding-bottom: 3px;
        user-select: none;
    }

    .navBtn:hover {
        background-color: var(--color-lightgray-hover);
        transition: 0.1s ease-in-out;
    }

    .navBtn.active {
        background-color: var(--color-secondary);
        border-bottom: 4px solid #0786D4;
        padding-bottom: 0px;
    }

    .navBtn.active p {
        color: #0786D4;
        font-weight: 600;
    }

    .grid-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        column-gap: 15px;
        row-gap: 8px;
    }

    .card-container {
        display: flex; 
        flex-direction: column; 
        height: 27vw;
        min-width: 400px;
        min-height: 350px;
        max-width: 770px;
        background-color: white; 
        border-radius: 8px; 
        border: 1px solid rgba(0, 0, 0, 0.2); 
        box-shadow: 0 0px 6px rgba(0, 0, 0, 0.2); 
        user-select: none;
        padding-top: 10px;
        padding-bottom: 10px;
    }

    .card-container.empty {
        background-color: var(--color-lightgray);
    }

    .card {
        display: flex; 
        flex-direction: row; 
        height: 65px;
        gap: 20px; 
        padding-left: 35px; 
        padding-right: 35px; 
        padding-top: 12px; 
        padding-bottom: 12px;
        border-top: 1px solid transparent;
        border-bottom: 1px solid transparent;
    }

    .card:hover {
        background-color: #E4F5FF;
        border-top: 1px solid var(--color-primary);
        border-bottom: 1px solid var(--color-primary);
    }

    .card.active {
        background-color: #E4F5FF;
        border-top: 1px solid var(--color-primary);
        border-bottom: 1px solid var(--color-primary);
    }

    .card > div {
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .card h3 {
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 600;
        margin-top: 0px;
        margin-bottom: 4px;
    }



    img {
        height: 100%;
        width: auto;
        object-fit: contain;
    }

    .modal-content-add-department {
        display: flex;
        flex-direction: column;
        background-color: white;
        height: auto;
        align-items: center;
        width: 550px;
        padding-top: 30px;
        padding-bottom: 30px;
        padding-left: 40px;
        padding-right: 40px;
        box-shadow: -2px 0 8px rgba(0,0,0,0.2);
        border-radius: 6px;
        gap: 45px;
    }


</style>