<script setup>
    import { useRouter } from 'vue-router'
    import { ref, watch, computed, onMounted } from "vue"
    import axios from "axios";

    const router = useRouter()

    // DATA
    const facultyId = ref()
    const firstName = ref()
    const lastName = ref()
    const department = ref()
    const departments = ref([])
    const subjects = ref()

    const isVisibleTeacherModal = ref(false)

    // Database Departments list
    const departmentsDB = ref([])

    // Database Subjects list
    const subjectsDB = ref([])

    //////////////////////// Department Suggestor /////////////////////////
    // Filtered list
    const filteredDepartments = computed(() => {
    if (!department.value) return []
    return departmentsDB.value
    .map(dep => dep.department_name) // extract the names
    .filter(name =>
      name.toLowerCase().includes(department.value.toLowerCase())
    )
    })

    // Select department
    function selectDepartment(dep) {
    departments.value.push(dep)
    department.value = ''
    }

    //////////////////////// Availability /////////////////////////
    const mondayChecked = ref(false)
    const tuesdayChecked = ref(false)
    const wednesdayChecked = ref(false)
    const thursdayChecked = ref(false)
    const fridayChecked = ref(false)
    const saturdayChecked = ref(false)

    // Monday
    const mondayFullDay = ref(false)
    const mondayfromTime = ref('')
    const mondaytoTime = ref('')

    // Tuesday
    const tuesdayFullDay = ref(false)
    const tuesdayfromTime = ref('')
    const tuesdaytoTime = ref('')

    // Wednesday
    const wednesdayFullDay = ref(false)
    const wednesdayfromTime = ref('')
    const wednesdaytoTime = ref('')

    // Thursday
    const thursdayFullDay = ref(false)
    const thursdayfromTime = ref('')
    const thursdaytoTime = ref('')

    // Friday
    const fridayFullDay = ref(false)
    const fridayfromTime = ref('')
    const fridaytoTime = ref('')

    // Saturday
    const saturdayFullDay = ref(false)
    const saturdayfromTime = ref('')
    const saturdaytoTime = ref('')

    // Default times
    const defaultFrom = '07:00'
    const defaultTo = '17:00'

    //////////////////////// Navigation Function /////////////////////////
    function backBtn() {
        router.push(`/main/masterlist`)
    }

    /////////////////////////////// Table ////////////////////////////
    const searchQuery = ref("")
    const sortValue = ref("")

    const items = ref([])

    // Final list = search + sort
    const filteredItems = computed(() => {
    let result = [...items.value]

    // 🔎 Search across all fields
    if (searchQuery.value) {
        result = result.filter(item =>
        Object.values(item).some(val =>
            String(val).toLowerCase().includes(searchQuery.value.toLowerCase())
        )
        )
    }

    // ↕️ Sort options
    if (sortValue.value === "name-asc") {
        result.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortValue.value === "name-desc") {
        result.sort((a, b) => b.name.localeCompare(a.name))
    } else if (sortValue.value === "dept-asc") {
        result.sort((a, b) => a.departments.length - b.departments.length)
    } else if (sortValue.value === "dept-desc") {
        result.sort((a, b) => b.departments.length - a.departments.length)
    } else if (sortValue.value === "avail-asc") {
        result.sort((a, b) => a.availability.length - b.availability.length)
    } else if (sortValue.value === "avail-desc") {
        result.sort((a, b) => b.availability.length - a.availability.length)
    }

    return result
    })

    /////////////////////////////// Modal ////////////////////////////
    const teacherConfirm = async () => {
        try {
            // Add to Teachers Table
            const resTeacher = await axios.post("http://localhost:3000/add-teacher", {
                faculty_id: facultyId.value,
                first_name: firstName.value.charAt(0).toUpperCase() + firstName.value.slice(1).toLowerCase(),
                last_name: lastName.value.charAt(0).toUpperCase() + lastName.value.slice(1).toLowerCase(),
                availability: "jsonFile",
            });

            console.log(resTeacher.data.message);

            const teacherId = resTeacher.data.teacher_id;
            const departmentsArray = departments.value;

            // Add to Teacher Departments
            const resDept = await axios.post("http://localhost:3000/add-teacher-department", {
                teacher_id: teacherId,
                department_name: departmentsArray,
            });

            fetchTeachers();

            console.log(resDept.data.message);
        } catch (error) {
            console.error("Error:", error);
            console.log("Failed to add teacher.");
        }
        alert("Add teacher Successfully!");
        isVisibleTeacherModal.value = !isVisibleTeacherModal.value;
    };


    /////////////////////////////// FETCH TEACHERS ////////////////////////////
    const fetchTeachers = async () => {
    try {
        const res = await axios.get("http://localhost:3000/teachers")

        items.value = res.data.map(teacher => ({
            teacher_id: teacher.teacher_id,
            faculty_id: teacher.faculty_id,
            first_name: teacher.first_name,
            last_name: teacher.last_name,
            availability: teacher.availability
        }));

    } catch (err) {
        console.error("Error fetching teachers:", err)
    }
    }

    onMounted(fetchTeachers);

    /////////////////////////////// FETCH DEPARTMENTS ////////////////////////////
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

            console.log("Departments:", departmentsDB);

        } catch (err) {
            console.error("Error fetching departments:", err);
        }
    }

    onMounted(fetchDepartments)

    /////////////////////////////// Modal ////////////////////////////
    // Helper function to watch a day
    function watchFullDay(fullDayRef, fromRef, toRef) {
    watch(fullDayRef, (newVal) => {
        if (newVal) {
        fromRef.value = defaultFrom
        toRef.value = defaultTo
        } else {
        fromRef.value = ''
        toRef.value = ''
        }
    })
    }

    // Apply watcher for all days
    watchFullDay(mondayFullDay, mondayfromTime, mondaytoTime)
    watchFullDay(tuesdayFullDay, tuesdayfromTime, tuesdaytoTime)
    watchFullDay(wednesdayFullDay, wednesdayfromTime, wednesdaytoTime)
    watchFullDay(thursdayFullDay, thursdayfromTime, thursdaytoTime)
    watchFullDay(fridayFullDay, fridayfromTime, fridaytoTime)
    watchFullDay(saturdayFullDay, saturdayfromTime, saturdaytoTime)

    const toggleTeacherModal = (AddorUpdate) => {
        isVisibleTeacherModal.value = !isVisibleTeacherModal.value

        if(AddorUpdate == 'update'){
            
        }
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
                    <option value="">Sort by</option>
                    <option value="name-asc">Most Recent</option>
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                    <option value="dept-asc">Departments (Fewest)</option>
                    <option value="dept-desc">Departments (More)</option>
                    <option value="avail-asc">Availability (Fewest)</option>
                    <option value="avail-desc">Availability (More)</option>
                </select>

                <button @click="toggleTeacherModal"  style="margin-left: auto; width: 200px;">+ Add Teacher</button>
            </div>

                <table>
                    <thead>
                        <tr>
                            <th>Faculty ID</th>
                            <th>Name</th>
                            <th>Departments</th>
                            <th>Availability</th>
                            <th style="width: 130px">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in filteredItems" :key="item.id">
                        <td>{{ item.faculty_id }}</td>
                        <td>{{ item.first_name + ', ' + item.last_name }}</td>
                        <td>{{ item.departments }}</td>
                        <td>{{ item.availability }}</td>
                        <td>
                            <div style="display: flex; flex-direction: row; gap: 5px; align-items: center; width: 130px;">
                                <button class="outlineBtn" style="font-size: 1.2rem; padding: 3px 6px;">
                                    <i class='bx bx-trash'></i>
                                </button>
                                <button @click="toggleTeacherModal('update')" style="font-size: 1.2rem; padding: 4px 12px;">
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
            <div v-show="isVisibleTeacherModal" class="modal" @click.self="toggleTeacherModal">
               <div class="modal-content">
                    <h2 style="color: var(--color-primary); line-height: 0;">Teacher Information</h2>

                    <div style="display: flex; flex-direction: row; width: 100%; gap: 60px;">

                        <!-- Left section -->
                        <div style="display: flex; flex-direction: column; gap: 14px; flex: 1">
                            <div>
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Faculity ID</p>
                                <input v-model="facultyId"></input>
                            </div>

                             <div style="display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; column-gap: 15px; ">
                                <p class="paragraph--black-bold" style="line-height: 1.8;">First Name</p>
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Last Name</p>
                                <input v-model="firstName"></input>
                                <input v-model="lastName"></input>
                            </div>

                             <div style="position: relative; width: 100%;">
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Department</p>
                                <input v-model="department"></input>

                                <!-- Dropdown suggestions -->
                                <div v-if="filteredDepartments.length" 
                                    style="position: absolute; display: flex; flex-direction: column; background-color: white;
                                            width: 100%;  padding-top: 6px; padding-bottom: 6px; border-radius: 6px; border: 1px solid var(--color-border);
                                            margin-top: 6px; box-sizing: border-box;
                                            max-height: 200px; overflow-y: auto;"> 

                                    <div v-for="(dep, index) in filteredDepartments" 
                                        :key="index"
                                        @click="selectDepartment(dep)"
                                        class="dropdown-item">
                                        {{ dep }}
                                    </div>
                                </div>
                                <!-- Selected Departments -->
                                <div style="display: flex; flex-direction: column; background-color: var(--color-main-background);
                                            width: 100%; height: 120px; overflow-y: auto; min-height: 80px; border-radius: 6px; border: 1px solid var(--color-border);
                                            margin-top: 6px; padding-left: 16px; padding-right: 16px; padding-top: 8px; padding-bottom: 8px; box-sizing: border-box;">

                                    <label v-for="dept in departments" :key="dept" style="margin-bottom: 4px;">
                                        {{ dept }}
                                    </label>
                                </div>
                            </div>

                             <div>
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Subjects</p>
                                <input v-model="subjects"></input>
                                <div style="display: flex; flex-direction: column; background-color: var(--color-main-background);
                                            width: 100%; height: auto; min-height: 80px; border-radius: 6px; border: 1px solid var(--color-border);
                                            margin-top: 6px; padding: 12px; box-sizing: border-box;">
                                </div>
                            </div>
                            
                        </div>

                        <!-- Right section -->
                        <div style="display: flex; flex-direction: column; width: auto; min-width: 460px;" :style="{gap: mondayChecked ? '0px' : '8px' }">
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Availability</p>

                            <div style="display: flex; flex-direction: column;" :style="{gap: mondayChecked || tuesdayChecked || wednesdayChecked || thursdayChecked || fridayChecked || saturdayChecked ? '12px' : '0px' }">
                                <!-- Monday -->
                                <div style="display: flex; flex-direction: row; align-items: end; gap: 8px; ">
                                    <div style="display: flex; flex-direction: row; align-items: center; gap: 8px; margin-bottom: 13px;">
                                        <input type="checkbox" v-model="mondayChecked"></input>
                                        <p class="paragraph--gray">Monday</p>
                                    </div>
                                    

                                    <div v-show="mondayChecked" style="display: flex; flex-direction: row; gap: 6px; margin-left: 32px; align-items: center;">
                                        <div>
                                            <p class="paragraph--gray">From</p>
                                            <input type="time" v-model="mondayfromTime" min="09:00" max="18:00" step="900" placeholder="From"></input>
                                        </div>
                                        <p class="paragraph--gray" style="margin-top: 26px;">-</p>
                                        <div>
                                            <p class="paragraph--gray">To</p>
                                            <input type="time" v-model="mondaytoTime" min="09:00" max="18:00" step="900" placeholder="To"></input>
                                        </div>

                                        <div style="display: flex; flex-direction: row; gap: 6px; margin-top: 20px; align-items: center;">
                                            <input type="checkbox" v-model="mondayFullDay"></input>
                                            <p class="paragraph--black-bold">Full day</p>
                                        </div>
                                        
                                    </div>
                                </div>

                                <!-- Tuesday -->
                                <div style="display: flex; flex-direction: row; align-items: end; gap: 8px; ">
                                    <div style="display: flex; flex-direction: row; align-items: center; gap: 8px; margin-bottom: 13px;">
                                        <input type="checkbox" v-model="tuesdayChecked"></input>
                                        <p class="paragraph--gray">Tuesday</p>
                                    </div>
                                    

                                    <div v-show="tuesdayChecked" style="display: flex; flex-direction: row; gap: 6px; margin-left: 32px; align-items: center;">
                                        <div>
                                            <p class="paragraph--gray">From</p>
                                            <input type="time" v-model="tuesdayfromTime" min="09:00" max="18:00" step="900" placeholder="From"></input>
                                        </div>
                                        <p class="paragraph--gray" style="margin-top: 26px;">-</p>
                                        <div>
                                            <p class="paragraph--gray">To</p>
                                            <input type="time" v-model="tuesdaytoTime" min="09:00" max="18:00" step="900" placeholder="To"></input>
                                        </div>

                                        <div style="display: flex; flex-direction: row; gap: 6px; margin-top: 20px; align-items: center;">
                                            <input type="checkbox" v-model="tuesdayFullDay"></input>
                                            <p class="paragraph--black-bold">Full day</p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Wednesday -->
                                <div style="display: flex; flex-direction: row; align-items: end; gap: 8px; ">
                                    <div style="display: flex; flex-direction: row; align-items: center; gap: 8px; margin-bottom: 13px;">
                                        <input type="checkbox" v-model="wednesdayChecked"></input>
                                        <p class="paragraph--gray">Wednesday</p>
                                    </div>
                                    

                                    <div v-show="wednesdayChecked" style="display: flex; flex-direction: row; gap: 6px; margin-left: 8px; align-items: center;">
                                        <div>
                                            <p class="paragraph--gray">From</p>
                                            <input type="time" v-model="wednesdayfromTime" min="09:00" max="18:00" step="900" placeholder="From"></input>
                                        </div>
                                        <p class="paragraph--gray" style="margin-top: 26px;">-</p>
                                        <div>
                                            <p class="paragraph--gray">To</p>
                                            <input type="time" v-model="wednesdaytoTime" min="09:00" max="18:00" step="900" placeholder="To"></input>
                                        </div>

                                        <div style="display: flex; flex-direction: row; gap: 6px; margin-top: 20px; align-items: center;">
                                            <input type="checkbox" v-model="wednesdayFullDay"></input>
                                            <p class="paragraph--black-bold">Full day</p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Thursday -->
                                <div style="display: flex; flex-direction: row; align-items: end; gap: 8px; ">
                                    <div style="display: flex; flex-direction: row; align-items: center; gap: 8px; margin-bottom: 13px;">
                                        <input type="checkbox" v-model="thursdayChecked"></input>
                                        <p class="paragraph--gray">Thursday</p>
                                    </div>
                                    

                                    <div v-show="thursdayChecked" style="display: flex; flex-direction: row; gap: 6px; margin-left: 26px; align-items: center;">
                                        <div>
                                            <p class="paragraph--gray">From</p>
                                            <input type="time" v-model="thursdayfromTime" min="09:00" max="18:00" step="900" placeholder="From"></input>
                                        </div>
                                        <p class="paragraph--gray" style="margin-top: 26px;">-</p>
                                        <div>
                                            <p class="paragraph--gray">To</p>
                                            <input type="time" v-model="thursdaytoTime" min="09:00" max="18:00" step="900" placeholder="To"></input>
                                        </div>

                                        <div style="display: flex; flex-direction: row; gap: 6px; margin-top: 20px; align-items: center;">
                                            <input type="checkbox" v-model="thursdayFullDay"></input>
                                            <p class="paragraph--black-bold">Full day</p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Friday -->
                                <div style="display: flex; flex-direction: row; align-items: end; gap: 8px; ">
                                    <div style="display: flex; flex-direction: row; align-items: center; gap: 8px; margin-bottom: 13px;">
                                        <input type="checkbox" v-model="fridayChecked"></input>
                                        <p class="paragraph--gray">Friday</p>
                                    </div>
                                    

                                    <div v-show="fridayChecked" style="display: flex; flex-direction: row; gap: 6px; margin-left: 47px; align-items: center;">
                                        <div>
                                            <p class="paragraph--gray">From</p>
                                            <input type="time" v-model="fridayfromTime" min="09:00" max="18:00" step="900" placeholder="From"></input>
                                        </div>
                                        <p style="margin-top: 26px;">-</p>
                                        <div>
                                            <p class="paragraph--gray">To</p>
                                            <input type="time" v-model="fridaytoTime" min="09:00" max="18:00" step="900" placeholder="To"></input>
                                        </div>

                                        <div style="display: flex; flex-direction: row; gap: 6px; margin-top: 20px; align-items: center;">
                                            <input type="checkbox" v-model="fridayFullDay"></input>
                                            <p class="paragraph--black-bold">Full day</p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Saturday -->
                                <div style="display: flex; flex-direction: row; align-items: end; gap: 8px; ">
                                    <div style="display: flex; flex-direction: row; align-items: center; gap: 8px; margin-bottom: 13px;">
                                        <input type="checkbox" v-model="saturdayChecked"></input>
                                        <p class="paragraph--gray">Saturday</p>
                                    </div>
                                    

                                    <div v-show="saturdayChecked" style="display: flex; flex-direction: row; gap: 6px; margin-left: 28px; align-items: center;">
                                        <div>
                                            <p class="paragraph--gray">From</p>
                                            <input type="time" v-model="saturdayfromTime" min="09:00" max="18:00" step="900" placeholder="From"></input>
                                        </div>
                                        <p class="paragraph--gray" style="margin-top: 26px;">-</p>
                                        <div>
                                            <p class="paragraph--gray">To</p>
                                            <input type="time" v-model="saturdaytoTime" min="09:00" max="18:00" step="900" placeholder="To"></input>
                                        </div>

                                        <div style="display: flex; flex-direction: row; gap: 6px; margin-top: 20px; align-items: center;">
                                            <input type="checkbox" v-model="saturdayFullDay"></input>
                                            <p class="paragraph--black-bold">Full day</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto;">
                        <button @click="toggleTeacherModal" class="cancelBtn">Cancel</button>
                        <button @click="teacherConfirm">Confirm</button>
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
    }

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

</style>