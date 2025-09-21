<script setup>
    import { useRouter } from 'vue-router'
    const router = useRouter()

    function backBtn() {
        router.push(`/main/masterlist`)
    }

    function navBtn(which) {
        router.push(`/main/masterlist/${which}`)
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
                <h1>Room</h1>
                <p>Update room details anytime.</p>
            </div>
        </header>

        <div id="masterdata-nav">
            <div @click="navBtn('departments')" class="navBtn">
                <p3>Departments</p3>
            </div>
            <div @click="navBtn('courses')" class="navBtn">
                <p3>Courses</p3>
            </div>
            <div @click="navBtn('subjects')" class="navBtn">
                <p3>Subjects</p3>
            </div>
            <div @click="navBtn('rooms')" class="navBtn active">
                <p3>Rooms</p3>
            </div>
        </div>

        <main>

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

    .navBtn.active p3 {
        color: #0786D4;
        font-weight: 600;
    }
</style>