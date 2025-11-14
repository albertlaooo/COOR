<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue"
import { useRouter } from 'vue-router'
import axios from "axios"

//#region 🧭 ROUTER
const router = useRouter()
//#endregion

//#region 🗂️ DATA
const courses = ref([])
const courseImage = ref(0)
const courseName = ref('')
const courseCode = ref('')
const addSubjects = ref('')
const subjectsDB = ref([]) // raw subjects from DB
const selectedSubjectData = ref()
const year = ref('')
const semester = ref('')
//#endregion

//#region 🧠 STATE MANAGEMENT
const fetchedSubjects = ref([]) // subjects per selected course
const selectedCourse = ref(null)
const inputFocused = ref(false)
const subjectWrapper = ref(null)
const showErrorInput = ref(false)
//#endregion

//#region 🖼️ IMAGES
import img0 from '@/assets/departments/0.webp'
import img1 from '@/assets/departments/1.webp'
import img2 from '@/assets/departments/2.webp'
import img3 from '@/assets/departments/3.webp'

const images = { 0: img0, 1: img1, 2: img2, 3: img3 }

// Preload images
Object.values(images).forEach(src => {
    const img = new Image()
    img.src = src
})
//#endregion

//#region 📘 FETCH SUBJECTS
const fetchSubjects = async () => {
    try {
        const res = await axios.get("http://localhost:3000/subjects")
        if (res.data && Array.isArray(res.data)) {
            subjectsDB.value.length = 0 // clear duplicates
            res.data.forEach(subj => {
                subjectsDB.value.push({
                    subject_id: subj.subject_id,
                    subject_name: subj.subject_name,
                    subject_code: subj.subject_code
                })
            })
        }
    } catch (err) {
        console.error("Error fetching subjects:", err)
    }
}
onMounted(fetchSubjects)

async function fetchSubjectsOnCourse() {
    if (!selectedCourse.value || !selectedCourse.value.id) {
        fetchedSubjects.value = []
        return
    }

    try {
        const res = await axios.get(`http://localhost:3000/courses/${selectedCourse.value.id}/subjects`)
        if (res.data && Array.isArray(res.data)) {
            fetchedSubjects.value = res.data.map(subj => ({
                subject_id: subj.subject_id,
                subject_name: subj.subject_name,
                subject_code: subj.subject_code,
                year: subj.year,
                semester: subj.semester
            }))
            console.log(fetchedSubjects)
        } else {
            fetchedSubjects.value = []
        }
    } catch (err) {
        console.error(`Error fetching subjects for course ${selectedCourse.value.id}:`, err)
        fetchedSubjects.value = []
    }
}
//#endregion

//#region 📚 FETCH COURSES
const fetchCourses = async () => {
  try {
    const res = await axios.get("http://localhost:3000/courses");
    courses.value = res.data.map(course => ({
      id: course.course_id,
      imgIndex: course.course_image,
      img: images[course.course_image] || images[0],
      name: course.course_name,
      code: course.course_code,
      units: course.total_units || 0,
      subjects: course.total_subjects || 0
    }));
  } catch (err) {
    console.error("Error fetching courses:", err);
  }
};
onMounted(fetchCourses)
//#endregion

//#region ❌ DELETE COURSE MODAL
const isVisibleDeleteModal = ref(false)
const deleteHandler = ref('');
const subjectIdToDelete = ref('');
const itemNameToDelete = ref('')

async function deleteCourse() {
    itemNameToDelete.value = selectedCourse.value.name;
    toggleDeleteModal('course')
}

function toggleDeleteModal(which, subjectId, subjectName) {
    if(which === 'course') {
        deleteHandler.value = 'course'
    }
    
    if(which === 'subject') {
        deleteHandler.value = 'subject'
        subjectIdToDelete.value = subjectId
        itemNameToDelete.value = subjectName
    }

    if(which === 'cancel'){
        setTimeout(() => {
            deleteHandler.value = ''
            subjectIdToDelete.value = ''
            itemNameToDelete.value = ''
        }, 200)
    }

    isVisibleDeleteModal.value = !isVisibleDeleteModal.value
}

