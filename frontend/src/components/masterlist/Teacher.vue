<script setup>
    import { useRouter } from 'vue-router'
    import { ref, watch, computed, onMounted, onBeforeUnmount } from "vue"
    import axios from "axios";

    const router = useRouter()

    // USER DATA INPUT
    const firstName = ref('')
    const lastName = ref('')
    const gender = ref('')
    const department = ref('')
    const subject = ref('')

    const isVisibleDeleteModal = ref(false)

    //////////////////////// DEPARTMENT /////////////////////////
    // List of departments from DB (RAW)
    const departmentsDB = ref([])

    // Currently selected department(s)
    const selectedDepartments = ref([])

    // Filter departments based on user input
    const filteredDepartments = computed(() => {
        if (!department.value) {
            // show all departments if input is blank
            return departmentsDB.value.map(dep => ({
                department_id: dep.department_id,
                department_name: dep.department_name
            }))
        }

        // filter based on input if user types
        return departmentsDB.value
            .filter(dep =>
                dep.department_name.toLowerCase().includes(department.value.toLowerCase())
            )
            .map(dep => ({
                department_id: dep.department_id,
                department_name: dep.department_name
            }))
    })

    // Add selected department to list
    function selectDepartment(dep) {
        // Check if department already exists
        const deptExists = selectedDepartments.value.some(d => d.department_name === dep.department_name);

        if (!deptExists) {
            selectedDepartments.value.push(dep);
        }  else {
            alert("This department is already selected!");
        }

        department.value = '';
        departmentInputFocused.value = false
    }
    

    // fetch departments on DB
    const fetchDepartments = async () => {
        try {
            const res = await axios.get("http://localhost:3000/departments");

            if (res.data && Array.isArray(res.data)) {

            // Clear first para walang duplicate
            departmentsDB.value.length = 0;

            // Push each item
            res.data.forEach(dep => {
                departmentsDB.value.push({
                department_id: dep.department_id,
                department_name: dep.department_name,
                department_code: dep.department_code
                });
            });
            }

        } catch (err) {
            console.error("Error fetching departments:", err);
        }
    }
    onMounted(fetchDepartments)

    //////////////////////// SUBJECTS /////////////////////////
    // List of subjects from DB (RAW)
    const subjectsDB = ref([])

    // Currently selected subject(s)
    const selectedSubjects = ref([])

    // Filter subjects based on user input
    const filteredSubjects = computed(() => {
        if (!subject.value) {
            // show all subjects if input is blank
            return subjectsDB.value.map(sub => ({
                subject_id: sub.subject_id,
                subject_name: sub.subject_name
            }))
        }

        // filter based on input if user types
        return subjectsDB.value
            .filter(sub =>
                sub.subject_name.toLowerCase().includes(subject.value.toLowerCase())
            )
            .map(sub => ({
                subject_id: sub.subject_id,
                subject_name: sub.subject_name
            }))
    })

    // Add selected subject to list
    function selectSubject(sub) {
        // Check if subject already exists
        const subjExists = selectedSubjects.value.some(s => s.subject_name === sub.subject_name);

        if (!subjExists) {
            selectedSubjects.value.push(sub);
        } else {
            alert("This subject is already selected!");
        }

        subject.value = '';
        subjectInputFocused.value = false
    }

    
    // fetch subjects on DB
    const fetchSubjects = async () => {
        try {
            const res = await axios.get("http://localhost:3000/subjects");

            if (res.data && Array.isArray(res.data)) {

            // Clear first para walang duplicate
            subjectsDB.value.length = 0;

            // Push each item
            res.data.forEach(dep => {
                subjectsDB.value.push({
                subject_id: dep.subject_id,
                subject_name: dep.subject_name,
                subject_code: dep.subject_code
                });
            });
            }

        } catch (err) {
            console.error("Error fetching subjects:", err);
        }
    }
    onMounted(fetchSubjects)

    //////////////////////// Availability /////////////////////////
    const days = ref([
        { name: "Monday", checked: false, from: "", to: "", full: false, mLeft: '32px' },
        { name: "Tuesday", checked: false, from: "", to: "", full: false, mLeft: '32px' },
        { name: "Wednesday", checked: false, from: "", to: "", full: false, mLeft: '8px' },
        { name: "Thursday", checked: false, from: "", to: "", full: false, mLeft: '26px' },
        { name: "Friday", checked: false, from: "", to: "", full: false, mLeft: '47px' },
        { name: "Saturday", checked: false, from: "", to: "", full: false, mLeft: '28px' }
    ]);

    // Default times
    const defaultFrom = '07:00'
    const defaultTo = '17:00'

    // ✅ Watchers per day
    days.value.forEach(day => {
        let isSyncing = false

        // Watch full checkbox
        watch(
            () => day.full,
            (newVal) => {
                if (isSyncing) return
                isSyncing = true

                if (newVal) {
                    // ✅ Checked full day → apply defaults
                    day.from = defaultFrom
                    day.to = defaultTo
                } else {
                    // ✅ Unchecked full day → only clear if still default times
                    if (day.from === defaultFrom && day.to === defaultTo) {
                        day.from = ''
                        day.to = ''
                    }
                }

                isSyncing = false
            }
        )

        // Watch from/to values to auto-check full day
        watch(
            [() => day.from, () => day.to],
            ([newFrom, newTo]) => {
                if (isSyncing) return
                isSyncing = true

                day.full = (newFrom === defaultFrom && newTo === defaultTo)

                isSyncing = false
            }
        )
    })
    //////////////////////// Navigation Function /////////////////////////
    function backBtn() {
        router.push(`/main/masterlist`)
    }

    /////////////////////////////// Table ////////////////////////////
    const searchQuery = ref("")
    const sortValue = ref("recent")

    const teachersDB = ref([])

    const filteredTeachers = computed(() => {
    let result = [...teachersDB.value]

    // 🔎 Search across all fields
    if (searchQuery.value) {
        result = result.filter(item =>
        Object.values(item).some(val =>
            String(val).toLowerCase().includes(searchQuery.value.toLowerCase())
        )
        )
    }

    // ↕️ Sort options
    switch (sortValue.value) {
        case "recent":
        result.sort((a, b) => b.teacher_id - a.teacher_id) // higher ID = more recent
        break

        case "name-az":
            result.sort((a, b) => {
                const lastWordA = a.last_name.trim().split(' ').slice(-1)[0].toLowerCase()
                const lastWordB = b.last_name.trim().split(' ').slice(-1)[0].toLowerCase()
                const cmp = lastWordA.localeCompare(lastWordB)
                if (cmp !== 0) return cmp
                return a.first_name.toLowerCase().localeCompare(b.first_name.toLowerCase())
            })
            break

        case "name-za":
            result.sort((a, b) => {
                const lastWordA = a.last_name.trim().split(' ').slice(-1)[0].toLowerCase()
                const lastWordB = b.last_name.trim().split(' ').slice(-1)[0].toLowerCase()
                const cmp = lastWordB.localeCompare(lastWordA)
                if (cmp !== 0) return cmp
                return b.first_name.toLowerCase().localeCompare(a.first_name.toLowerCase())
            })
            break

        case "dept-asc":
        result.sort((a, b) => {
            const countA = a.departments ? a.departments.split(",").length : 0
            const countB = b.departments ? b.departments.split(",").length : 0
            return countA - countB
        })
        break

        case "dept-desc":
        result.sort((a, b) => {
            const countA = a.departments ? a.departments.split(",").length : 0
            const countB = b.departments ? b.departments.split(",").length : 0
            return countB - countA
        })
        break

        case "subj-asc":
            result.sort((a, b) => {
                const countA = a.subjects ? a.subjects.split(",").length : 0
                const countB = b.subjects ? b.subjects.split(",").length : 0
                return countA - countB
            })
            break

        case "subj-desc":
            result.sort((a, b) => {
                const countA = a.subjects ? a.subjects.split(",").length : 0
                const countB = b.subjects ? b.subjects.split(",").length : 0
                return countB - countA
            })
            break

        case "avail-asc":
        result.sort((a, b) => {
            const countA = a.availability ? a.availability.split(",").length : 0
            const countB = b.availability ? b.availability.split(",").length : 0
            return countA - countB
        })
        break

        case "avail-desc":
        result.sort((a, b) => {
            const countA = a.availability ? a.availability.split(",").length : 0
            const countB = b.availability ? b.availability.split(",").length : 0
            return countB - countA
        })
        break
    }

    return result
    })


    /////////////////////////////// TEACHER MODAL ////////////////////////////
    // For FUNCTION
    const teacherHandler = ref()
    const selectedTeacher = ref(null)

    // For UI
    const showErrorInput = ref(false)
    const teacherTitle = ref()
    const teacherButton = ref()
    const isVisibleTeacherModal = ref(false)
    const departmentInputFocused = ref(false)
    const subjectInputFocused = ref(false)
    const departmentWrapper = ref(null)
    const subjectWrapper = ref(null)
    
    const setSelectedTeacher = (teacher) => {
        selectedTeacher.value = { ...teacher }
    }

    const teacherConfirm = async () => {
        if(firstName.value !== '' &&
            lastName.value !== '' &&
            gender.value !== '' &&
            selectedDepartments.value.length !== 0 &&
            selectedSubjects.value.length !== 0 &&
            days.value.some(day => day.checked && day.from && day.to)){
            if(teacherHandler.value === 'add'){
                showErrorInput.value = false
                try {
                    // Add to Teachers Table
                    const resTeacher = await axios.post("http://localhost:3000/add-teacher", {
                        first_name: firstName.value.trim().charAt(0).toUpperCase() + firstName.value.trim().slice(1).toLowerCase(),
                        last_name: lastName.value.trim().charAt(0).toUpperCase() + lastName.value.trim().slice(1).toLowerCase(),
                        gender: gender.value
                    });
                    console.log(resTeacher.data.message);

                    const teacherId = resTeacher.data.teacher_id;

                    // Add to TeacherDepartments Table
                    const selectedDepartmentIds = selectedDepartments.value.map(dep => dep.department_id);
                    const resDept = await axios.post("http://localhost:3000/add-teacher-department", {
                        teacher_id: teacherId,
                        department_id: selectedDepartmentIds
                    });
                    console.log(resDept.data.message);

                    // Add to TeacherSubjects Table
                    const selectedSubjectIds = selectedSubjects.value.map(dep => dep.subject_id);
                    const resSubj = await axios.post("http://localhost:3000/add-teacher-subject", {
                        teacher_id: teacherId,
                        subject_id: selectedSubjectIds
                    });
                    console.log(resSubj.data.message);

                    // Add to TeacherAvailability Table
                    const payload = {
                    teacherId: teacherId,
                    days: days.value
                        .filter(day => day.checked) // only send checked days
                        .map(({ name, from, to }) => ({ name, from, to })) // ignore mLeft and full
                    };

                    const resAvail = await axios.post("http://localhost:3000/add-teacher-availability", payload);
                    console.log(resAvail.data.message);

                    fetchTeachers();
                    
                } catch (error) {
                    console.error("Error:", error);
                    console.log("Failed to add teacher.");
                }
                isVisibleTeacherModal.value = !isVisibleTeacherModal.value;
                resetInputs();
            }

            else if(teacherHandler.value === 'update'){
                try {
                    const res = await axios.put(`http://localhost:3000/update-teacher/${selectedTeacher.value.teacher_id}`, {
                        first_name: firstName.value.trim().charAt(0).toUpperCase() + firstName.value.trim().slice(1).toLowerCase(),
                        last_name: lastName.value.trim().charAt(0).toUpperCase() + lastName.value.trim().slice(1).toLowerCase(),
                        gender: gender.value
                    });

                    const teacherId = selectedTeacher.value.teacher_id;

                    // Delete all existing departments for this teacher, then insert the new ones
                    // --- Update TeacherDepartments ---
                    await axios.delete(`http://localhost:3000/delete-teacher-departments/${teacherId}`);
                    const selectedDepartmentIds = selectedDepartments.value.map(dep => dep.department_id);
                    if (selectedDepartmentIds.length > 0) {
                        await axios.post("http://localhost:3000/add-teacher-department", {
                            teacher_id: teacherId,
                            department_id: selectedDepartmentIds
                        });
                    }

                    // --- Update TeacherSubjects ---
                    await axios.delete(`http://localhost:3000/delete-teacher-subjects/${teacherId}`);
                    const selectedSubjectIds = selectedSubjects.value.map(dep => dep.subject_id);
                    if (selectedSubjectIds.length > 0) {
                        await axios.post("http://localhost:3000/add-teacher-subject", {
                            teacher_id: teacherId,
                            subject_id: selectedSubjectIds
                        });
                    }

                    // --- Update TeacherSubjects ---
                    await axios.delete(`http://localhost:3000/delete-teacher-availability/${teacherId}`);
                    const payload = {
                    teacherId: teacherId,
                    days: days.value
                        .filter(day => day.checked) // only send checked days
                        .map(({ name, from, to }) => ({ name, from, to })) // ignore mLeft and full
                    };

                    const resAvail = await axios.post("http://localhost:3000/add-teacher-availability", payload);
                    console.log(resAvail.data.message);
                
                fetchTeachers();
                selectedTeacher.value = null;
                toggleTeacherModal();

                // Reset Inputs
                resetInputs()
                } catch (error) {
                    console.error("Error:", error);
                    alert("Failed to update teacher.");
                }
            }
        }
        else {
            showErrorInput.value = false
            setTimeout(() => { showErrorInput.value = true; }, 0);
        }

    };

    const toggleTeacherModal = async (which) => {
        isVisibleTeacherModal.value = !isVisibleTeacherModal.value

        if(which === 'add'){
            teacherTitle.value = 'Teacher Information'
            teacherButton.value = 'Confirm'
            teacherHandler.value = 'add'
        }

        else if(which === 'update'){
            teacherTitle.value = 'Update Information'
            teacherButton.value = 'Update'
            teacherHandler.value = 'update'
            firstName.value = selectedTeacher.value.first_name
            lastName.value = selectedTeacher.value.last_name
            gender.value = selectedTeacher.value.gender

            try {
                // Fetch departments
                const { data: deptData } = await axios.get(`http://localhost:3000/teacher-departments/${selectedTeacher.value.teacher_id}`);
                if (deptData.success) {
                    selectedDepartments.value = deptData.departments;
                }

                // Fetch subjects
                const { data: subjData } = await axios.get(`http://localhost:3000/teacher-subjects/${selectedTeacher.value.teacher_id}`);
                if (subjData.success) {
                    selectedSubjects.value = subjData.subjects;
                }

                // Fetch availability
                try {
                    const { data: availData } = await axios.get(
                        `http://localhost:3000/teacher-availability/${selectedTeacher.value.teacher_id}`
                );

                if (availData.success) {
                    // Map the fetched availability into days array
                    availData.availability.forEach(avail => {
                    const day = days.value.find(d => d.name === avail.day_of_week);
                    if (day) {
                        day.checked = true;
                        day.from = avail.time_from || "";
                        day.to = avail.time_to || "";
                    }
                    });

                    console.log("Mapped days:", days.value);
                }
                } catch (error) {
                    console.error("Error fetching availability:", error);
                }



            } catch (err) {
                console.error(err);
            }
        }
        
        else if('cancel'){
            resetInputs();
            showErrorInput.value = false
        }
    }

    function removeDepartment(index) {
        const deptToRemove = selectedDepartments.value[index]
        selectedDepartments.value = selectedDepartments.value.filter(dep => dep !== deptToRemove)
    }

    function removeSubject(index) {
        const subjToRemove = selectedSubjects.value[index]
        selectedSubjects.value = selectedSubjects.value.filter(subj => subj !== subjToRemove)
    }

    // Close dropdown when clicked outside
    function handleClickOutside(event) {
        // Department
        if (departmentWrapper.value && !departmentWrapper.value.contains(event.target)) {
            departmentInputFocused.value = false
        }

        // Subject
        if (subjectWrapper.value && !subjectWrapper.value.contains(event.target)) {
            subjectInputFocused.value = false
        }
    }

    onMounted(() => {
        document.addEventListener('mousedown', handleClickOutside)
    })

    onBeforeUnmount(() => {
        document.removeEventListener('mousedown', handleClickOutside)
    })

    /////////////////////////////// FETCH TEACHERS ////////////////////////////
    const fetchTeachers = async () => {
    try {
        const res = await axios.get("http://localhost:3000/teachers")

        teachersDB.value = res.data.map(teacher => ({
            teacher_id: teacher.teacher_id,
            first_name: teacher.first_name,
            last_name: teacher.last_name,
            gender: teacher.gender,
            departments: teacher.departments,
            subjects: teacher.subjects,
            availability: teacher.availability
        }));

        console.log(teachersDB.value)

    } catch (err) {
        console.error("Error fetching teachers:", err)
    }
    }

    onMounted(fetchTeachers);

    /////////////////////////////// DELETE TEACHER ////////////////////////////
    const teacherIdtoDelete = ref('')
    const teacherNameToDelete = ref('')
    const deleteTeacher = async (item) => {
        teacherNameToDelete.value = item.last_name + ', ' + item.first_name
        teacherIdtoDelete.value = item.teacher_id
        toggleDeleteModal()
    }

    function toggleDeleteModal() {
        isVisibleDeleteModal.value = !isVisibleDeleteModal.value
    }

    async function confirmDelete() {
        try {
            
            await axios.delete(`http://localhost:3000/teachers/${teacherIdtoDelete.value}`)
            teachersDB.value = teachersDB.value.filter(t => t.teacher_id !== teacherIdtoDelete.value)
            fetchTeachers()
        } catch (err) {
            console.error("Error deleting teacher:", err)
            alert("Failed to delete teacher.")
        }
        toggleDeleteModal()
    }

    ///////////////////////////// RESET INPUT ////////////////////////////
    function resetInputs(){
        setTimeout(() => {
            firstName.value = ''
            lastName.value = ''
            gender.value = ''
            department.value = ''
            selectedDepartments.value.splice(0, selectedDepartments.value.length)
            subject.value = ''
            selectedSubjects.value.splice(0, selectedSubjects.value.length)

            // Reset the existing day objects
            days.value.forEach(day => {
                day.checked = false
                day.from = ""
                day.to = ""
                day.full = false
            });
        }, 100);
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
                <h1>Teachers</h1>
                <p class=".paragraph--gray">Assign classes and manage teacher details.</p>
            </div>
        </header>

        <main>
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
                        v-model="searchQuery"
                        style="width: 380px; padding-left: 45px;"
                        placeholder="Search"
                    />
                </div>

                <!-- Sort -->
                <select v-model="sortValue" style="padding: 6px; padding-left: 15px;">
                <option value="recent">Most Recent</option>
                <option value="name-az">Last Name (A-Z)</option>
                <option value="name-za">Last Name (Z-A)</option>
                <option value="dept-asc">Departments (Fewest)</option>
                <option value="dept-desc">Departments (More)</option>
                <option value="subj-asc">Subjects (Fewest)</option>
                <option value="subj-desc">Subjects (More)</option>
                <option value="avail-asc">Availability (Fewest)</option>
                <option value="avail-desc">Availability (More)</option>
                </select>

                <button @click="toggleTeacherModal('add')"  style="margin-left: auto; width: 200px;">+ Add Teacher</button>
            </div>

                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Departments</th>
                            <th>Subjects</th>
                            <th>Availability</th>
                            <th style="width: 130px">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Check if there are any teachers -->
                        <tr v-if="filteredTeachers.length === 0" style="">
                            <td colspan="6" style="height: 40px; color: #444141; text-align: center;">--- No Teachers ---</td>
                        </tr>

                         <!-- Render teacher rows if available -->
                        <tr v-for="item in filteredTeachers" :key="item.id">
                        <td :title="item.first_name + ', ' + item.last_name">{{ item.last_name + ', ' + item.first_name }}</td>
                        <td :title="item.departments.replaceAll(/,\s*/g, '\n')">{{ item.departments }}</td>
                        <td :title="item.subjects.replaceAll(/,\s*/g, '\n')">{{ item.subjects }}</td>
                        <td :title="item.availability.replaceAll(/,\s*/g, '\n')">{{ item.availability }}</td>
                        <td>
                            <div style="display: flex; flex-direction: row; gap: 5px; align-items: center; width: 130px;">
                                <button @click="deleteTeacher(item)" class="outlineBtn" style="font-size: 1.2rem; padding: 3px 6px;">
                                    <i class='bx bx-trash'></i>
                                </button>
                                <button @click="setSelectedTeacher(item); toggleTeacherModal('update')" style="font-size: 1.2rem; padding: 4px 12px;">
                                    <i class='bx bx-edit-alt'></i>
                                </button>
                            </div>
                        </td>
                        </tr>
                    </tbody>
                </table>
        </main>

        <!-- Add Teacher Modal -->
        <transition name="fade">
            <div v-show="isVisibleTeacherModal" class="modal" @click.self="toggleTeacherModal('cancel')">
               <div class="modal-content">
                    <h2 style="color: var(--color-primary); line-height: 0;">{{ teacherTitle }}</h2>

                    <div style="display: flex; flex-direction: row; width: 100%; gap: 60px;">

                        <!-- Left section -->
                        <div style="display: flex; flex-direction: column; gap: 14px; flex: 1">

                            <div style="display: flex; flex-direction: column; gap: 15px;">
                                <p class="paragraph--black-bold" style="line-height: 1.8;">First Name</p>
                                <input v-model="firstName" :class="{ 'error-input-border': showErrorInput && firstName.trim() === '' }"></input>
                            </div>

                            <div style="display: grid; grid-template-columns: auto 140px; grid-template-rows: auto auto; column-gap: 15px; ">
                                
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Last Name</p>
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Gender</p>
                                <input v-model="lastName" :class="{ 'error-input-border': showErrorInput && lastName.trim() === '' }"></input>
                                <select v-model="gender" style="width: 100%;">
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                            </div>

                            <!-- Departments -->
                             <div style="position: relative; width: 100%;" ref="departmentWrapper">
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Department</p>
                                <input v-model="department"  
                                        @focus="departmentInputFocused = true"></input>

                                <!-- Dropdown suggestions -->
                                <div v-if="departmentInputFocused && filteredDepartments.length" 
                                    class="dropdown" style="z-index: 1;"> 

                                    <div v-for="(dep, index) in filteredDepartments" 
                                        :key="dep.department_id"
                                        @click="selectDepartment(dep)"
                                        class="dropdown-item">
                                        {{ dep.department_name }}
                                    </div>
                                </div>
                                <!-- Selected Departments -->
                                <div class="selected-dept-subj" 
                                    :class="{ 'error-input-border': showErrorInput && selectedDepartments.length === 0 }">

                                    <!-- show a placeholder when empty -->
                                    <div v-if="selectedDepartments.length === 0">
                                        <p class="paragraph--gray">No departments selected</p>
                                    </div>

                                    <div v-for="(dept, index) in selectedDepartments" :key="dept"
                                        style="display: flex; justify-content: space-between; align-items: center;">
                                        <label> {{ dept.department_name }} </label>
                                        
                                        <span @click="removeDepartment(index)"
                                                style="display: flex; align-items: center; justify-content: center;
                                                    height: 30px; width: 30px; color: red; font-weight: bold; 
                                                    cursor: pointer;">
                                            ✕
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <!-- Subjects -->
                             <div style="position: relative; width: 100%;" ref="subjectWrapper">
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Subjects</p>
                                <input v-model="subject" 
                                        @focus="subjectInputFocused = true"></input>

                                <!-- Dropdown suggestions -->
                                <div v-if="subjectInputFocused && filteredSubjects.length" 
                                    class="dropdown"> 

                                    <div v-for="(dep, index) in filteredSubjects" 
                                        :key="dep.subject_id"
                                        @click="selectSubject(dep)"
                                        class="dropdown-item">
                                        {{ dep.subject_name }}
                                    </div>
                                </div>

                                <!-- Selected Subjects -->
                                <div class="selected-dept-subj" 
                                    :class="{ 'error-input-border': showErrorInput && selectedSubjects.length === 0 }">

                                    <!-- show a placeholder when empty -->
                                    <div v-if="selectedSubjects.length === 0">
                                        <p class="paragraph--gray">No subjects selected</p>
                                    </div>

                                    <div v-for="(dept, index) in selectedSubjects" :key="dept" 
                                        style="display: flex; justify-content: space-between; align-items: center;">
                                        <label>{{ dept.subject_name }}</label>

                                        <span @click="removeSubject(index)"
                                                style="display: flex; align-items: center; justify-content: center;
                                                    height: 30px; width: 30px; color: red; font-weight: bold; 
                                                    cursor: pointer;">
                                            ✕
                                        </span>
                                    </div>
                                    
                                </div>

                            </div>
                            
                        </div>

                        <!-- Right section -->
                        <div style="display: flex; flex-direction: column; width: auto; min-width: 460px;" :style="{gap: (days.find(day => day.name === 'Monday')?.checked ? '0px' : '8px') }">
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Availability</p>

                            <div style="display: flex; flex-direction: column;" :style="{gap: days.some(day => day.checked) ? '12px' : '0px' }">
                                <div v-for="(day, index) in days" 
                                    :key="index" 
                                    style="display: flex; flex-direction: row; align-items: end; gap: 8px; ">

                                    <!-- Checkbox + Day Name -->
                                    <div style="display: flex; flex-direction: row; align-items: center; gap: 8px; margin-bottom: 13px;">
                                        <input type="checkbox" v-model="day.checked"></input>
                                        <p class="paragraph--gray">{{ day.name}}</p>
                                    </div>

                                    <!-- Availability Time -->
                                    <div v-show="day.checked" 
                                        :style="{ display: 'flex', flexDirection: 'row', gap: '6px', alignItems: 'center', marginLeft: day.mLeft }">
                                        <div>
                                            <p class="paragraph--gray">From</p>
                                            <input type="time" v-model="day.from" min="09:00" max="18:00" step="900" placeholder="From"
                                                    :class="{ 'error-input-border': showErrorInput && day.checked && day.from === '' }"></input>
                                        </div>
                                        <p class="paragraph--gray" style="margin-top: 26px;">-</p>
                                        <div>
                                            <p class="paragraph--gray">To</p>
                                            <input type="time" v-model="day.to" min="09:00" max="18:00" step="900" placeholder="To"></input>
                                        </div>

                                        <div style="display: flex; flex-direction: row; gap: 6px; margin-top: 20px; align-items: center;">
                                            <input type="checkbox" v-model="day.full"></input>
                                            <p class="paragraph--black-bold">Full day</p>
                                        </div>
                                        
                                    </div>
                                </div>
                            </div>

                            <!-- no input message -->
                            <div v-if="showErrorInput && days.every(day => !day.checked)"
                                style="display: flex; flex-direction: row; width: fit-content; background-color: #ffe6e6; border: 1px solid red; border-radius: 8px; padding: 9px; gap: 6px; animation: scalePulse 0.3s ease;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clip-path="url(#clip0_408_455)">
                                    <path d="M23.7299 20.0474C24.499 21.3597 23.5336 23 21.9975 23H2.00228C0.463236 23 -0.497681 21.3571 0.269902 20.0474L10.2677 2.98376C11.0371 1.67089 12.9643 1.67327 13.7324 2.98376L23.7299 20.0474ZM12 16.5195C10.9415 16.5195 10.0834 17.3642 10.0834 18.4062C10.0834 19.4483 10.9415 20.293 12 20.293C13.0586 20.293 13.9167 19.4483 13.9167 18.4062C13.9167 17.3642 13.0586 16.5195 12 16.5195ZM10.1803 9.73776L10.4894 15.3159C10.5039 15.5769 10.7231 15.7812 10.9887 15.7812H13.0114C13.2769 15.7812 13.4962 15.5769 13.5107 15.3159L13.8197 9.73776C13.8354 9.45582 13.6073 9.21875 13.3205 9.21875H10.6795C10.3927 9.21875 10.1647 9.45582 10.1803 9.73776Z" fill="red"/>
                                    </g>
                                    <defs>
                                    <clipPath id="clip0_408_455">
                                    <rect width="24" height="21" fill="white" transform="translate(0 2)"/>
                                    </clipPath>
                                    </defs>
                                </svg>
                                <p style="color: red;">Please select at least one day.</p>
                            </div>
                            
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto;">
                        <button @click="toggleTeacherModal('cancel')" class="cancelBtn">Cancel</button>
                        <button @click="teacherConfirm">{{ teacherButton }}</button>
                    </div>
               </div>
            </div>
        </transition>
        
        <!-- Delete Teacher Modal -->
        <transition name="fade">
            <div v-show="isVisibleDeleteModal" class="modal" @click.self="toggleDeleteModal"> 
                <div class="delete-modal-content">
                    <div style="display: flex; flex-direction: column; width: 100%; gap: 24px;">
                        <div style="display: flex; flex-direction: row; gap: 10px; align-items: center; justify-content: start;">
                            <svg class="svg-icon" style="width: 2.5em; height: 2.5em; vertical-align: middle;fill: #b84343;overflow: hidden;" viewBox="188 129 648 784" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M779.3 228.2h-113v-35.4c0-34.9-28.4-63.3-63.3-63.3H425c-34.9 0-63.3 28.4-63.3 63.3v35.4h-113c-32.9 0-59.7 26.8-59.7 59.7v38.5c0 32.9 26.8 59.7 59.7 59.7h1.8v412.8c0 54.1 44 98.1 98.1 98.1h330.9c54.1 0 98.1-44 98.1-98.1V386.1h1.8c32.9 0 59.7-26.8 59.7-59.7v-38.5c-0.1-32.9-26.8-59.7-59.8-59.7z m-374.9-35.4c0-11.4 9.2-20.6 20.6-20.6h178c11.4 0 20.6 9.2 20.6 20.6v35.4H404.4v-35.4z m330.4 606c0 30.5-24.8 55.4-55.4 55.4H348.5c-30.5 0-55.4-24.8-55.4-55.4V386.1h441.7v412.7z m61.5-472.4c0 9.4-7.6 17-17 17H248.7c-9.4 0-17-7.6-17-17v-38.5c0-9.4 7.6-17 17-17h530.7c9.4 0 17 7.6 17 17v38.5z"  /><path d="M377.9 462.3h42.7v317.5h-42.7zM492.6 462.3h42.7v317.5h-42.7zM607.4 462.3h42.7v317.5h-42.7z"  /></svg>
                            <h3 style="line-height: 0; font-size: x-large; margin: 10px 0px;">Delete Confirmation</h3>
                        </div>
                        
                        <p>Are you sure you want to delete <strong>{{ teacherNameToDelete }}</strong> account?</p>

                        <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto; margin-top: 12px;">
                            <button @click="toggleDeleteModal" class="cancelBtn">Cancel</button>
                            <button @click="confirmDelete()"  class="delete-btn">Delete</button>
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
        gap: 0px;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px auto;
        background-color: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 0 5px rgba(0,0,0,0.2);
    }
    th, td {
        padding: 10px;
        padding-left: 50px;
        text-align: left;
    }
    th {
        border-bottom: 1px solid #333;
        background-color: var(--color-primary);
        color: white;
    }
    td {
        border-bottom: 1px solid #333; 
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: pointer;
    }

    

    tr td:nth-child(1) { min-width: 80px; max-width: 100px;}
    tr td:nth-child(2) { max-width: 150px; }
    tr td:nth-child(3) { max-width: 120px; }
    tr td:nth-child(4) { max-width: 120px; }
    tr td:nth-child(5) { max-width: 120px; }

    .modal-content {
        display: flex;
        flex-direction: column;
        background-color: white;
        height: auto;
        align-items: center;
        width: clamp(980px, 55vw, 55vw);
        padding-top: 30px;
        padding-bottom: 30px;
        padding-left: 50px;
        padding-right: 50px;
        box-shadow: -2px 0 8px rgba(0,0,0,0.2);
        border-radius: 6px;
        gap: 25px;
    }

    .selected-dept-subj {
        display: flex; 
        flex-direction: column; 
        background-color: var(--color-main-background);
        width: 100%; 
        height: 120px; 
        overflow-y: auto; 
        min-height: 80px; 
        border-radius: 6px; 
        margin-top: 6px; 
        border: 1px solid var(--color-border);
        padding-left: 16px; 
        padding-right: 16px; 
        padding-top: 8px; 
        padding-bottom: 8px; 
        box-sizing: border-box;
    }

</style>