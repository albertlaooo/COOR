<script setup>
</script>

<template>
    <div id="container">

        <header>
            <svg width="auto" height="100%" viewBox="0 0 114 114" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g filter="url(#filter0_d_62_2230)">
                <circle cx="55" cy="53" r="53" fill="#E4F5FF"/>
                </g>
                <path d="M41.25 49.25H46.75V54.75H41.25V49.25ZM41.25 60.25H46.75V65.75H41.25V60.25ZM52.25 49.25H57.75V54.75H52.25V49.25ZM52.25 60.25H57.75V65.75H52.25V60.25ZM63.25 49.25H68.75V54.75H63.25V49.25ZM63.25 60.25H68.75V65.75H63.25V60.25Z" fill="#0785D4"/>
                <path d="M35.75 79.5H74.25C77.2832 79.5 79.75 77.0332 79.75 74V35.5C79.75 32.4667 77.2832 30 74.25 30H68.75V24.5H63.25V30H46.75V24.5H41.25V30H35.75C32.7167 30 30.25 32.4667 30.25 35.5V74C30.25 77.0332 32.7167 79.5 35.75 79.5ZM74.25 41L74.2527 74H35.75V41H74.25Z" fill="#0785D4"/>
                <defs>
                <filter id="filter0_d_62_2230" x="0" y="0" width="114" height="114" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                <feOffset dx="2" dy="4"/>
                <feGaussianBlur stdDeviation="2"/>
                <feComposite in2="hardAlpha" operator="out"/>
                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_62_2230"/>
                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_62_2230" result="shape"/>
                </filter>
                </defs>
            </svg>

            <div style="display: flex; flex-direction: column;">
                <h1>Timetables</h1>
                <p>Produce organized timetables.</p>
            </div>
        </header>

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
    }
</style>