async function confirmDelete() {

    if(deleteHandler.value === 'course') {
        if (!selectedCourse.value || !selectedCourse.value.id) return

        try {
            await axios.delete(`http://localhost:3000/courses/${selectedCourse.value.id}`)
            fetchCourses()
            selectedCourse.value = null
        } catch (err) {
            console.error("Error deleting course:", err)
            alert("Failed to delete course.")
        }

        toggleDeleteModal('cancel')
    }

    if(deleteHandler.value === 'subject') {
        if (!selectedCourse.value || !selectedCourse.value.id) {
            alert("No course selected.")
            return
        }

        try {
            const res = await axios.delete(`http://localhost:3000/remove-course-subject`, {
                data: {
                    course_id: selectedCourse.value.id,
                    subject_id: subjectIdToDelete.value
                }
            })

            if (res.data.success) {
                console.log(res.data.message)
                await Promise.all([fetchSubjectsOnCourse(), fetchCourses()]);
            } else {
                alert("Failed to remove subject: " + res.data.message)
            }
        } catch (error) {
            if (error.response?.data) {
                alert(error.response.data.message)
            } else {
                alert("An unexpected error occurred while removing the subject.")
                console.error(error)
            }
        }

        toggleDeleteModal('cancel')
    }
}

//#endregion

//#region 🔍 SEARCH / FILTER SUBJECTS
const filteredSubjects = computed(() => {
    let results = []

    if (!addSubjects.value) {
        // show all if input blank
        results = subjectsDB.value.map(subj => ({
            subject_id: subj.subject_id,
            subject_name: subj.subject_name,
            subject_code: subj.subject_code || ''
        }))

        // sortation: unassigned first, assigned below, alphabetical inside group
        results.sort((a, b) => {
            const aAssigned = fetchedSubjects.value.some(fs => fs.subject_id === a.subject_id)
            const bAssigned = fetchedSubjects.value.some(fs => fs.subject_id === b.subject_id)
            if (!aAssigned && bAssigned) return -1
            if (aAssigned && !bAssigned) return 1
            return a.subject_name.localeCompare(b.subject_name)
        })
    } else {
        // filter if user types
        results = subjectsDB.value
            .filter(subj =>
                subj.subject_name.toLowerCase().includes(addSubjects.value.toLowerCase())
            )
            .map(subj => ({
                subject_id: subj.subject_id,
                subject_name: subj.subject_name
            }))
    }

    return results
})
//#endregion

//#region GROUP SUBJECTS BY YEAR AND SEMESTER
const groupedSubjects = computed(() => {
    const groups = {};

    // ✅ Converts any number into ordinal (1st, 2nd, 3rd, 4th, 5th, etc.)
    const getOrdinal = (num) => {
        const suffixes = ["th", "st", "nd", "rd"];
        const v = num % 100;
        return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
    };

    fetchedSubjects.value.forEach(subj => {
        const year = subj.year || 1;
        const semester = subj.semester || 1;

        const key = `• ${getOrdinal(year)} Year - ${getOrdinal(semester)} Semester`;

        if (!groups[key]) groups[key] = [];
        groups[key].push(subj);
    });

    return groups;
});
//#endregion

//#region 🧩 SUBJECT ASSIGNMENT
async function selectSubject(subj) {
    selectedSubjectData.value = subjectsDB.value.find(s => s.subject_id === subj.subject_id)
    toggleSubjectAssignModal()
    inputFocused.value = false
}

async function subjectAssignConfirm() {
    if (!selectedSubjectData) {
        alert("Error: Subject data not found.")
        addSubjects.value = ''
        return
    }

    if (year.value !== '' && semester.value !== '') {
        showErrorInput.value = false

        const plainSubject = {
            course_id: selectedCourse.value.course_id || selectedCourse.value.id,
            subject_id: selectedSubjectData.value.subject_id,
            year: year.value,
            semester: semester.value
        }

        console.log("Sending to backend:", plainSubject)

        try {
            const res = await axios.post("http://localhost:3000/add-course-subject", plainSubject)
            if (res.data.success) await Promise.all([fetchSubjectsOnCourse(), fetchCourses()]);
            else alert(res.data.message || "Failed to assign subject.")
        } catch (err) {
            console.error(err)
            alert("An error occurred while assigning the subject.")
        }

        // reset inputs
        addSubjects.value = ''
        inputFocused.value = false
        toggleSubjectAssignModal()
        year.value = ''
        semester.value = ''
    } else {
        showErrorInput.value = false
        setTimeout(() => { showErrorInput.value = true }, 0)
    }
}
//#endregion

