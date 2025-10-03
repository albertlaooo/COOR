<script setup>
    import { ref, onMounted, computed } from "vue"
    import { useRouter } from 'vue-router'
    import axios from "axios";

    const router = useRouter()

    // Data
    const courses = ref([])
    const courseImage = ref(0);
    const courseName = ref('');
    const courseCode = ref('');

    // Selected Department
    const selectedCourse = ref(null)

    // Images
    import img0 from '@/assets/departments/0.webp'
    import img1 from '@/assets/departments/1.webp'
    import img2 from '@/assets/departments/2.webp'
    import img3 from '@/assets/departments/3.webp'

    // Map integers to images
    const images = {
    0: img0,
    1: img1,
    2: img2,
    3: img3
    }

    // Preload images programmatically
    Object.values(images).forEach(src => {
    const img = new Image()
    img.src = src
    })

    /////////////////////////////// FETCH DEPARTMENTS ////////////////////////////
    const fetchCourses = async () => {
        try {
            const res = await axios.get("http://localhost:3000/courses");

            courses.value = res.data.map(course => ({
                id: course.course_id,
                imgIndex: course.course_image,
                img: images[course.course_image] || images[0],
                name: course.course_name,
                code: course.course_code,
                
                units: 0,
                subjects: 0
            }));
        } catch (err) {
            console.error("Error fetching courses:", err);
        }
    }

    onMounted(fetchCourses);

    /////////////////////////////// DELETE DEPARTMENTS ////////////////////////////
    async function deleteCourse() {
        if (!selectedCourse.value || !selectedCourse.value.id) {
            return;
        }

        if (!confirm(`Are you sure you want to delete?`)) return;
        try {
            await axios.delete(`http://localhost:3000/courses/${selectedCourse.value.id}`);
            alert("Course deleted successfully!");

            // refresh the list
            fetchCourses();

            // reset selection
            selectedCourse.value = null;
        } catch (err) {
            console.error("Error deleting course:", err);
            alert("Failed to delete course.");
        }
    }


    /////////////////////////////// NAVIGATION FUNCTION ////////////////////////////
    function backBtn() {
        router.push(`/main/masterlist`)
    }

    function navBtn(which) {
        router.push(`/main/masterlist/${which}`)
    }

    function courseClick(course) {
        if (selectedCourse.value && selectedCourse.value.id === course.id) {
            selectedCourse.value = null;
        } else {
            selectedCourse.value = course;
        }
    }

    const deleteIconColor = computed(() => {
        return selectedCourse.value ? '#A83838' : '#CCCCCC'; // #CCCCCC for gray
    });

    const updateIconColor = computed(() => {
        return selectedCourse.value ? 'var(--color-primary)' : '#CCCCCC'; // #CCCCCC for gray
    });

    /////////////////////////////// Course Modal ////////////////////////////
    const courseTitle = ref('');
    const courseButton = ref('');
    const courseHandler = ref('');
    const isVisibleCourseModal = ref(false)

    const courseConfirm = async () => {

        if(courseHandler.value === 'add'){
            try {
                const res = await axios.post("http://localhost:3000/add-course", {
                    course_image: courseImage.value,
                    course_name: courseName.value,
                    course_code: courseCode.value.toUpperCase()
                });
                console.log(res.data.message);
                alert("Add course Successfully!");
            } catch (error) {
                console.error("Error:", error);
                alert("Failed to add course.");
            }
            fetchCourses();
            toggleCourseModal('cancel');
            
            // Reset Inputs
            courseImage.value = 0;
            courseName.value = '';
            courseCode.value = '';
            }

        else if(courseHandler.value === 'update'){
            try {
            const res = await axios.put(`http://localhost:3000/update-course/${selectedCourse.value.id}`, {
            course_image: courseImage.value,
            course_name: courseName.value,
            course_code: courseCode.value.toUpperCase()
            });

            console.log(res.data.message);
            alert("Course updated successfully!");
            
            fetchCourses();
            selectedCourse.value = null;
            toggleCourseModal('cancel');

            // Reset Inputs
            courseImage.value = 0;
            courseName.value = '';
            courseCode.value = '';
            } catch (error) {
                console.error("Error:", error);
                alert("Failed to update course.");
            }
        }
    }

    function toggleCourseModal(which) {
        if(which === 'add'){
            courseTitle.value = 'Department Information'
            courseButton.value = 'Confirm'
            courseHandler.value = 'add'
            isVisibleCourseModal.value = !isVisibleCourseModal.value
        }

        else if(which === 'update'){
            courseTitle.value = 'Update Information'
            courseImage.value = selectedCourse.value.imgIndex;
            courseName.value = selectedCourse.value.name;
            courseCode.value = selectedCourse.value.code;
            courseButton.value = 'Update'
            courseHandler.value = 'update'
            isVisibleCourseModal.value = !isVisibleCourseModal.value
        }

        else if(which === 'cancel'){
            setTimeout(() => {
                courseTitle.value = '';
                courseImage.value = 0;
                courseName.value = '';
                courseCode.value = '';
                courseButton.value = '';
                courseHandler.value = '';
            }, 100);

            isVisibleCourseModal.value = !isVisibleCourseModal.value
        }
    }

    /////////////////////////////// Choose Image Modal ////////////////////////////
    const isVisibleChooseImage = ref(false)

    const imageChooseCancel = async () => {
        courseImage.value = 0;
        toggleChooseImage();
    }

    const imageChooseConfirm = async () => {
        toggleChooseImage();
    }

    function toggleChooseImage() {
        isVisibleChooseImage.value = !isVisibleChooseImage.value        
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
                <h1>Courses</h1>
                <p class="paragraph--gray">Add, edit, or remove courses, and assign subjects to each courses.</p>
            </div>
        </header>

        <div id="masterdata-nav">
            <div @click="navBtn('departments')" class="navBtn">
                <p>Departments</p>
            </div>
            <div @click="navBtn('courses')" class="navBtn active">
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
            <div class="card-container-div">
                <div style="display: flex; flex-direction: column; gap: 6px; flex: 1;">
                    <div style="display: flex; align-items: center; padding-left: 12px; padding-right: 12px;">
                        <p class="paragraph--black-bold">Title</p>

                        <div style="display: flex; flex-direction: row; gap: 10px; align-items: center; margin-left: auto; justify-content: center;">
                            <svg @click="deleteCourse()" width="26" height="28" viewBox="0 0 30 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11.1427 25.6427V11.4999C11.1427 11.313 11.0827 11.1587 10.9627 11.037C10.8427 10.9153 10.6884 10.8553 10.4998 10.857H9.21411C9.02726 10.857 8.87297 10.917 8.75126 11.037C8.62954 11.157 8.56954 11.3113 8.57126 11.4999V25.6427C8.57126 25.8296 8.63126 25.9839 8.75126 26.1056C8.87126 26.2273 9.02554 26.2873 9.21411 26.2856H10.4998C10.6867 26.2856 10.841 26.2256 10.9627 26.1056C11.0844 25.9856 11.1444 25.8313 11.1427 25.6427ZM16.2855 25.6427V11.4999C16.2855 11.313 16.2255 11.1587 16.1055 11.037C15.9855 10.9153 15.8313 10.8553 15.6427 10.857H14.357C14.1701 10.857 14.0158 10.917 13.8941 11.037C13.7724 11.157 13.7124 11.3113 13.7141 11.4999V25.6427C13.7141 25.8296 13.7741 25.9839 13.8941 26.1056C14.0141 26.2273 14.1684 26.2873 14.357 26.2856H15.6427C15.8295 26.2856 15.9838 26.2256 16.1055 26.1056C16.2273 25.9856 16.2873 25.8313 16.2855 25.6427ZM21.4284 25.6427V11.4999C21.4284 11.313 21.3684 11.1587 21.2484 11.037C21.1284 10.9153 20.9741 10.8553 20.7855 10.857H19.4998C19.313 10.857 19.1587 10.917 19.037 11.037C18.9153 11.157 18.8553 11.3113 18.857 11.4999V25.6427C18.857 25.8296 18.917 25.9839 19.037 26.1056C19.157 26.2273 19.3113 26.2873 19.4998 26.2856H20.7855C20.9724 26.2856 21.1267 26.2256 21.2484 26.1056C21.3701 25.9856 21.4301 25.8313 21.4284 25.6427ZM10.4998 5.71415H19.4998L18.5355 3.36386C18.4413 3.24386 18.3273 3.17015 18.1935 3.14272H11.8241C11.6904 3.17015 11.5764 3.24386 11.4821 3.36386L10.4998 5.71415ZM29.1427 6.357V7.64272C29.1427 7.82957 29.0827 7.98386 28.9627 8.10557C28.8427 8.22729 28.6884 8.28729 28.4998 8.28558H26.5713V27.3296C26.5713 28.4404 26.2567 29.4013 25.6275 30.2121C24.9984 31.023 24.2415 31.4284 23.357 31.4284H6.64268C5.75811 31.4284 5.00125 31.0367 4.37211 30.2533C3.74297 29.4699 3.4284 28.5227 3.4284 27.4119V8.28558H1.49983C1.31297 8.28558 1.15868 8.22557 1.03697 8.10557C0.915255 7.98557 0.855255 7.83129 0.856969 7.64272V6.357C0.856969 6.17015 0.916969 6.01586 1.03697 5.89415C1.15697 5.77243 1.31126 5.71243 1.49983 5.71415H7.70725L9.11383 2.35843C9.3144 1.863 9.67611 1.44129 10.199 1.09329C10.7218 0.745289 11.2507 0.571289 11.7855 0.571289H18.2141C18.749 0.571289 19.2778 0.745289 19.8007 1.09329C20.3235 1.44129 20.6853 1.863 20.8858 2.35843L22.2924 5.71415H28.4998C28.6867 5.71415 28.841 5.77415 28.9627 5.89415C29.0844 6.01415 29.1444 6.16843 29.1427 6.357Z" :fill="deleteIconColor"/>
                            </svg>

                            <svg @click="toggleCourseModal('update')" class="svg-icon" style="width: 27px;height: 27px; margin-right: 1px; vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M423.381333 85.333333a42.666667 42.666667 0 0 1 4.992 85.034667L423.381333 170.666667H246.186667a75.52 75.52 0 0 0-75.221334 69.290666L170.666667 246.186667v531.712c0 39.594667 30.506667 72.106667 69.290666 75.221333L246.186667 853.333333h531.712a75.52 75.52 0 0 0 75.221333-69.290666L853.333333 777.813333v-177.237333a42.666667 42.666667 0 0 1 85.034667-4.992l0.298667 4.992v177.237333a160.853333 160.853333 0 0 1-152.533334 160.597334L777.813333 938.666667H246.144a160.853333 160.853333 0 0 1-160.597333-152.533334L85.333333 777.813333V246.144a160.853333 160.853333 0 0 1 152.533334-160.597333L246.186667 85.333333h177.237333z" :fill="updateIconColor" /><path d="M716.501333 119.168a133.162667 133.162667 0 0 1 194.133334 182.186667l-5.802667 6.144-362.666667 362.666666a42.666667 42.666667 0 0 1-24.576 12.117334L512 682.666667H384a42.666667 42.666667 0 0 1-42.368-37.674667L341.333333 640v-128a42.666667 42.666667 0 0 1 8.789334-25.941333l3.712-4.266667 362.666666-362.666667z m128 60.330667a47.872 47.872 0 0 0-63.488-3.712l-4.181333 3.712L426.666667 529.664v67.626667h67.626666l350.208-350.122667a47.872 47.872 0 0 0 3.712-63.488l-3.712-4.181333z" :fill="updateIconColor" /><path d="M652.501333 183.168a42.666667 42.666667 0 0 1 56.32-3.541333l4.010667 3.541333 128 128a42.666667 42.666667 0 0 1-56.32 63.872l-4.010667-3.541333-128-128a42.666667 42.666667 0 0 1 0-60.330667z" :fill="updateIconColor" /></svg>

                            <svg @click="toggleCourseModal('add')" width="27" height="27" viewBox="0 0 33 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="33" height="32" rx="4" fill="#0785D4"/>
                                <path d="M17.0228 11.1006V20.7433M12.3677 15.9219H21.6779" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                    </div>

                    <div class="card-container">
                        <div 
                            v-for="(course, index) in courses" 
                            :key="index" 
                            class="card"
                            :class="{ 'active': selectedCourse && selectedCourse.id === course.id }"
                            @click="courseClick(course)"
                            >
                            <img :src="course.img" :alt="course.name" />
                            <div style="display: flex; flex-direction: column;">
                                <div>
                                    <h3> {{ course.name + " (" + course.code + ")"}} </h3>
                                </div>
                                
                                <p>{{ course.units }} Units</p>
                                <p>{{ course.subjects }} Subjects</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 6px; flex: 1; padding-top: 34px;">
                    <div class="card-container" :class="{ empty: selectedCourse === null }">
                        <div style="display: flex; flex-direction: column; height: 100%; padding: 15px; padding-left: 30px; padding-right: 30px; gap: 10px;">
                            <h3 style="margin: 0; line-height: 1;">Add Course</h3>
                            <input placeholder="Search here.."></input>
                            
                            <div style="height: 100%; width: 100%; margin-top: 4px;; border: 1px solid rgba(0, 0, 0, 0.2); box-shadow: 0 0px 4px rgba(0, 0, 0, 0.2); border-radius: 10px; ">
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </main>

        <!-- Add Course Modal -->
        <transition name="fade">
            <div v-show="isVisibleCourseModal" class="modal" @click.self="toggleCourseModal('cancel')">
               <div class="modal-content-course">
                    <h2 style="color: var(--color-primary); line-height: 0; margin: 12px;">{{ courseTitle }}</h2>

                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; margin-top: 10px;">
                        <img :src="images[courseImage]" style="width: 120px; height: 120px; object-fit: contain;"/>
                        <p @click="toggleChooseImage" style="color: var(--color-primary); font-weight: 600; cursor: pointer; user-select: none;">Edit</p>
                    </div>

                    <div style="display: flex; flex-direction: column; width: 100%; gap: 14px;">
                        <!-- Course Name -->
                        <div>
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Course Name</p>
                            <input v-model="courseName"></input>
                        </div>

                        <div>
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Course Code</p>
                            <input v-model="courseCode" style="display: flex; flex-direction: column; width: 120px;"></input>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto;">
                        <button @click="toggleCourseModal('cancel')" class="cancelBtn">Cancel</button>
                        <button @click="courseConfirm()">{{ courseButton }}</button>
                    </div>
               </div>
            </div>
        </transition>

        <!-- Image Choose Modal -->
        <transition name="fade">
            <div v-show="isVisibleChooseImage" class="modal" @click.self="toggleChooseImage">
                <div class="modal-content-image-choose">
                <h2 style="color: var(--color-primary); line-height: 0; margin: 12px;">Choose your image</h2>

                <div class="image-grid">
                    <div
                    v-for="(imgSrc, index) in images"
                    :key="index"
                    class="image-item"
                    :class="{ 'selected': courseImage === parseInt(index) }"
                    @click="courseImage = parseInt(index)"
                    >
                    <img :src="imgSrc" draggable="false"/>
                    </div>
                </div>
                <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto;">
                    <button @click="imageChooseCancel" class="cancelBtn">Cancel</button>
                    <button @click="imageChooseConfirm">Confirm</button>
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

    .card-container-div {
        display: flex;
        flex-direction: row;
        gap: 15px;
        max-width: 1800px;
        height: 32vw;
        max-height: 650px;
    }

    .card-container {
        display: flex; 
        flex-direction: column; 
        height: 100%;
        width: 100%;
        min-width: 450px;
        background-color: white; 
        border-radius: 8px; 
        border: 1px solid rgba(0, 0, 0, 0.2); 
        box-shadow: 0 0px 6px rgba(0, 0, 0, 0.2); 
        user-select: none;
        padding-top: 10px;
        padding-bottom: 10px;
        overflow-y: auto;
    }

    .card-container.empty {
        background-color: var(--color-lightgray);
    }

    .card-container.empty * {
        display: none;
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
        transition: 0.1s;
    }

    .card:hover {
        background-color: #E4F5FF;
        border-top: 1px solid var(--color-primary);
        border-bottom: 1px solid var(--color-primary);
        transition: 0.1s;
    }

    .card.active {
        background-color: #E4F5FF;
        border-top: 1px solid var(--color-primary);
        border-bottom: 1px solid var(--color-primary);
    }

    .card h3 {
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 600;
        margin-top: 0px;
        margin-bottom: 4px;
        width: clamp(200px, 24vw, 24vw);
    }

    img {
        height: 100%;
        width: auto;
        object-fit: contain;
    }

    .modal-content-course {
        display: flex;
        flex-direction: column;
        background-color: white;
        height: auto;
        align-items: center;
        width: 550px;
        padding-top: 35px;
        padding-bottom: 35px;
        padding-left: 45px;
        padding-right: 45px;
        box-shadow: -2px 0 8px rgba(0,0,0,0.2);
        border-radius: 6px;
        gap: 20px;
    }

    .modal-content-image-choose {
        display: flex;
        flex-direction: column;
        background-color: white;
        height: auto;
        align-items: center;
        width: 550px;
        padding-top: 35px;
        padding-bottom: 35px;
        padding-left: 45px;
        padding-right: 45px;
        box-shadow: -2px 0 8px rgba(0,0,0,0.2);
        border-radius: 6px;
        gap: 20px;
    }

    .image-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        gap: 10px;
        padding: 20px;
    }

    .image-item {
        display: flex;
        justify-content: center;
        align-items: center;
        border: 2px solid transparent;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease-in-out;
        padding: 10px;
    }

    .image-item:hover {
        border-color: #0785D4;
    }

    .image-item.selected {
        border-color: #0785D4;
        box-shadow: 0 0 10px rgba(7, 133, 212, 0.5);
    }

    .image-item img {
        width: 100px;
        height: 100px;
        object-fit: contain;
    }
</style>