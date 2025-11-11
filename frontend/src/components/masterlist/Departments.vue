<script setup>
    import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue"
    import { useRouter } from 'vue-router'
    import axios from "axios";

    const router = useRouter()

    // Data
    const departments = ref([])
    const departmentImage = ref(0);
    const departmentName = ref('');
    const departmentCode = ref('');
    const addCourses = ref('')
    const coursesDB = ref([]) // raw
    const teacherDepartmentsDB = ref([]); // raw

    // Fetched courses based on department click
    const fetchedCourses = ref([])

    // UI
    const inputFocused = ref(false)
    const courseWrapper = ref(null)

    // Selected Department
    const selectedDept = ref(null)
    

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

    /////////////////////////////// FETCH TEACHER DEPARTMENTS ////////////////////////////
    const fetchTeacherDepartments = async () => {
    try {
        const res = await axios.get("http://localhost:3000/teacher-departments");
        if (res.data.success && Array.isArray(res.data.associations)) {
            // Store the raw associations
            teacherDepartmentsDB.value = res.data.associations;
        }
    } catch (err) {
        console.error("Error fetching raw teacher departments:", err);
    }
}

    /////////////////////////////// FETCH DEPARTMENTS ////////////////////////////
    const fetchDepartments = async () => {
        try {
            // 1. Ensure course and teacher-department data are populated
            if (coursesDB.value.length === 0) {
                await fetchCourses();
            }
            // CALL NEW FETCH FUNCTION
            await fetchTeacherDepartments(); 

            // 2. Fetch Department Data
            const res = await axios.get("http://localhost:3000/departments");

            // 3. Count courses per department_id (EXISTING LOGIC)
            const courseCounts = coursesDB.value.reduce((acc, course) => {
                const deptId = course.department_id;
                acc[deptId] = (acc[deptId] || 0) + 1;
                return acc;
            }, {});

            // 4. Count DISTINCT teachers per department_id (NEW LOGIC)
            const teacherCounts = teacherDepartmentsDB.value.reduce((acc, item) => {
                const deptId = item.department_id;
                // Use a Set temporarily to ensure teachers are counted only once per department
                if (!acc[deptId]) {
                    acc[deptId] = new Set();
                }
                acc[deptId].add(item.teacher_id);
                return acc;
            }, {});

            // 5. Map and populate departments.value with the correct counts
            departments.value = res.data.map(dept => {
                const deptId = dept.department_id;
                
                // Convert the Set size to the final count, default to 0
                const teacherCount = teacherCounts[deptId] ? teacherCounts[deptId].size : 0;

                return {
                    id: deptId,
                    imgIndex: dept.department_image,
                    img: images[dept.department_image] || images[0],
                    name: dept.department_name,
                    code: dept.department_code,
                    
                    // Get the counts from the maps
                    courses: courseCounts[deptId] || 0, 
                    // UPDATED: Use the calculated teacher count
                    teachers: teacherCount 
                };
            });

            console.log("Updated Departments:", departments.value);
        } catch (err) {
            console.error("Error fetching departments:", err);
        }
    }

    // Automatically fetch data when the component is mounted
    onMounted(async () => {
        await fetchDepartments();
    });

    /////////////////////////////// DELETE DEPARTMENT MODAL ////////////////////////////
    const isVisibleDeleteModal = ref(false)
    const deleteHandler = ref('');
    const courseIndexToDelete = ref('');
    const itemNameToDelete = ref('')

    async function deleteDepartment() {
        itemNameToDelete.value = selectedDept.value.name;
        toggleDeleteModal('department')
    }

    function toggleDeleteModal(which, index, courseName) {
        
        if(which === 'department') {
            deleteHandler.value = 'department'
        }
        
        if(which === 'course') {
            deleteHandler.value = 'course'
            courseIndexToDelete.value = index
            itemNameToDelete.value = courseName
        }

        if(which === 'cancel') {
            setTimeout(() => {
                deleteHandler.value = ''
                courseIndexToDelete.value = ''
                itemNameToDelete.value = ''
            }, 200)
        }

        isVisibleDeleteModal.value = !isVisibleDeleteModal.value
    }

    async function confirmDelete() {

        if(deleteHandler.value === 'department') {
            if (!selectedDept.value || !selectedDept.value.id) {
                return;
            }
                    
            const departmentIdToDelete = selectedDept.value.id;

            try {
                // CLEAR COURSES: Send PUT request to set department_id to NULL for all associated courses
                console.log(`Clearing courses for Department ID: ${departmentIdToDelete}`);
                await axios.put(`http://localhost:3000/courses/clear-department/${departmentIdToDelete}`);
                
                // DELETE DEPARTMENT
                await axios.delete(`http://localhost:3000/departments/${departmentIdToDelete}`);

                // UI Update (Refresh Data)
                await fetchDepartments();
                await fetchCourses(); 

                selectedDept.value = null;
                fetchedCourses.value = [];
                
            } catch (err) {
                console.error("Error during department deletion or course clearing:", err);
                // Mas specific na error message
                alert("Failed to delete department. Please check if there are other related data (e.g., teachers) preventing the deletion, or check the console.");
            }

            toggleDeleteModal('cancel')
        }

        if(deleteHandler.value === 'course') {
            
            const course = fetchedCourses.value[courseIndexToDelete.value];

            // Send request to backend to remove department_id
            fetch(`http://localhost:3000/courses/update-department/${course.course_id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ department_id: null }) // set to null
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    fetchCoursesOnDepartment();
                    fetchDepartments(); 
                } else {
                    alert("Failed to remove course from department: " + data.message);
                }
            })
            .catch(err => console.error(err));

            toggleDeleteModal('cancel')
        }
    }

    /////////////////////////////// NAVIGATION FUNCTION ////////////////////////////
    function backBtn() {
        router.push(`/main/masterlist`)
    }

    function navBtn(which) {
        router.push(`/main/masterlist/${which}`)
    }

    function departmentClick(dept) {
        if (selectedDept.value && selectedDept.value.id === dept.id) {
            selectedDept.value = null;
        } else {
            selectedDept.value = dept;

            fetchCoursesOnDepartment();
        }
    }

    const deleteIconColor = computed(() => {
        return selectedDept.value ? '#A83838' : '#CCCCCC'; // #CCCCCC for gray
    });

    const updateIconColor = computed(() => {
        return selectedDept.value ? 'var(--color-primary)' : '#CCCCCC'; // #CCCCCC for gray
    });

    /////////////////////////////// Department Modal ////////////////////////////
    const departmentTitle = ref('');
    const departmentButton = ref('');
    const departmentHandler = ref('');
    const isVisibleDepartmentModal = ref(false)
    
    const showErrorInput = ref(false)
    const errorMessage = ref('')
    const isDepartmentNameOk = ref(false)
    const isDepartmentCodeOk = ref(false)

    const departmentConfirm = async () => {
        // 🔹 Blank Input Validation
        if (!departmentName.value.trim() || !departmentCode.value.trim()) {
            showErrorInput.value = false;
            setTimeout(() => (showErrorInput.value = true), 0);

            isDepartmentNameOk.value = !!departmentName.value.trim();
            isDepartmentCodeOk.value = !!departmentCode.value.trim();

            errorMessage.value = "Please fill in all required fields.";
            return;
        }

        try {
            if (departmentHandler.value === "add") {
            const res = await axios.post("http://localhost:3000/add-department", {
                department_image: departmentImage.value,
                department_name: departmentName.value.trim(),
                department_code: departmentCode.value.trim().toUpperCase(),
            });

            } else if (departmentHandler.value === "update") {
            const res = await axios.put(
                `http://localhost:3000/update-department/${selectedDept.value.id}`,
                {
                department_image: departmentImage.value,
                department_name: departmentName.value.trim(),
                department_code: departmentCode.value.trim().toUpperCase(),
                }
            );
            }

            // 🔹 Refresh and reset
            fetchDepartments();
            toggleDepartmentModal("cancel");
        } catch (error) {
            // 🔹 Duplicate check (based on backend response)
            const message = error.response?.data?.message;

             // 🔹 Reset flags first
            isDepartmentNameOk.value = true;
            isDepartmentCodeOk.value = true;
            let duplicateFound = false;

            if (message.includes("Department name and code already exist.")) {
                isDepartmentNameOk.value = false;
                isDepartmentCodeOk.value = false;
                duplicateFound = true;
            }

            // 🔹 Check both duplicate types and flag both if needed
            else if (message.includes("Department name already exists")) {
                isDepartmentNameOk.value = false;
                duplicateFound = true;
            }
            else if (message.includes("Department code already exists")) {
                isDepartmentCodeOk.value = false;
                duplicateFound = true;
            }

            if (duplicateFound) {
            showErrorInput.value = false;
            setTimeout(() => (showErrorInput.value = true), 0);
            }

            errorMessage.value = message || "Failed to save department."
        }
    };

    function toggleDepartmentModal(which) {
        if(which === 'add'){
            departmentTitle.value = 'Department Information'
            departmentButton.value = 'Confirm'
            departmentHandler.value = 'add'
            isVisibleDepartmentModal.value = !isVisibleDepartmentModal.value
        }

        else if(which === 'update'){
            departmentTitle.value = 'Update Information'
            departmentImage.value = selectedDept.value.imgIndex;
            departmentName.value = selectedDept.value.name;
            departmentCode.value = selectedDept.value.code;
            departmentButton.value = 'Update'
            departmentHandler.value = 'update'
            isVisibleDepartmentModal.value = !isVisibleDepartmentModal.value
        }

        else if(which === 'cancel'){
            setTimeout(() => {
                departmentTitle.value = '';
                departmentImage.value = 0;
                departmentName.value = '';
                departmentCode.value = '';
                departmentButton.value = '';
                departmentHandler.value = '';
                showErrorInput.value = false;
                isDepartmentNameOk.value = false;
                isDepartmentCodeOk.value = false;
            }, 200);

            isVisibleDepartmentModal.value = !isVisibleDepartmentModal.value
        }
    }

    // 🕵️ Watchers to auto-clear red border when typing
    watch(departmentName, (newVal) => {
        if (newVal.trim() !== "") {
            isDepartmentNameOk.value = true;
        }

        // ✅ If both inputs are OK, hide error
        if (isDepartmentNameOk.value && isDepartmentCodeOk.value) {
            showErrorInput.value = false;
        }
        });

    watch(departmentCode, (newVal) => {
        if (newVal.trim() !== "") {
            isDepartmentCodeOk.value = true;
        }

        // ✅ If both inputs are OK, hide error
        if (isDepartmentNameOk.value && isDepartmentCodeOk.value) {
            showErrorInput.value = false;
        }
    });

    /////////////////////////////// Choose Image Modal ////////////////////////////
    const isVisibleChooseImage = ref(false)

    const imageChooseCancel = async () => {
        departmentImage.value = 0;
        toggleChooseImage();
    }

    const imageChooseConfirm = async () => {
        toggleChooseImage();
    }

    function toggleChooseImage() {
        isVisibleChooseImage.value = !isVisibleChooseImage.value        
    }

    /////////////////////////////// ADD COURSES SECTION ////////////////////////////
    //Fetch Courses 
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
                course_code: crse.course_code,
                department_id: crse.department_id
                });
            });
            }

            console.log(res)
        } catch (err) {
            console.error("Error fetching courses:", err);
        }
    }

    onMounted(fetchCourses);

    async function fetchCoursesOnDepartment(){
        await fetchCourses();
        fetchedCourses.value = coursesDB.value.filter(c => c.department_id === selectedDept.value.id);
        
    }
    
    /////////////////////////////// SEARCH FILTER COURSES ////////////////////////////
    // Filter courses based on user input
    const filteredCourses = computed(() => {
        let results = [];

        if (!addCourses.value) {
            // show all courses if input is blank
            results = coursesDB.value.map(crse => ({
                course_id: crse.course_id,
                course_name: crse.course_name,
                course_code: crse.course_code || '',
                // KASAMA NA ANG department_id
                department_id: crse.department_id
            }))
        } else {
            // filter based on input if user types
            results = coursesDB.value
                .filter(crse =>
                    crse.course_name.toLowerCase().includes(addCourses.value.toLowerCase())
                )
                .map(crse => ({
                    course_id: crse.course_id,
                    course_name: crse.course_name,
                    // KASAMA NA ANG department_id
                    department_id: crse.department_id
                }))
        }

        // --- Sorting Logic ---
        // 1️⃣ Unassigned (null department_id) goes first
        // 2️⃣ Assigned goes below
        // 3️⃣ Both groups sorted alphabetically
        return results.sort((a, b) => {
            const aIsNull = a.department_id == null;
            const bIsNull = b.department_id == null;

            if (aIsNull && !bIsNull) return -1;
            if (!aIsNull && bIsNull) return 1;

            // Secondary alphabetical sort (both same group)
            return a.course_name.localeCompare(b.course_name);
        });
    })

    async function selectCourse(crse) {
        // Find the full course data from the raw database list (coursesDB)
        const courseData = coursesDB.value.find(c => c.course_id === crse.course_id);

        if (!courseData) {
            alert("Error: Course data not found.");
            addCourses.value = '';
            inputFocused.value = false;
            return;
        }

        const currentDeptId = courseData.department_id;
        
        // SIMPLE LOGIC: If the course is assigned to ANY department (not null), block the action.
        if (currentDeptId !== null) {
            
            // Optional: Get the name of the department it's currently assigned to for a better message
            const currentDept = departments.value.find(d => d.id === currentDeptId);
            const deptName = currentDept ? currentDept.name : 'another department';

            alert(`${courseData.course_name} is already assigned to ${deptName}.`);
            
        } else {
            // If department_id is null, proceed with the assignment
            try {
                // Send the request to update the course's department_id
                const res = await fetch(`http://localhost:3000/courses/update-department/${crse.course_id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ department_id: selectedDept.value.id })
                });

                const data = await res.json();

                if (data.success) {
                    // 1. Refresh the main course list from the DB
                    await fetchCourses(); 
                    await fetchDepartments(); 
                    // 2. Refresh the filtered list for the selected department
                    fetchCoursesOnDepartment(); 
                    console.log("Course assigned successfully.");
                } else {
                    alert("Error assigning course: " + data.message);
                }
            } catch (err) {
                console.error("Error during course assignment:", err);
                alert("Failed to assign course to department.");
            }
        }

        // Reset inputs regardless of outcome
        addCourses.value = '';
        inputFocused.value = false;
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
            <div class="card-container-div">
                <div style="display: flex; flex-direction: column; gap: 6px; flex: 1;">
                    <div style="display: flex; align-items: center; padding-left: 12px; padding-right: 12px;">
                        <p class="paragraph--black-bold">Title</p>

                        <div style="display: flex; flex-direction: row; gap: 10px; align-items: center; margin-left: auto; justify-content: center;">
                            <svg @click="deleteDepartment()" width="26" height="28" viewBox="0 0 30 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11.1427 25.6427V11.4999C11.1427 11.313 11.0827 11.1587 10.9627 11.037C10.8427 10.9153 10.6884 10.8553 10.4998 10.857H9.21411C9.02726 10.857 8.87297 10.917 8.75126 11.037C8.62954 11.157 8.56954 11.3113 8.57126 11.4999V25.6427C8.57126 25.8296 8.63126 25.9839 8.75126 26.1056C8.87126 26.2273 9.02554 26.2873 9.21411 26.2856H10.4998C10.6867 26.2856 10.841 26.2256 10.9627 26.1056C11.0844 25.9856 11.1444 25.8313 11.1427 25.6427ZM16.2855 25.6427V11.4999C16.2855 11.313 16.2255 11.1587 16.1055 11.037C15.9855 10.9153 15.8313 10.8553 15.6427 10.857H14.357C14.1701 10.857 14.0158 10.917 13.8941 11.037C13.7724 11.157 13.7124 11.3113 13.7141 11.4999V25.6427C13.7141 25.8296 13.7741 25.9839 13.8941 26.1056C14.0141 26.2273 14.1684 26.2873 14.357 26.2856H15.6427C15.8295 26.2856 15.9838 26.2256 16.1055 26.1056C16.2273 25.9856 16.2873 25.8313 16.2855 25.6427ZM21.4284 25.6427V11.4999C21.4284 11.313 21.3684 11.1587 21.2484 11.037C21.1284 10.9153 20.9741 10.8553 20.7855 10.857H19.4998C19.313 10.857 19.1587 10.917 19.037 11.037C18.9153 11.157 18.8553 11.3113 18.857 11.4999V25.6427C18.857 25.8296 18.917 25.9839 19.037 26.1056C19.157 26.2273 19.3113 26.2873 19.4998 26.2856H20.7855C20.9724 26.2856 21.1267 26.2256 21.2484 26.1056C21.3701 25.9856 21.4301 25.8313 21.4284 25.6427ZM10.4998 5.71415H19.4998L18.5355 3.36386C18.4413 3.24386 18.3273 3.17015 18.1935 3.14272H11.8241C11.6904 3.17015 11.5764 3.24386 11.4821 3.36386L10.4998 5.71415ZM29.1427 6.357V7.64272C29.1427 7.82957 29.0827 7.98386 28.9627 8.10557C28.8427 8.22729 28.6884 8.28729 28.4998 8.28558H26.5713V27.3296C26.5713 28.4404 26.2567 29.4013 25.6275 30.2121C24.9984 31.023 24.2415 31.4284 23.357 31.4284H6.64268C5.75811 31.4284 5.00125 31.0367 4.37211 30.2533C3.74297 29.4699 3.4284 28.5227 3.4284 27.4119V8.28558H1.49983C1.31297 8.28558 1.15868 8.22557 1.03697 8.10557C0.915255 7.98557 0.855255 7.83129 0.856969 7.64272V6.357C0.856969 6.17015 0.916969 6.01586 1.03697 5.89415C1.15697 5.77243 1.31126 5.71243 1.49983 5.71415H7.70725L9.11383 2.35843C9.3144 1.863 9.67611 1.44129 10.199 1.09329C10.7218 0.745289 11.2507 0.571289 11.7855 0.571289H18.2141C18.749 0.571289 19.2778 0.745289 19.8007 1.09329C20.3235 1.44129 20.6853 1.863 20.8858 2.35843L22.2924 5.71415H28.4998C28.6867 5.71415 28.841 5.77415 28.9627 5.89415C29.0844 6.01415 29.1444 6.16843 29.1427 6.357Z" :fill="deleteIconColor"/>
                            </svg>

                            <svg @click="toggleDepartmentModal('update')" class="svg-icon" style="width: 27px;height: 27px; margin-right: 1px; vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M423.381333 85.333333a42.666667 42.666667 0 0 1 4.992 85.034667L423.381333 170.666667H246.186667a75.52 75.52 0 0 0-75.221334 69.290666L170.666667 246.186667v531.712c0 39.594667 30.506667 72.106667 69.290666 75.221333L246.186667 853.333333h531.712a75.52 75.52 0 0 0 75.221333-69.290666L853.333333 777.813333v-177.237333a42.666667 42.666667 0 0 1 85.034667-4.992l0.298667 4.992v177.237333a160.853333 160.853333 0 0 1-152.533334 160.597334L777.813333 938.666667H246.144a160.853333 160.853333 0 0 1-160.597333-152.533334L85.333333 777.813333V246.144a160.853333 160.853333 0 0 1 152.533334-160.597333L246.186667 85.333333h177.237333z" :fill="updateIconColor" /><path d="M716.501333 119.168a133.162667 133.162667 0 0 1 194.133334 182.186667l-5.802667 6.144-362.666667 362.666666a42.666667 42.666667 0 0 1-24.576 12.117334L512 682.666667H384a42.666667 42.666667 0 0 1-42.368-37.674667L341.333333 640v-128a42.666667 42.666667 0 0 1 8.789334-25.941333l3.712-4.266667 362.666666-362.666667z m128 60.330667a47.872 47.872 0 0 0-63.488-3.712l-4.181333 3.712L426.666667 529.664v67.626667h67.626666l350.208-350.122667a47.872 47.872 0 0 0 3.712-63.488l-3.712-4.181333z" :fill="updateIconColor" /><path d="M652.501333 183.168a42.666667 42.666667 0 0 1 56.32-3.541333l4.010667 3.541333 128 128a42.666667 42.666667 0 0 1-56.32 63.872l-4.010667-3.541333-128-128a42.666667 42.666667 0 0 1 0-60.330667z" :fill="updateIconColor" /></svg>

                            <svg @click="toggleDepartmentModal('add')" width="27" height="27" viewBox="0 0 33 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="33" height="32" rx="4" fill="#0785D4"/>
                                <path d="M17.0228 11.1006V20.7433M12.3677 15.9219H21.6779" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                    </div>

                    <div class="card-container">
                        <div 
                            v-for="(dept, index) in departments" 
                            :key="index" 
                            class="card"
                            :class="{ 'active': selectedDept && selectedDept.id === dept.id }"
                            @click="departmentClick(dept)"
                            >
                            <img :src="dept.img" :alt="dept.name" />
                            <div style="display: flex; flex-direction: column;">
                                <div>
                                    <h3> {{ dept.name + " (" + dept.code + ")"}} </h3>
                                </div>
                                
                                <p>{{ dept.courses }} Courses</p>
                                <p>{{ dept.teachers }} Teachers</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 6px; flex: 1; padding-top: 34px;">
                    <div class="card-container"  :class="{ empty: selectedDept === null }">
                        <div style="display: flex; flex-direction: column; height: 100%; padding: 15px; padding-left: 30px; padding-right: 30px; gap: 10px;">
                            <h3 style="margin: 0; line-height: 1;">Add Courses</h3>

                            <div style="position: relative; width: 100%;"  ref="courseWrapper">
                                <input v-model="addCourses" 
                                        @focus="inputFocused = true" 
                                        placeholder="Search here..."></input>

                                <!-- Dropdown suggestions -->
                                <div v-if="inputFocused && filteredCourses.length" 
                                    class="dropdown"> 

                                    <div v-for="(crse, index) in filteredCourses" 
                                        :key="crse.course_id"
                                        @click="selectCourse(crse)"
                                        class="dropdown-item"
                                        :class="{ 'assigned-course': crse.department_id !== null }">
                                        {{ crse.course_name }}
                                    </div>
                                </div>
                            </div>
                            
                            <div style="height: 100%; padding: 25px; margin-top: 4px; border: 1px solid rgba(0, 0, 0, 0.2); 
                                        box-shadow: 0 0px 4px rgba(0, 0, 0, 0.2); border-radius: 10px; box-sizing: border-box;">
                                        
                                <h3 style="margin: 0; line-height: 1; margin-bottom: 12px;">Courses</h3>
                                
                                <!-- show a placeholder when empty -->
                                <div v-if="fetchedCourses.length === 0">
                                    <p class="paragraph--gray">No courses yet.</p>
                                </div>

                                <div v-for="(crse, index) in fetchedCourses" :key="crse"
                                    style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap;">
                                    
                                    <label style="flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                        {{ crse.course_name }}
                                    </label>

                                    <span @click="toggleDeleteModal('course', index, crse.course_name)"
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
        </main>

        <!-- Add Department Modal -->
        <transition name="fade">
            <div v-show="isVisibleDepartmentModal" class="modal" @click.self="toggleDepartmentModal('cancel')">
               <div class="modal-content-department">
                    <h2 style="color: var(--color-primary); line-height: 0; margin: 12px;">{{ departmentTitle }}</h2>

                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; margin-top: 10px;">
                        <img :src="images[departmentImage]" style="width: 120px; height: 120px; object-fit: contain;"/>
                        <p @click="toggleChooseImage" style="color: var(--color-primary); font-weight: 600; cursor: pointer; user-select: none;">Edit</p>
                    </div>

                    <div style="display: flex; flex-direction: column; width: 100%; gap: 14px;">
                        <!-- Department Name -->
                        <div>
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Department Name</p>
                            <input v-model="departmentName"
                            :class="{ 'error-input-border': showErrorInput && !isDepartmentNameOk }"></input>
                        </div>

                        <div>
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Department Code</p>
                            <input v-model="departmentCode" style="display: flex; flex-direction: column; width: 120px;"
                            :class="{ 'error-input-border': showErrorInput && !isDepartmentCodeOk }"></input>
                        </div>
                        
                        <label v-show="showErrorInput" style="color: red; font-size: 0.95rem; margin-right: auto;">{{ errorMessage }}</label>
                    </div>

                    <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto;">
                        <button @click="toggleDepartmentModal('cancel')" class="cancelBtn">Cancel</button>
                        <button @click="departmentConfirm()">{{ departmentButton }}</button>
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
                    :class="{ 'selected': departmentImage === parseInt(index) }"
                    @click="departmentImage = parseInt(index)"
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

        <!-- Delete Department Modal -->
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

    .modal-content-department {
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