//#region 🖱️ UI HANDLERS
function handleClickOutside(event) {
    if (subjectWrapper.value && !subjectWrapper.value.contains(event.target)) {
        inputFocused.value = false
    }
}
onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', handleClickOutside))
//#endregion

//#region 🧭 NAVIGATION
function backBtn() { router.back() }
function navBtn(which) { router.push(`/main/masterlist/${which}`) }

function courseClick(course) {
    if (selectedCourse.value && selectedCourse.value.id === course.id) {
        selectedCourse.value = null
    } else {
        selectedCourse.value = course
        fetchSubjectsOnCourse()
    }
}

const deleteIconColor = computed(() => selectedCourse.value ? '#A83838' : '#CCCCCC')
const updateIconColor = computed(() => selectedCourse.value ? 'var(--color-primary)' : '#CCCCCC')
//#endregion

//#region 🧱 COURSE MODAL
const courseTitle = ref('')
const courseButton = ref('')
const courseHandler = ref('')
const isVisibleCourseModal = ref(false)

const errorMessage = ref('')
const isCourseNameOk = ref(false)
const isCourseCodeOk = ref(false)

const courseConfirm = async () => {
    // 🔹 Blank Input Validation
    if (!courseName.value.trim() || !courseCode.value.trim()) {
        showErrorInput.value = false;
        setTimeout(() => (showErrorInput.value = true), 0);

        isCourseNameOk.value = !!courseName.value.trim();
        isCourseCodeOk.value = !!courseCode.value.trim();

        errorMessage.value = "Please fill in all required fields.";
        return;
    }

    try {
        if (courseHandler.value === "add") {
            const res = await axios.post("http://localhost:3000/add-course", {
                course_image: courseImage.value,
                course_name: courseName.value.trim(),
                course_code: courseCode.value.trim().toUpperCase(),
            });
        } 
        else if (courseHandler.value === "update") {
            const res = await axios.put(
                `http://localhost:3000/update-course/${selectedCourse.value.id}`,
                {
                    course_image: courseImage.value,
                    course_name: courseName.value.trim(),
                    course_code: courseCode.value.trim().toUpperCase(),
                }
            );
        }

        // 🔹 Refresh and reset
        fetchCourses();
        toggleCourseModal("cancel");
    } 
    catch (error) {
        // 🔹 Duplicate check (based on backend response)
        const message = error.response?.data?.message;

        // 🔹 Reset flags first
        isCourseNameOk.value = true;
        isCourseCodeOk.value = true;
        let duplicateFound = false;

        if (message.includes("Course name and code already exist.")) {
            isCourseNameOk.value = false;
            isCourseCodeOk.value = false;
            duplicateFound = true;
        } 
        else if (message.includes("Course name already exists")) {
            isCourseNameOk.value = false;
            duplicateFound = true;
        } 
        else if (message.includes("Course code already exists")) {
            isCourseCodeOk.value = false;
            duplicateFound = true;
        }

        if (duplicateFound) {
            showErrorInput.value = false;
            setTimeout(() => (showErrorInput.value = true), 0);
        }

        errorMessage.value = message || "Failed to save course.";
    }
};

function toggleCourseModal(which) {
    if (which === 'add') {
        courseTitle.value = 'Course Information'
        courseButton.value = 'Confirm'
        courseHandler.value = 'add'
        isVisibleCourseModal.value = !isVisibleCourseModal.value
    }
    else if (which === 'update') {
        courseTitle.value = 'Update Information'
        courseImage.value = selectedCourse.value.imgIndex
        courseName.value = selectedCourse.value.name
        courseCode.value = selectedCourse.value.code
        courseButton.value = 'Update'
        courseHandler.value = 'update'
        isVisibleCourseModal.value = !isVisibleCourseModal.value
    }
    else if (which === 'cancel') {
        setTimeout(() => {
            courseTitle.value = ''
            courseImage.value = 0
            courseName.value = ''
            courseCode.value = ''
            courseButton.value = ''
            courseHandler.value = ''
            selectedCourse.value = null
            showErrorInput.value = false;
            isCourseNameOk.value = false;
            isCourseCodeOk.value = false;
        }, 200)
        isVisibleCourseModal.value = !isVisibleCourseModal.value
    }
}

