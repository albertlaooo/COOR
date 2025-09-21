<script setup>
import { useRouter, useRoute } from 'vue-router'
const router = useRouter()
const route = useRoute()

function goToPage(page) {
    router.push(`/main/masterlist/${page}`)
}
</script>

<template>
    <div id="container" v-if="$route.path === '/main/masterlist'">
    
        <header>
            <svg width="auto" height="100%" viewBox="0 0 114 114" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g filter="url(#filter0_d_50_365)">
                <circle cx="55" cy="53" r="53" fill="#E4F5FF"/>
                </g>
                <path d="M72 33.875C71.4364 33.875 70.8959 33.6511 70.4974 33.2526C70.0989 32.8541 69.875 32.3136 69.875 31.75C69.875 31.1864 70.0989 30.6459 70.4974 30.2474C70.8959 29.8489 71.4364 29.625 72 29.625H74.125C75.8158 29.625 77.4373 30.2967 78.6328 31.4922C79.8284 32.6877 80.5 34.3092 80.5 36V72.125C80.5 73.8158 79.8284 75.4373 78.6328 76.6328C77.4373 77.8284 75.8158 78.5 74.125 78.5H35.875C34.1842 78.5 32.5627 77.8284 31.3672 76.6328C30.1717 75.4373 29.5 73.8158 29.5 72.125V36C29.5 34.3092 30.1717 32.6877 31.3672 31.4922C32.5627 30.2967 34.1842 29.625 35.875 29.625H38C38.5636 29.625 39.1041 29.8489 39.5026 30.2474C39.9011 30.6459 40.125 31.1864 40.125 31.75C40.125 32.3136 39.9011 32.8541 39.5026 33.2526C39.1041 33.6511 38.5636 33.875 38 33.875H35.875C35.3114 33.875 34.7709 34.0989 34.3724 34.4974C33.9739 34.8959 33.75 35.4364 33.75 36V72.125C33.75 72.6886 33.9739 73.2291 34.3724 73.6276C34.7709 74.0261 35.3114 74.25 35.875 74.25H74.125C74.6886 74.25 75.2291 74.0261 75.6276 73.6276C76.0261 73.2291 76.25 72.6886 76.25 72.125V36C76.25 35.4364 76.0261 34.8959 75.6276 34.4974C75.2291 34.0989 74.6886 33.875 74.125 33.875H72Z" fill="#0785D4"/>
                <path d="M42.25 27.5C42.25 26.9364 42.4739 26.3959 42.8724 25.9974C43.2709 25.5989 43.8114 25.375 44.375 25.375C44.9386 25.375 45.4791 25.5989 45.8776 25.9974C46.2761 26.3959 46.5 26.9364 46.5 27.5V33.875C46.5 34.4386 46.2761 34.9791 45.8776 35.3776C45.4791 35.7761 44.9386 36 44.375 36C43.8114 36 43.2709 35.7761 42.8724 35.3776C42.4739 34.9791 42.25 34.4386 42.25 33.875V27.5ZM63.5 27.5C63.5 26.9364 63.7239 26.3959 64.1224 25.9974C64.5209 25.5989 65.0614 25.375 65.625 25.375C66.1886 25.375 66.7291 25.5989 67.1276 25.9974C67.5261 26.3959 67.75 26.9364 67.75 27.5V33.875C67.75 34.4386 67.5261 34.9791 67.1276 35.3776C66.7291 35.7761 66.1886 36 65.625 36C65.0614 36 64.5209 35.7761 64.1224 35.3776C63.7239 34.9791 63.5 34.4386 63.5 33.875V27.5ZM50.75 33.875C50.1864 33.875 49.6459 33.6511 49.2474 33.2526C48.8489 32.8541 48.625 32.3136 48.625 31.75C48.625 31.1864 48.8489 30.6459 49.2474 30.2474C49.6459 29.8489 50.1864 29.625 50.75 29.625H59.25C59.8136 29.625 60.3541 29.8489 60.7526 30.2474C61.1511 30.6459 61.375 31.1864 61.375 31.75C61.375 32.3136 61.1511 32.8541 60.7526 33.2526C60.3541 33.6511 59.8136 33.875 59.25 33.875H50.75ZM46.5 57.25C45.9364 57.25 45.3959 57.0261 44.9974 56.6276C44.5989 56.2291 44.375 55.6886 44.375 55.125C44.375 54.5614 44.5989 54.0209 44.9974 53.6224C45.3959 53.2239 45.9364 53 46.5 53H63.5C64.0636 53 64.6041 53.2239 65.0026 53.6224C65.4011 54.0209 65.625 54.5614 65.625 55.125C65.625 55.6886 65.4011 56.2291 65.0026 56.6276C64.6041 57.0261 64.0636 57.25 63.5 57.25H46.5ZM46.5 46.625C45.9364 46.625 45.3959 46.4011 44.9974 46.0026C44.5989 45.6041 44.375 45.0636 44.375 44.5C44.375 43.9364 44.5989 43.3959 44.9974 42.9974C45.3959 42.5989 45.9364 42.375 46.5 42.375H63.5C64.0636 42.375 64.6041 42.5989 65.0026 42.9974C65.4011 43.3959 65.625 43.9364 65.625 44.5C65.625 45.0636 65.4011 45.6041 65.0026 46.0026C64.6041 46.4011 64.0636 46.625 63.5 46.625H46.5ZM46.5 67.875C45.9364 67.875 45.3959 67.6511 44.9974 67.2526C44.5989 66.8541 44.375 66.3136 44.375 65.75C44.375 65.1864 44.5989 64.6459 44.9974 64.2474C45.3959 63.8489 45.9364 63.625 46.5 63.625H63.5C64.0636 63.625 64.6041 63.8489 65.0026 64.2474C65.4011 64.6459 65.625 65.1864 65.625 65.75C65.625 66.3136 65.4011 66.8541 65.0026 67.2526C64.6041 67.6511 64.0636 67.875 63.5 67.875H46.5Z" fill="#0785D4"/>
                <defs>
                <filter id="filter0_d_50_365" x="0" y="0" width="114" height="114" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                <feOffset dx="2" dy="4"/>
                <feGaussianBlur stdDeviation="2"/>
                <feComposite in2="hardAlpha" operator="out"/>
                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_50_365"/>
                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_50_365" result="shape"/>
                </filter>
                </defs>
            </svg>


            <div style="display: flex; flex-direction: column;">
                <h1>Masterlist</h1>
                <p>Setup your data for scheduling</p>
            </div>
        </header>

        <main>

            <!-- Academic Setup -->
            <div>
                <p style="font-weight: bold; margin-bottom: 20px;">Academic Setup</p>
                <div class="card-container">

                    <!-- Teacher -->
                    <div @click="goToPage('teachers')" class="card">
                        <img src="/src/assets/masterlist/teachers_card_logo.webp"></img>
                        <p2>Teachers</p2>
                    </div>

                    <!-- Sections -->
                    <div @click="goToPage('sections')" class="card">
                        <img src="/src/assets/masterlist/sections_card_logo.webp"></img>
                        <p2>Sections</p2>
                    </div>
                </div>
            </div>

            <!-- Master Data -->
            <div>
                <p style="font-weight: bold; margin-bottom: 20px;">Master Data</p>
                <div class="card-container">
                    <!-- Departments -->
                    <div @click="goToPage('departments')" class="card">
                        <img src="/src/assets/masterlist/departments_card_logo.webp"></img>
                        <p2>Departments</p2>
                    </div>

                    <!-- Courses -->
                    <div @click="goToPage('Courses')" class="card">
                        <img src="/src/assets/masterlist/courses_card_logo.webp"></img>
                        <p2>Courses</p2>
                    </div>

                    <!-- Subjects -->
                    <div @click="goToPage('subjects')" class="card">
                        <img src="/src/assets/masterlist/subjects_card_logo.webp"></img>
                        <p2>Subjects</p2>
                    </div>

                    <!-- Rooms -->
                    <div @click="goToPage('rooms')" class="card">
                        <img src="/src/assets/masterlist/rooms_card_logo.webp"></img>
                        <p2>Rooms</p2>
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

    .card-container {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 20px;
        justify-content: flex-start;
        padding: 0px;
    }

    .card {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 160px;
        height: 140px;
        background-color: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        border-radius: 12px;
        border: 1px solid rgba(0, 0, 0, 0.2);
        user-select: none;
        transition: all 0.2s ease;
    }

    .card > img {
        width: 112px;
        height: 112px;
        object-fit: contain;
        margin-bottom: 12px;
    }

    .card:hover {
        box-shadow: 0 0px 8px var(--color-primary);
        scale: 1.03;
        transition: all 0.2s ease;
    }
</style>