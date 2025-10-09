<script setup>
    import { useRouter } from 'vue-router'
    import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue"
    import axios from "axios";
    const router = useRouter()

    function backBtn() {
        router.push(`/main/masterlist`)
    }

    const isVisibleMoveUpModal = ref(false)
    const isVisibleAddSection = ref(false)
    const passwordConfirmation = ref("")
    const selectedGroupKey = ref("")

    const searchQueryActive = ref('')
    const searchQueryArchived = ref('')


    /////////////////////////////// FETCH SECTIONS ////////////////////////////
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
    const semesterMap = {
        1: "1st Semester",
        2: "2nd Semester"
    }

    sections.value.forEach((sec) => {
        const semesterText = semesterMap[sec.semester] || sec.semester
        const key = `A.Y. ${sec.academic_year} – ${semesterText}`

        if (!groups[key]) {
        groups[key] = []
        }
        groups[key].push(sec)
    })

    return groups
    })

    /////////////////////////////// FETCH ARCHIVED SECTIONS ////////////////////////////
    const archivedSections = ref([])

    const fetchArchivedSections = async () => {
    try {
        const res = await axios.get("http://localhost:3000/sections-archived")
        archivedSections.value = res.data
    } catch (err) {
        console.error("Error fetching archived sections:", err)
    }
    }

    // Group archived sections by "A.Y. YEAR – Semester"
    const groupedArchivedSections = computed(() => {
    const groups = {}
    const semesterMap = {
        1: "1st Semester",
        2: "2nd Semester"
    }

    archivedSections.value.forEach((sec) => {
        const semesterText = semesterMap[sec.semester] || sec.semester
        const key = `A.Y. ${sec.academic_year} – ${semesterText}`

        if (!groups[key]) {
        groups[key] = []
        }
        groups[key].push(sec)
    })

    return groups
    })

    onMounted(() => {
        fetchSections()
        fetchArchivedSections()
    })

    async function deleteArchivedSection(key) {
    if (!confirm(`Are you sure you want to delete ${key}?`)) return;

        const regex = /A\.Y\. (.*?) – (.*)/;
        const match = key.match(regex);

        if (!match) {
            alert("Invalid group key format.");
            return;
        }

        const academic_year = match[1];
        const semesterText = match[2];
        const semester = semesterText.includes("1st") ? 1 : 2;

        try {
            const res = await axios.delete(
            `http://localhost:3000/sections-archived/${academic_year}/${semester}`
            );

            if (res.data.success) {
            alert("Archived sections deleted successfully.");
            await fetchArchivedSections();
            } else {
            alert("Failed to delete archived sections.");
            }
        } catch (err) {
            console.error("Error deleting archived sections:", err);
            alert("An error occurred while deleting archived sections.");
        }
    }

    /////////////////////////////// FETCH COURSES ////////////////////////////
    const coursesDB = ref([])
    const fetchCourses = async () => {
        try {
            const res = await axios.get("http://localhost:3000/courses");

            if (res.data && Array.isArray(res.data)) {

            // Clear first para walang duplicate
            coursesDB.value.length = 0;

            // Push each item
            res.data.forEach(crse => {
                coursesDB.value.push({
                course_id: crse.course_id,
                course_name: crse.course_name,
                course_code: crse.course_code
                });
            });
            }
        } catch (err) {
            console.error("Error fetching courses:", err);
        }
    }

    onMounted(fetchCourses);

    const activeTab = ref("active") // default active
    const moveUpConfirmation = ref("note") // default note
    
    /////////////////////////////// MOVE UP MODAL ////////////////////////////

    function cancelMoveUpBtn(){
        isVisibleMoveUpModal.value = !isVisibleMoveUpModal.value;
        moveUpConfirmation.value = 'note'
    }

    function toggleMoveUpModal(groupKey){
        selectedGroupKey.value = groupKey
        isVisibleMoveUpModal.value = !isVisibleMoveUpModal.value;
    }

    // Helper to recalculate section_format after year/semester change
    function recalculateSectionFormat(section, newYear, newSemester) {
        // 1Find the course code for the section's course_name
        const selectedCourse = coursesDB.value.find(
            crse => crse.course_name.toLowerCase() === section.course_name.toLowerCase().trim()
        )

        const courseCode = selectedCourse?.course_code || ''

        // Prepare new section format parts
        const yearPart = newYear ? ` ${newYear}` : ''
        const semesterPart = newSemester ? `-${newSemester}` : ''
        const sectionPart = section.section ? section.section : '' // Use the existing section letter

        // Combine all parts (e.g., BSCS 2-1A)
        return `${courseCode}${yearPart}${semesterPart}${sectionPart}`.trim()
    }

    async function moveUpBtn() {
        if (passwordConfirmation.value === 'admin1234') {
            // Regex: A.Y. (YEAR-YEAR) – (SEMESTER TEXT)
            const regex = /^A\.Y\. (\d{4}[–-]\d{4}) – (.*)$/;
            const match = selectedGroupKey.value.match(regex);

            if (!match) {
                alert("Invalid group key format. Expected: A.Y. 2024–2025 – 1st Semester");
                return;
            }

            // Extract original parts and standardize academic year
            const currentAcademicYear = match[1].replace(/–/g, '-');
            const [startYearStr, endYearStr] = currentAcademicYear.split('-');
            const startYear = parseInt(startYearStr);
            const endYear = parseInt(endYearStr);
                
            const semesterText = match[2].trim();
            const semester = semesterText.includes("1st") ? 1 : 2;

            // ⚠️ Extract the current sections to process the 'year' field
            const sectionsToMove = sections.value.filter(
                sec => sec.academic_year.replace(/–/g, '-') === currentAcademicYear && sec.semester === semester
            );

            if (sectionsToMove.length === 0) {
                alert("No active sections found for this Academic Year and Semester to move up.");
                isVisibleMoveUpModal.value = false;
                moveUpConfirmation.value = 'note';
                return;
            }

            try {
                // 1. Archive ALL sections for the current A.Y. and Semester
                await axios.post("http://localhost:3000/sections/archive-sections", {
                    academic_year: currentAcademicYear,
                    semester,
                });

                // 2. Determine the new status for each section and send individual updates

                for (const section of sectionsToMove) {
                    let newSemester = section.semester;
                    let newAcademicYear = currentAcademicYear;
                    let newYear = section.year;
                    let deleteAfterArchive = false;
                    let newSectionFormat = section.section_format; // Default to current format

                    if (section.semester === 1) {
                        // Move from Sem 1 to Sem 2 (same A.Y., same year level)
                        newSemester = 2;
                        
                    } else if (section.semester === 2) {
                        // Move from Sem 2 to next Sem 1

                        // Check for graduation (Year 4 completion)
                        if (section.year >= 4) { // Assuming 4 is the max year
                            deleteAfterArchive = true;
                            
                        } else {
                            // Advance to next year level (e.g., Year 1 -> Year 2)
                            newYear = section.year + 1;
                            newSemester = 1;
                            // Advance to next Academic Year
                            newAcademicYear = `${startYear + 1}-${endYear + 1}`;
                        }
                    }
                    
                    // Recalculate section format only if it's NOT a graduating section
                    if (!deleteAfterArchive) {
                        newSectionFormat = recalculateSectionFormat(section, newYear, newSemester);
                    }

                    if (deleteAfterArchive) {
                        // 2b. If it's a graduating section, delete it from the Sections table
                        await axios.delete(`http://localhost:3000/sections/${section.section_id}`);
                    } else {
                        // 2c. Otherwise, update the section with new year/semester/academic_year/format
                        await axios.put(`http://localhost:3000/sections/advance/${section.section_id}`, {
                            new_academic_year: newAcademicYear,
                            new_semester: newSemester,
                            new_year: newYear,
                            new_section_format: newSectionFormat, // ⬅️ NEW: Send the updated format
                        });
                    }
                }

                alert("Sections moved up successfully!");

                await fetchSections();
                await fetchArchivedSections();

                isVisibleMoveUpModal.value = false;
                moveUpConfirmation.value = 'note';

            } catch (err) {
                console.error("Error moving up sections:", err);
                alert("Failed to move up sections. See console for details.");
            }
        } else {
            alert("Wrong password!");
        }
    }






    /////////////////////////////// ADD SECTION MODAL ////////////////////////////
    // data value
    const course = ref('')
    const year = ref('')
    const semester = ref('')
    const section = ref('')
    const academicYear = ref('')
    const studentsCount = ref(0)
    const sectionFormat = ref('')
    const sectionHandler = ref()

    // UI
    const sectionTitle = ref()
    const sectionButton = ref()
    const courseWrapper = ref(null)
    const inputFocused = ref(false)
    const showErrorInput = ref(false)

    // Filter courses based on user input
    const filteredCourses = computed(() => {
        if (!course.value) {
            // show all courses if input is blank
            return coursesDB.value.map(crse => ({
                course_id: crse.course_id,
                course_name: crse.course_name,
                course_code: crse.course_code  || ''
            }))
        }

        // filter based on input if user types
        return coursesDB.value
            .filter(crse =>
                crse.course_name.toLowerCase().includes(course.value.toLowerCase())
            )
            .map(crse => ({
                course_id: crse.course_id,
                course_name: crse.course_name
            }))
    })

    function selectCourse(crse){
        course.value = crse.course_name
        inputFocused.value = false
    }

    // Close dropdown when clicked outside
    function handleClickOutside(event) {
        if (courseWrapper.value && !courseWrapper.value.contains(event.target)) {
            inputFocused.value = false
        }
    }

    onMounted(() => {
        document.addEventListener('mousedown', handleClickOutside)
    })

    onBeforeUnmount(() => {
        document.removeEventListener('mousedown', handleClickOutside)
    })

    function notListed() {
        router.push(`/main/masterlist/courses`);
    }

    // academic year options
    const currentYear = new Date().getFullYear()

    const academicYears = ref(
    Array.from({ length: 2 }, (_, i) => {
        const start = currentYear - 1 + i
        const end = start + 1
        return {
        value: `${start}-${end}`,
        label: `${start}-${end}`
        }
    })
    )

    // Students Count
    const handleStudentCountInput = (e) => {
    // Keep only digits
    const value = e.target.value.replace(/[^0-9]/g, "")
    // Update both input and ref
    e.target.value = value
    studentsCount.value = value ? parseInt(value) : 0
    }

    const toggleSectionModal = (which) => {
        isVisibleAddSection.value = !isVisibleAddSection.value

        if(which === 'add'){
            sectionTitle.value = 'Section Information'
            sectionButton.value = 'Confirm'
            sectionHandler.value = 'add'
        }

        else if(which === 'update'){
            sectionTitle.value = 'Update Information'
            sectionButton.value = 'Update'
            sectionHandler.value = 'update'
        }
        
        else if('cancel'){
            resetInputs();
            showErrorInput.value = false
        }
    }

    function resetInputs() {
        setTimeout(() => {
            course.value = ''
            year.value = ''
            semester.value = ''
            section.value = ''
            academicYear.value = ''
            studentsCount.value = 0
            sectionFormat.value = ''
        }, 100);
    }

    // define courseExists
    const courseExists = computed(() =>
        coursesDB.value.some(
            crse => crse.course_name.toLowerCase() === course.value.toLowerCase().trim()
        )
    )
    const sectionConfirm = async () => {
    
        if(course.value !== '' &&
            courseExists.value &&
            year.value !== '' &&
            semester.value !== '' &&
            section.value !== '' &&
            academicYear.value !== '' &&
            studentsCount.value !== 0
            ){
            
            if(sectionHandler.value == 'add') {
                try {
                    const res = await axios.post("http://localhost:3000/add-section", {
                    course_name: course.value,
                    year: year.value,
                    semester: semester.value,
                    section: section.value,
                    academic_year: academicYear.value,
                    student_count: studentsCount.value || 0,
                    section_format: sectionFormat.value
                    })

                    if (res.data.success) {
                    console.log("Section added successfully!") 
                    console.log("success")

                    } else {
                    console.log(res.data.message || "Failed to add section.") 
                    console.log("error")
                    }
                } catch (err) {
                    console.error(err)
                } 
                fetchSections()
                toggleSectionModal()
            }

            else if(sectionHandler.value == 'update') {
                alert("updated")
            }
        }

        else {
            showErrorInput.value = false
            setTimeout(() => { showErrorInput.value = true; }, 0);
        }

    }

    // 👇 Watch for changes in course, year, semester, or section
    watch([course, year, semester, section, coursesDB], () => {
        // 1️⃣ Find the course in the database
        const selectedCourse = coursesDB.value.find(
            crse => crse.course_name.toLowerCase() === course.value.toLowerCase().trim()
        )

        // 2️⃣ Get course code if found, else empty
        const courseCode = selectedCourse?.course_code || ''

        // 3️⃣ Prepare section format parts
        const yearPart = year.value ? ` ${year.value}` : ''
        const semesterPart = semester.value ? `-${semester.value}` : ''
        const sectionPart = section.value ? `${section.value}` : ''

        // 4️⃣ Combine all parts (e.g. BSCS 1-1A)
        sectionFormat.value = `${courseCode}${yearPart}${semesterPart}${sectionPart}`.trim()
    }, { deep: true })

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
                <h1>Sections</h1>
                <p class="paragraph--gray">Add section details to include in scheduling.</p>
            </div>
        </header>

        <main>
            <div class="toggle-container">

                <div 
                    :class="['navBtn', 'toggle-btn', { active: activeTab === 'active' }]" 
                    @click="activeTab = 'active'"
                    >
                    <p>Active</p>
                    </div>

                    <div 
                    :class="['navBtn', 'toggle-btn', { active: activeTab === 'archived' }]" 
                    @click="activeTab = 'archived'"
                    >
                    <p>Archived</p>
                </div>
                
            </div>

            <!-- Content -->
            <div style="display: flex; flex-direction: column; gap: 18px;" v-if="activeTab === 'active'">
                <div style="display: flex; flex-direction: row; gap: 10px; align-items: center;">
                    <div style="position: relative; display: inline-block;">
                        <svg 
                            width="20" 
                            height="20" 
                            viewBox="0 0 22 22" 
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg"
                            style="position: absolute; top: 50%; left: 15px; transform: translateY(-50%); pointer-events: none;"
                        >
                            <path d="M8.69175 16.529C10.5945 16.529 12.3917 15.8545 13.8219 14.6276L20.7744 21.5978C20.9031 21.7272 21.0727 21.7919 21.2417 21.7919C21.41 21.7919 21.5789 21.7279 21.7076 21.5992C21.9657 21.3418 21.9663 20.924 21.7089 20.6659L14.7506 13.6904C17.3556 10.5791 17.2038 5.9202 14.2853 2.99507C12.791 1.49687 10.8044 0.671875 8.69109 0.671875C6.57778 0.671875 4.59117 1.49687 3.09693 2.99507C0.0140752 6.08586 0.0140752 11.1157 3.09693 14.2065C4.59183 15.704 6.57843 16.529 8.69175 16.529ZM4.03215 3.92699C5.27691 2.67893 6.93153 1.99187 8.69175 1.99187C10.452 1.99187 12.1066 2.67893 13.3514 3.92699C15.9221 6.50429 15.9221 10.6973 13.3514 13.2746C12.1066 14.5226 10.452 15.2097 8.69175 15.2097C6.93153 15.2097 5.27691 14.5226 4.03215 13.2746C1.46211 10.6973 1.46211 6.50429 4.03215 3.92699Z" fill="#757070"/>
                        </svg>

                        <input 
                            v-model="searchQueryActive"
                            style="width: 380px; padding-left: 45px;"
                            placeholder="Search"
                        />
                    </div>

                    <!-- Sort -->
                    <select style="margin-left: 0px; padding: 6px; padding-left: 15px;">
                        <option value="">Sort by</option>
                    </select>

                    <button @click="toggleSectionModal('add')" style="margin-left: auto; width: 200px;">+ Add Section</button>
                </div>

                <div style="display: flex; flex-direction: column; gap: 35px;">
                    <!-- Loop through each A.Y. + Semester group -->
                    <div
                        v-for="(sections, groupKey) in groupedSections"
                        :key="groupKey"
                        >
                        <!-- Header -->
                        <div
                            style="display: flex; flex-direction: row; gap: 6px; align-items: center; margin-bottom: 10px;"
                        >
                            <h3 style="line-height: 0;">{{ groupKey }}</h3>

                            <!-- Toggle visibility -->
                            <svg
                            @click="toggleMoveUpModal(groupKey)"
                            width="30"
                            height="100%"
                            viewBox="0 0 32 32"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            style="cursor: pointer;"
                            >
                            <path
                                d="M23.636 4C26.046 4 28 5.954 28 8.364V23.636C28 24.7934 27.5402 25.9034 26.7218 26.7218C25.9034 27.5402 24.7934 28 23.636 28H8.364C7.79091 28 7.22343 27.8871 6.69397 27.6678C6.1645 27.4485 5.68342 27.127 5.27819 26.7218C4.45978 25.9034 4 24.7934 4 23.636V8.364C4 5.954 5.954 4 8.364 4H23.636ZM16.006 9.454H15.996L15.982 9.456H15.956L15.93 9.458H15.916L15.892 9.462H15.874L15.854 9.466L15.834 9.47L15.82 9.474L15.792 9.48C15.6494 9.51464 15.5188 9.5872 15.414 9.69L11.876 13.152C11.7999 13.2263 11.7394 13.3151 11.6981 13.4132C11.6567 13.5113 11.6355 13.6166 11.6355 13.723C11.6355 13.8294 11.6567 13.9347 11.6981 14.0328C11.7394 14.1309 11.7999 14.2197 11.876 14.294C12.0326 14.4449 12.2415 14.5293 12.459 14.5293C12.6765 14.5293 12.8854 14.4449 13.042 14.294L15.17 12.212V21.738C15.1732 21.9541 15.2615 22.1602 15.4158 22.3115C15.5701 22.4628 15.7779 22.5471 15.994 22.546C16.2105 22.5476 16.4188 22.4636 16.5735 22.3122C16.7282 22.1608 16.8168 21.9544 16.82 21.738V12.202L18.958 14.294C19.1146 14.4449 19.3235 14.5293 19.541 14.5293C19.7585 14.5293 19.9674 14.4449 20.124 14.294C20.1998 14.2197 20.2601 14.131 20.3012 14.0331C20.3423 13.9353 20.3635 13.8302 20.3635 13.724C20.3635 13.6178 20.3423 13.5127 20.3012 13.4149C20.2601 13.317 20.1998 13.2283 20.124 13.154L16.588 9.688C16.4324 9.53614 16.2234 9.4514 16.006 9.452V9.454Z"
                                fill="#0785D4"
                            />
                            </svg>
                        </div>

                        <!-- Cards -->
                        <div class="card-container">
                            <div
                            v-for="section in sections"
                            :key="section.section_id"
                            class="card"
                            >
                            <p class="paragraph--black-bold">{{ section.section_format }}</p>
                            <p>{{ section.course_name }}</p>
                            <p style="margin-top: 16px;">{{ section.student_count }} Students</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 18px;" v-else-if="activeTab === 'archived'">
                <div style="display: flex; flex-direction: row; gap: 10px; align-items: center;">
                    <div style="position: relative; display: inline-block;">
                        <svg 
                            width="20" 
                            height="20" 
                            viewBox="0 0 22 22" 
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg"
                            style="position: absolute; top: 50%; left: 15px; transform: translateY(-50%); pointer-events: none;"
                        >
                            <path d="M8.69175 16.529C10.5945 16.529 12.3917 15.8545 13.8219 14.6276L20.7744 21.5978C20.9031 21.7272 21.0727 21.7919 21.2417 21.7919C21.41 21.7919 21.5789 21.7279 21.7076 21.5992C21.9657 21.3418 21.9663 20.924 21.7089 20.6659L14.7506 13.6904C17.3556 10.5791 17.2038 5.9202 14.2853 2.99507C12.791 1.49687 10.8044 0.671875 8.69109 0.671875C6.57778 0.671875 4.59117 1.49687 3.09693 2.99507C0.0140752 6.08586 0.0140752 11.1157 3.09693 14.2065C4.59183 15.704 6.57843 16.529 8.69175 16.529ZM4.03215 3.92699C5.27691 2.67893 6.93153 1.99187 8.69175 1.99187C10.452 1.99187 12.1066 2.67893 13.3514 3.92699C15.9221 6.50429 15.9221 10.6973 13.3514 13.2746C12.1066 14.5226 10.452 15.2097 8.69175 15.2097C6.93153 15.2097 5.27691 14.5226 4.03215 13.2746C1.46211 10.6973 1.46211 6.50429 4.03215 3.92699Z" fill="#757070"/>
                        </svg>

                        <input 
                            v-model="searchQueryArchived"
                            style="width: 380px; padding-left: 45px;"
                            placeholder="Search"
                        />
                    </div>

                    <!-- Sort -->
                    <select style="margin-left: 0px; padding: 6px; padding-left: 15px;">
                        <option value="">Sort by</option>
                    </select>
                </div>

                <div style="display: flex; flex-direction: column; gap: 35px;">
                    <div v-for="(group, key) in groupedArchivedSections" :key="key">
                    <div style="display: flex; flex-direction: row; gap: 6px; align-items: center; margin-bottom: 10px;">
                        <h3 style="line-height: 0;">{{ key }}</h3>

                        <svg @click="deleteArchivedSection(key)" style="cursor: pointer;" width="22" height="100%" viewBox="0 0 30 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11.1427 25.6427V11.4999C11.1427 11.313 11.0827 11.1587 10.9627 11.037C10.8427 10.9153 10.6884 10.8553 10.4998 10.857H9.21411C9.02726 10.857 8.87297 10.917 8.75126 11.037C8.62954 11.157 8.56954 11.3113 8.57126 11.4999V25.6427C8.57126 25.8296 8.63126 25.9839 8.75126 26.1056C8.87126 26.2273 9.02554 26.2873 9.21411 26.2856H10.4998C10.6867 26.2856 10.841 26.2256 10.9627 26.1056C11.0844 25.9856 11.1444 25.8313 11.1427 25.6427ZM16.2855 25.6427V11.4999C16.2855 11.313 16.2255 11.1587 16.1055 11.037C15.9855 10.9153 15.8313 10.8553 15.6427 10.857H14.357C14.1701 10.857 14.0158 10.917 13.8941 11.037C13.7724 11.157 13.7124 11.3113 13.7141 11.4999V25.6427C13.7141 25.8296 13.7741 25.9839 13.8941 26.1056C14.0141 26.2273 14.1684 26.2873 14.357 26.2856H15.6427C15.8295 26.2856 15.9838 26.2256 16.1055 26.1056C16.2273 25.9856 16.2873 25.8313 16.2855 25.6427ZM21.4284 25.6427V11.4999C21.4284 11.313 21.3684 11.1587 21.2484 11.037C21.1284 10.9153 20.9741 10.8553 20.7855 10.857H19.4998C19.313 10.857 19.1587 10.917 19.037 11.037C18.9153 11.157 18.8553 11.3113 18.857 11.4999V25.6427C18.857 25.8296 18.917 25.9839 19.037 26.1056C19.157 26.2273 19.3113 26.2873 19.4998 26.2856H20.7855C20.9724 26.2856 21.1267 26.2256 21.2484 26.1056C21.3701 25.9856 21.4301 25.8313 21.4284 25.6427ZM10.4998 5.71415H19.4998L18.5355 3.36386C18.4413 3.24386 18.3273 3.17015 18.1935 3.14272H11.8241C11.6904 3.17015 11.5764 3.24386 11.4821 3.36386L10.4998 5.71415ZM29.1427 6.357V7.64272C29.1427 7.82957 29.0827 7.98386 28.9627 8.10557C28.8427 8.22729 28.6884 8.28729 28.4998 8.28558H26.5713V27.3296C26.5713 28.4404 26.2567 29.4013 25.6275 30.2121C24.9984 31.023 24.2415 31.4284 23.357 31.4284H6.64268C5.75811 31.4284 5.00125 31.0367 4.37211 30.2533C3.74297 29.4699 3.4284 28.5227 3.4284 27.4119V8.28558H1.49983C1.31297 8.28558 1.15868 8.22557 1.03697 8.10557C0.915255 7.98557 0.855255 7.83129 0.856969 7.64272V6.357C0.856969 6.17015 0.916969 6.01586 1.03697 5.89415C1.15697 5.77243 1.31126 5.71243 1.49983 5.71415H7.70725L9.11383 2.35843C9.3144 1.863 9.67611 1.44129 10.199 1.09329C10.7218 0.745289 11.2507 0.571289 11.7855 0.571289H18.2141C18.749 0.571289 19.2778 0.745289 19.8007 1.09329C20.3235 1.44129 20.6853 1.863 20.8858 2.35843L22.2924 5.71415H28.4998C28.6867 5.71415 28.841 5.77415 28.9627 5.89415C29.0844 6.01415 29.1444 6.16843 29.1427 6.357Z" fill="#A83838"/>
                        </svg>
                    </div>
                    <div class="card-container">
                        <div v-for="section in group" :key="section.section_id" class="card">
                        <p class="paragraph--black-bold">{{ section.section_format }}</p>
                        <p>{{ section.course_name }}</p>
                        <p style="margin-top: 16px;">{{ section.student_count }} Students</p>
                        </div>
                    </div>
                    </div>
                </div>
            </div>


        </main>

        <!-- Move Up / Archive Modal -->
        <transition name="fade" mode="out-in">
            <div v-show="isVisibleMoveUpModal" class="modal" @click.self="cancelMoveUpBtn"> 
                <div class="modal-content-archive">

                    <transition name="slide-left">
                        <div style="display: flex; flex-direction: column; width: 100%; gap: 20px;" v-if="moveUpConfirmation === 'note'">
                            <div style="display: flex; flex-direction: row; gap: 12px; align-items: start; justify-self: start;">
                                <svg width="45" height="43" viewBox="0 0 58 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clip-path="url(#clip0_255_177)">
                                    <path d="M11.0646 55.9897H4.37629C3.21563 55.9897 2.1025 55.5319 1.28179 54.7171C0.461073 53.9022 1.46083e-08 52.797 0 51.6447V40.6078C0 39.4554 0.461073 38.3503 1.28179 37.5354C2.1025 36.7206 3.21563 36.2628 4.37629 36.2628H11.044C12.2046 36.2628 13.3177 36.7206 14.1385 37.5354C14.9592 38.3503 15.4202 39.4554 15.4202 40.6078V51.6447C15.4203 52.7935 14.962 53.8956 14.1458 54.7099C13.3295 55.5241 12.2217 55.9843 11.0646 55.9897ZM4.37629 38.3123C3.76311 38.3123 3.17505 38.5542 2.74146 38.9847C2.30788 39.4152 2.06429 39.999 2.06429 40.6078V51.6447C2.06429 52.2535 2.30788 52.8373 2.74146 53.2678C3.17505 53.6983 3.76311 53.9402 4.37629 53.9402H11.044C11.6571 53.9402 12.2452 53.6983 12.6788 53.2678C13.1124 52.8373 13.356 52.2535 13.356 51.6447V40.6078C13.356 39.999 13.1124 39.4152 12.6788 38.9847C12.2452 38.5542 11.6571 38.3123 11.044 38.3123H4.37629ZM32.3681 55.9897H25.7004C24.5397 55.9897 23.4266 55.5319 22.6059 54.7171C21.7852 53.9022 21.3241 52.797 21.3241 51.6447V30.4933C21.3241 29.3409 21.7852 28.2357 22.6059 27.4209C23.4266 26.606 24.5397 26.1482 25.7004 26.1482H32.3681C33.5287 26.1482 34.6419 26.606 35.4626 27.4209C36.2833 28.2357 36.7444 29.3409 36.7444 30.4933V51.6549C36.7416 52.8055 36.2793 53.9081 35.4589 54.7207C34.6385 55.5334 33.5269 55.9897 32.3681 55.9897ZM25.7004 28.1978C25.0872 28.1978 24.4992 28.4396 24.0656 28.8701C23.632 29.3006 23.3884 29.8845 23.3884 30.4933V51.6549C23.3884 52.2637 23.632 52.8476 24.0656 53.2781C24.4992 53.7086 25.0872 53.9504 25.7004 53.9504H32.3681C32.9812 53.9504 33.5693 53.7086 34.0029 53.2781C34.4365 52.8476 34.6801 52.2637 34.6801 51.6549V30.4933C34.6801 29.8845 34.4365 29.3006 34.0029 28.8701C33.5693 28.4396 32.9812 28.1978 32.3681 28.1978H25.7004ZM53.6715 55.9897H47.0039C45.8432 55.9897 44.7301 55.5319 43.9094 54.7171C43.0887 53.9022 42.6276 52.797 42.6276 51.6447V14.2711C42.6276 13.1187 43.0887 12.0135 43.9094 11.1987C44.7301 10.3838 45.8432 9.92602 47.0039 9.92602H53.6715C54.8322 9.92602 55.9453 10.3838 56.7661 11.1987C57.5868 12.0135 58.0478 13.1187 58.0478 14.2711V51.6447C58.0478 52.797 57.5868 53.9022 56.7661 54.7171C55.9453 55.5319 54.8322 55.9897 53.6715 55.9897ZM47.0039 11.9858C46.3907 11.9858 45.8026 12.2277 45.3691 12.6582C44.9355 13.0886 44.6919 13.6725 44.6919 14.2813V51.6549C44.6919 52.2637 44.9355 52.8476 45.3691 53.2781C45.8026 53.7086 46.3907 53.9504 47.0039 53.9504H53.6715C54.2847 53.9504 54.8728 53.7086 55.3064 53.2781C55.74 52.8476 55.9835 52.2637 55.9835 51.6549V14.2711C55.9835 13.9696 55.9237 13.6711 55.8076 13.3926C55.6914 13.1141 55.5211 12.8611 55.3064 12.6479C55.0917 12.4347 54.8368 12.2657 54.5563 12.1503C54.2758 12.0349 53.9752 11.9756 53.6715 11.9756H47.0039V11.9858ZM6.94634 26.8553C6.61977 26.8555 6.29996 26.763 6.02457 26.5887C5.74919 26.4145 5.52969 26.1657 5.39195 25.8717C5.25421 25.5777 5.20395 25.2508 5.2471 24.9294C5.29026 24.608 5.42502 24.3056 5.63551 24.0577L20.6532 6.91317L19.3734 5.24279C19.1618 4.97685 19.0254 4.65971 18.9783 4.32405C18.9313 3.98838 18.9752 3.64632 19.1056 3.33312C19.236 3.01991 19.4481 2.74689 19.7201 2.54217C19.9922 2.33746 20.3143 2.20846 20.6532 2.16846L37.4049 0.0164269C37.7344 -0.0271517 38.0696 0.0163447 38.3766 0.142524C38.6837 0.268703 38.9519 0.473098 39.1539 0.735069C39.356 0.997041 39.4849 1.30731 39.5276 1.63456C39.5702 1.9618 39.5252 2.29443 39.397 2.59886L32.8635 18.0422C32.7339 18.352 32.5243 18.6223 32.2559 18.8258C31.9874 19.0294 31.6696 19.159 31.3346 19.2017C30.9995 19.2443 30.6591 19.1984 30.3476 19.0686C30.0361 18.9388 29.7647 18.7297 29.5606 18.4624L28.2808 16.792L7.63787 26.6606C7.42304 26.7714 7.18776 26.8376 6.94634 26.8553ZM21.159 4.19752L22.3666 5.76542C22.6379 6.10308 22.7857 6.52222 22.7857 6.95416C22.7857 7.38611 22.6379 7.80525 22.3666 8.1429L8.38102 24.1089L27.5583 14.8859C27.9549 14.7 28.4037 14.6545 28.83 14.7571C29.2562 14.8596 29.6343 15.104 29.9012 15.4496L31.1089 17.0175L37.3843 2.08648L21.159 4.19752Z" fill="#0785D4"/>
                                    </g>
                                    <defs>
                                    <clipPath id="clip0_255_177">
                                    <rect width="58" height="56" fill="white"/>
                                    </clipPath>
                                    </defs>
                                </svg>

                                <h2 style="line-height: 0;">Move Up</h2>
                            </div>
                            
                            <p>Move <strong>{{ selectedGroupKey }}?</strong> This action will also archive it.</p>

                            <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto; margin-top: 4px;">
                                <button @click="cancelMoveUpBtn" class="cancelBtn">Cancel</button>
                                <button @click="moveUpConfirmation = 'confirmation'">Confirm</button>
                            </div>
                        </div>

                        <div style="display: flex; flex-direction: column; width: 100%; gap: 6px;"  v-else-if="moveUpConfirmation === 'confirmation'">
                            <div style="display: flex; flex-direction: row; gap: 10px; align-items: start; justify-self: start;">
                                <svg class="svg-icon" style="width: 2.5em; height: 2.5em;vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M1001.661867 796.544c48.896 84.906667 7.68 157.013333-87.552 157.013333H110.781867c-97.834667 0-139.050667-69.504-90.112-157.013333l401.664-666.88c48.896-87.552 128.725333-87.552 177.664 0l401.664 666.88zM479.165867 296.533333v341.333334a32 32 0 1 0 64 0v-341.333334a32 32 0 1 0-64 0z m0 469.333334v42.666666a32 32 0 1 0 64 0v-42.666666a32 32 0 1 0-64 0z" fill="#FAAD14" /></svg>

                                <h2 style="line-height: 0;">Confirmation</h2>
                            </div>
                            
                            <div>
                                <p class="paragraph--black-bold" style="line-height: 2.2;">(This action cannot be undone.)</p>
                                <input v-model="passwordConfirmation" placeholder="Enter your password"></input>
                            </div>

                            <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto; margin-top: 20px; margin-bottom: 4px;">
                                <button @click="cancelMoveUpBtn" class="cancelBtn">Cancel</button>
                                <button style="background-color: #A83838; border-color: #A83838;" @click="moveUpBtn">Move Up</button>
                            </div>
                        </div>
                    </transition>

                </div>
            </div>
        </transition>

        <!-- Add Section Modal -->
        <transition name="fade">
            <div v-show="isVisibleAddSection" class="modal" @click.self="toggleSectionModal('cancel')">
               <div class="modal-content-add-subject">
                    <h2 style="color: var(--color-primary); line-height: 0; margin: 12px;">{{ sectionTitle }}</h2>

                    <div style="display: flex; flex-direction: column; width: 100%; gap: 14px;">
                        <!-- Courses -->
                        <div ref="courseWrapper">
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Course</p>
                            <div style="display: flex; flex-direction: row; flex-wrap: nowrap; gap: 10px; align-items: center;">
                                <div style="position: relative; width: 100%;">
                                    <input v-model="course" 
                                            @focus="inputFocused = true" 
                                            placeholder="Search here"
                                            :class="{ 'error-input-border': showErrorInput && (course.trim() === '' || !courseExists) }"></input>

                                    <!-- Dropdown suggestions -->
                                    <div v-if="inputFocused && filteredCourses.length" 
                                        style="position: absolute; display: flex; flex-direction: column; background-color: white;
                                                width: 100%;  padding-top: 6px; padding-bottom: 6px; border-radius: 6px; border: 1px solid var(--color-border);
                                                margin-top: 6px; box-sizing: border-box;
                                                max-height: 200px; overflow-y: auto;"> 

                                        <div v-for="(crse, index) in filteredCourses" 
                                            :key="crse.course_id"
                                            @click="selectCourse(crse)"
                                            class="dropdown-item">
                                            {{ crse.course_name }}
                                        </div>
                                    </div>
                                </div>
                                <p class="paragraph--gray" @click="notListed" style="font-weight: 600; color: #6799C8; white-space: nowrap; text-decoration: underline; text-underline-offset: 4px; cursor: pointer;">Not listed?</p>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto; column-gap: 25px; row-gap: 14px;">
                            <div>
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Year</p>
                                <select v-model="year" style="width: 100%;" :class="{ 'error-input-border': showErrorInput && year.trim() === '' }">
                                    <option value="1">1st Year</option>
                                    <option value="2">2nd Year</option>
                                    <option value="3">3rd Year</option>
                                    <option value="4">4th Year</option>
                                </select>
                            </div>

                            <div>
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Semester</p>
                                <select v-model="semester" style="width: 100%;" :class="{ 'error-input-border': showErrorInput && semester.trim() === '' }">
                                    <option value="1">1st Semester</option>
                                    <option value="2">2nd Semester</option>
                                </select>
                            </div>

                            <div>
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Section</p>
                                <select v-model="section" style="width: 100%;" :class="{ 'error-input-border': showErrorInput && section.trim() === '' }">
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                    <option value="D">B</option>
                                </select>
                            </div>

                            <div>
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Academic Year</p>
                                <select v-model="academicYear" style="width: 100%;" :class="{ 'error-input-border': showErrorInput && academicYear.trim() === '' }">
                                    <option 
                                        v-for="academicYear in academicYears" 
                                        :key="academicYear.value" 
                                        :value="academicYear.value">
                                        {{ academicYear.label }}
                                    </option>
                                </select>
                            </div>

                            <div>
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Students Count</p>
                                <input :value="studentsCount" @input="handleStudentCountInput" inputmode="numeric" pattern="[0-9]*" :class="{ 'error-input-border': showErrorInput && studentsCount === 0 }"></input>
                            </div>

                            <div>
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Section Format</p>
                                <input v-model="sectionFormat" readonly style="pointer-events: none; background-color: var(--color-lightgray);"></input>
                            </div>

                        </div>
                        
                    </div>

                    <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto;">
                        <button @click="toggleSectionModal('cancel')" class="cancelBtn">Cancel</button>
                        <button @click="sectionConfirm">{{ sectionButton }}</button>
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
        gap: 18px;
    }

    .toggle-container {
        display: flex;
        flex-direction: row;
        border-radius: 6px;
        border: 1px solid #0786D4;
        width: fit-content;
    }

    .navBtn {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 90px;
        height: 36px;
        user-select: none;
    }

    .navBtn:last-child {
        border-right: none;
    }

    /* Round the edges */
    .navBtn:first-child {
        border-top-left-radius: 4px;
        border-bottom-left-radius: 4px;
    }

    .navBtn:last-child {
        border-top-right-radius: 4px;
        border-bottom-right-radius: 4px;
    }

    .navBtn:hover {
        background-color: var(--color-lightgray-hover);
        transition: 0.1s ease-in-out;
    }

    .navBtn.active {
        background-color: var(--color-primary);
        padding-bottom: 0px;
    }

    .navBtn.active p {
        color: white;
        font-weight: 600;
    }

    .navBtn p {
        color: var(--color-primary);
        font-size: 0.9rem;
    }

    .card-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(370px, 0.6fr));
        gap: 16px;
    }

    .card {
        display: flex;
        flex-direction: column;
        height: auto;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 0px 6px rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(0, 0, 0, 0.2);
        user-select: none;
        padding: 18px;
        transition: all 0.2s ease;
    }

    .card:hover {
        box-shadow: 0 0px 6px var(--color-primary);
        scale: 1.01;
        transition: all 0.2s ease;
    }

    .modal-content-archive {
        display:flex; 
        justify-content:center; 
        align-items:center;
        background-color: white;
        height: 235px;
        width: 400px;
        padding-left: 40px;
        padding-right: 40px;
        box-shadow: -2px 0 8px rgba(0,0,0,0.2);
        border-radius: 6px;
    }

    .modal-content-add-subject {
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

    .dropdown-item {
        padding-left: 12px;
        padding-right: 12px;
        padding-top: 6px;
        padding-bottom: 6px;
        cursor: pointer;
        border-radius: 4px;
        color: black;
    }

    .dropdown-item:hover {
        background: #eee;
    }

    /* Transition classes */
    .slide-left-enter-from  { transform: translateX(20px); opacity: 0; }
    .slide-left-enter-active{ transition: transform .28s ease, opacity .28s ease; }
    .slide-left-enter-to    { transform: translateX(0); opacity: 1; }

    .slide-left-leave-from  { transform: translateX(0); opacity: 1; }
    .slide-left-leave-active{ transition: transform .22s ease, opacity .22s ease; }
    .slide-left-leave-to    { transform: translateX(-20px); opacity: 0; }

    /* Fade */
    .fade-enter-active, .fade-leave-active {
    transition: opacity 0.2s ease;
    }
    .fade-enter-from, .fade-leave-to {
    opacity: 0;
    }
    .fade-enter-to, .fade-leave-from {
    opacity: 1;
    }
    
</style>