// 🕵️ Watchers to auto-clear red border when typing
watch(courseName, (newVal) => {
    if (newVal.trim() !== "") {
        isCourseNameOk.value = true;
    }

    // ✅ If both inputs are OK, hide error
    if (isCourseNameOk.value && isCourseCodeOk.value) {
        showErrorInput.value = false;
    }
    });

watch(courseCode, (newVal) => {
    if (newVal.trim() !== "") {
        isCourseCodeOk.value = true;
    }

    // ✅ If both inputs are OK, hide error
    if (isCourseNameOk.value && isCourseCodeOk.value) {
        showErrorInput.value = false;
    }
});
//#endregion

//#region 🖼️ CHOOSE IMAGE MODAL
const isVisibleChooseImage = ref(false)
function toggleChooseImage() { isVisibleChooseImage.value = !isVisibleChooseImage.value }

const imageChooseCancel = async () => {
    courseImage.value = 0
    toggleChooseImage()
}
const imageChooseConfirm = async () => { toggleChooseImage() }
//#endregion

//#region 🧩 SUBJECT ASSIGN MODAL
const isVisibleSubjectAssign = ref(false)
function toggleSubjectAssignModal() { isVisibleSubjectAssign.value = !isVisibleSubjectAssign.value }
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
                            <h3 style="margin: 0; line-height: 1;">Add Subjects</h3>
                            
                            <div style="position: relative; width: 100%;"  ref="subjectWrapper">
                                <input v-model="addSubjects" 
                                        @focus="inputFocused = true" 
                                        placeholder="Search here..."></input>

                                <!-- Dropdown suggestions -->
                                <div v-if="inputFocused && filteredSubjects.length" 
                                    class="dropdown"> 

                                    <div v-for="(subj, index) in filteredSubjects" 
                                        :key="subj.subject_id"
                                        @click="selectSubject(subj)"
                                        class="dropdown-item"
                                        :class="{ 'assigned-course': fetchedSubjects.some(fs => fs.subject_id === subj.subject_id) }">
                                        {{ subj.subject_name }}
                                    </div>
                                </div>
                            </div>
                            
                            <div style="height: 100%; padding: 25px; margin-top: 4px; border: 1px solid rgba(0, 0, 0, 0.2); 
                                        box-shadow: 0 0px 4px rgba(0, 0, 0, 0.2); border-radius: 10px; box-sizing: border-box;">
                                
                
                                <h3 style="margin: 0; line-height: 1; margin-bottom: 20px;">Curriculum</h3>

                                <!-- show a placeholder when empty -->
                                <div v-if="fetchedSubjects.length === 0">
                                    <p class="paragraph--gray">No subjects yet.</p>
                                </div>

                                <div v-for="(subjects, groupKey) in groupedSubjects" :key="groupKey" style="margin-bottom: 32px;">
                                    <p class="paragraph--black-bold" style="margin-bottom: 6px;">{{ groupKey }}</p>

                                    <div v-for="subj in subjects" :key="subj.subject_id"
                                        style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0px; flex-wrap: wrap;">
                                        <label style="flex: 1 1 auto; padding-left: 8px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                            - {{ subj.subject_name }}
                                        </label>

                                        <span @click="toggleDeleteModal('subject', subj.subject_id, subj.subject_name)"
                                            style="display: flex; align-items: center; justify-content: center;
                                                    height: 30px; width: 30px; color: red; font-weight: bold; cursor: pointer; flex-shrink: 0;">
                                            ✕
                                        </span>
                                    </div>
                                </div>

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
                            <input v-model="courseName"
                            :class="{ 'error-input-border': showErrorInput && !isCourseNameOk }"></input>
                        </div>

                        <div>
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Course Code</p>
                            <input v-model="courseCode" style="display: flex; flex-direction: column; width: 120px;"
                            :class="{ 'error-input-border': showErrorInput && !isCourseCodeOk }"></input>
                        </div>

                        <label v-show="showErrorInput" style="color: red; font-size: 0.95rem; margin-right: auto;">{{ errorMessage }}</label>
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

        <!-- Choose Year and Semester Modal -->
        <transition name="fade">
            <div v-show="isVisibleSubjectAssign" class="modal" @click.self="toggleSubjectAssignModal()">
               <div class="modal-content-subject-assign">
                    <h2 style="color: var(--color-primary); line-height: 0; margin: 12px;">Subject Assign Information</h2>

                    <div style="display: flex; flex-direction: row; width: 100%; gap: 14px;">
                        <div style="flex: 1;">
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Year</p>
                            <select v-model="year" style="width: 100%;" :class="{ 'error-input-border': showErrorInput && year.trim() === '' }">
                                <option value="1">1st Year</option>
                                <option value="2">2nd Year</option>
                                <option value="3">3rd Year</option>
                                <option value="4">4th Year</option>
                            </select>
                        </div>

                        <div style="flex: 1;">
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Semester</p>
                            <select v-model="semester" style="width: 100%;" :class="{ 'error-input-border': showErrorInput && semester.trim() === '' }">
                                <option value="1">1st Semester</option>
                                <option value="2">2nd Semester</option>
                            </select>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto;">
                        <button @click="toggleSubjectAssignModal()" class="cancelBtn">Cancel</button>
                        <button @click="subjectAssignConfirm()">Confirm</button>
                    </div>
               </div>
            </div>
        </transition>

        <!-- Delete Course Modal -->
        <transition name="fade">
            <div v-show="isVisibleDeleteModal" class="modal" @click.self="toggleDeleteModal('cancel')"> 
                <div class="delete-modal-content">
                    <div style="display: flex; flex-direction: column; width: 100%; gap: 24px;">
                        <div style="display: flex; flex-direction: row; gap: 10px; align-items: center; justify-content: start;">
                            <svg class="svg-icon" style="width: 2.5em; height: 2.5em; vertical-align: middle;fill: #b84343;overflow: hidden;" viewBox="188 129 648 784" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M779.3 228.2h-113v-35.4c0-34.9-28.4-63.3-63.3-63.3H425c-34.9 0-63.3 28.4-63.3 63.3v35.4h-113c-32.9 0-59.7 26.8-59.7 59.7v38.5c0 32.9 26.8 59.7 59.7 59.7h1.8v412.8c0 54.1 44 98.1 98.1 98.1h330.9c54.1 0 98.1-44 98.1-98.1V386.1h1.8c32.9 0 59.7-26.8 59.7-59.7v-38.5c-0.1-32.9-26.8-59.7-59.8-59.7z m-374.9-35.4c0-11.4 9.2-20.6 20.6-20.6h178c11.4 0 20.6 9.2 20.6 20.6v35.4H404.4v-35.4z m330.4 606c0 30.5-24.8 55.4-55.4 55.4H348.5c-30.5 0-55.4-24.8-55.4-55.4V386.1h441.7v412.7z m61.5-472.4c0 9.4-7.6 17-17 17H248.7c-9.4 0-17-7.6-17-17v-38.5c0-9.4 7.6-17 17-17h530.7c9.4 0 17 7.6 17 17v38.5z"  /><path d="M377.9 462.3h42.7v317.5h-42.7zM492.6 462.3h42.7v317.5h-42.7zM607.4 462.3h42.7v317.5h-42.7z"  /></svg>
                            <h3 style="line-height: 0; font-size: x-large; margin: 10px 0px;">Remove Confirmation</h3>
                        </div>
                        
                        <p style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; white-space: normal;">Are you sure you want to remove <strong>{{ itemNameToDelete }}</strong>?</p>

                        <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto; margin-top: 12px;">
                            <button @click="toggleDeleteModal('cancel')" class="cancelBtn">Cancel</button>
                            <button @click="confirmDelete()"  class="delete-btn">Remove</button>
                        </div>
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

    .modal-content-subject-assign {
        display: flex;
        flex-direction: column;
        background-color: white;
        height: auto;
        align-items: center;
        width: 450px;
        padding-top: 35px;
        padding-bottom: 35px;
        padding-left: 45px;
        padding-right: 45px;
        box-shadow: -2px 0 8px rgba(0,0,0,0.2);
        border-radius: 6px;
        gap: 35px;
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