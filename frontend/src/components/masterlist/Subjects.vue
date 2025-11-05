<script setup>
    import { useRouter } from 'vue-router'
    import { ref, watch, onMounted, computed } from "vue"
    import axios from "axios";

    const router = useRouter()

    // DATA
    const subjectName = ref('')
    const subjectCode = ref('')
    const selectedUnits = ref('')
    const selectedLectureTime = ref('')
    const selectedLaboratoryTime = ref('')

    const isVisibleSubjectModal = ref(false)

    const searchQuery = ref("")
    const sortValue = ref("")

    const items = ref([])

    const sortedSubjects = computed(() => {
    let result = [...items.value]

    // 🔍 Search filter
    if (searchQuery.value.trim() !== "") {
        const q = searchQuery.value.toLowerCase()
        result = result.filter(subj =>
        subj.subject_code.toLowerCase().includes(q) ||
        subj.subject_name.toLowerCase().includes(q) || // ✅ fixed here
        String(subj.units).includes(q) ||
        String(subj.hours_week).toLowerCase().includes(q) || // ✅ safer lowercase check
        subj.room_type.toLowerCase().includes(q)
        )
    }

    // ↕️ Sort options
    if (sortValue.value === "name-asc") {
        result.sort((a, b) => a.subject_name.localeCompare(b.subject_name))
    } else if (sortValue.value === "name-desc") {
        result.sort((a, b) => b.subject_name.localeCompare(a.subject_name))
    } else if (sortValue.value === "subject-code-asc") {
        result.sort((a, b) => a.subject_code.localeCompare(b.subject_code))
    } else if (sortValue.value === "subject-code-desc") {
        result.sort((a, b) => b.subject_code.localeCompare(a.subject_code))
    } else if (sortValue.value === "units-asc") {
        result.sort((a, b) => Number(a.units) - Number(b.units))
    } else if (sortValue.value === "units-desc") {
        result.sort((a, b) => Number(b.units) - Number(a.units))
    } else if (sortValue.value === "room-lec-first") {
        result.sort((a, b) => {
        const order = { "Lec": 1, "Lec, Lab": 2, "Lab": 3 }
        return order[a.room_type] - order[b.room_type]
        })
    } else if (sortValue.value === "room-lab-first") {
        result.sort((a, b) => {
        const order = { "Lab": 1, "Lec, Lab": 2, "Lec": 3 }
        return order[a.room_type] - order[b.room_type]
        })
    }

    return result
    })

    /////////////////////////////// Subject Modal ////////////////////////////
    const subjectTitle = ref('')
    const subjectButton = ref('')

    function toggleSubjectModal(which) {
        if(which === 'add'){
            subjectTitle.value = 'Subject Information'
            subjectButton.value = 'Confirm'
            subjectHandler.value = 'add'
            isVisibleSubjectModal.value = !isVisibleSubjectModal.value
        }

        else if(which === 'update'){
            subjectTitle.value = 'Update Information'
            subjectButton.value = 'Update'
            subjectHandler.value = 'update'
            subjectName.value = selectedSubject.value.subject_name
            subjectCode.value = selectedSubject.value.subject_code
            selectedUnits.value = String(selectedSubject.value.units)
            selectedLectureTime.value = String(selectedSubject.value.lecture)
            selectedLaboratoryTime.value = String(selectedSubject.value.laboratory)
            isVisibleSubjectModal.value = !isVisibleSubjectModal.value
        }

        else if(which === 'cancel'){
            resetInputs()
            isVisibleSubjectModal.value = !isVisibleSubjectModal.value
        }
    }

    function resetInputs(){
        setTimeout(() => {
            subjectTitle.value = ''
            subjectButton.value = ''
            subjectHandler.value = ''
            subjectName.value = ''
            subjectCode.value = ''
            selectedUnits.value = ''
            selectedLectureTime.value = ''
            selectedLaboratoryTime.value = ''
            showErrorInput.value = false
            errorMessage.value = ''
            isSubjectNameOk.value = false
            isSubjectCodeOk.value = false
            isUnitsOk.value = false
            isLectureOk.value = false
            isLaboratoryOk.value = false
        }, 200);
    }

    /////////////////////////////// FETCH SUBJECTS ////////////////////////////
    const fetchSubjects = async () => {
    try {
        const res = await axios.get("http://localhost:3000/subjects")

        items.value = res.data.map(subj => {
        let roomType = []

        if (subj.lecture > 0) {
            roomType.push("Lec")
        }
        if (subj.laboratory > 0) {
            roomType.push("Lab")
        }

        // Handle hours with singular/plural
        let hours = []
        if (subj.lecture > 0) {
            hours.push(`${subj.lecture} hr${subj.lecture > 1 ? "s" : ""}`)
        }
        if (subj.laboratory > 0) {
            hours.push(`${subj.laboratory} hr${subj.laboratory > 1 ? "s" : ""}`)
        }

        return {
            subject_id: subj.subject_id,
            subject_code: subj.subject_code,
            subject_name: subj.subject_name,
            units: subj.units,
            hours_week: hours.join(", "),
            room_type: roomType.join(", ") || "N/A",
            lecture: subj.lecture,
            laboratory: subj.laboratory
        }
        })

    } catch (err) {
        console.error("Error fetching subjects:", err)
    }
    }

    onMounted(fetchSubjects);

    //////////////////////// Add Subject /////////////////////////
    const subjectHandler = ref('')
    const selectedSubject = ref(null)

    const showErrorInput = ref(false)
    const errorMessage = ref('')
    const isSubjectNameOk = ref(false)
    const isSubjectCodeOk = ref(false)
    const isUnitsOk = ref(false)
    const isLectureOk = ref(false)
    const isLaboratoryOk = ref(false)

    const setSelectedSubject = (subject) => {
        selectedSubject.value = { ...subject }
    }

    const subjectConfirm = async () => {
        // 🔹 Blank Input Validation
        if (
            !subjectName.value.trim() ||
            !subjectCode.value.trim() ||
            !selectedUnits.value ||
            !selectedLectureTime.value ||
            !selectedLaboratoryTime.value
        ) {
            showErrorInput.value = false;
            setTimeout(() => (showErrorInput.value = true), 0);

            isSubjectNameOk.value = !!subjectName.value.trim();
            isSubjectCodeOk.value = !!subjectCode.value.trim();
            isUnitsOk.value = !!selectedUnits.value;
            isLectureOk.value = !!selectedLectureTime.value;
            isLaboratoryOk.value = !!selectedLaboratoryTime.value;

            errorMessage.value = "Please fill in all required fields.";
            return;
        }

        // 🚫 Lecture and Laboratory cannot both be 0
        if (selectedLectureTime.value === "0" && selectedLaboratoryTime.value === "0") {
            showErrorInput.value = false;
            setTimeout(() => (showErrorInput.value = true), 0);

            isLectureOk.value = false;
            isLaboratoryOk.value = false;
            errorMessage.value = "Lecture and Laboratory cannot be both none.";
            return;
        }

        try {
            if (subjectHandler.value === "add") {
                const res = await axios.post("http://localhost:3000/add-subject", {
                    subject_name: subjectName.value.trim(),
                    subject_code: subjectCode.value.trim().toUpperCase(),
                    units: selectedUnits.value,
                    lecture: selectedLectureTime.value,
                    laboratory: selectedLaboratoryTime.value,
                });
            } 
            else if (subjectHandler.value === "update") {
                const res = await axios.put(
                    `http://localhost:3000/update-subject/${selectedSubject.value.subject_id}`,
                    {
                        subject_name: subjectName.value.trim(),
                        subject_code: subjectCode.value.trim().toUpperCase(),
                        units: selectedUnits.value,
                        lecture: selectedLectureTime.value,
                        laboratory: selectedLaboratoryTime.value,
                    }
                );
            }

            // 🔹 Refresh and reset
            fetchSubjects();
            toggleSubjectModal("cancel");
            resetInputs();
        } 
        catch (error) {
            // 🔹 Duplicate check (based on backend response)
            const message = error.response?.data?.message;

            // Reset all OK flags first
            isSubjectNameOk.value = true;
            isSubjectCodeOk.value = true;
            isUnitsOk.value = true;
            isLectureOk.value = true;
            isLaboratoryOk.value = true;

            let duplicateFound = false;

            if (message?.includes("Subject name and code already exist.")) {
                isSubjectNameOk.value = false;
                isSubjectCodeOk.value = false;
                duplicateFound = true;
            } 
            else if (message?.includes("Subject name already exists")) {
                isSubjectNameOk.value = false;
                duplicateFound = true;
            } 
            else if (message?.includes("Subject code already exists")) {
                isSubjectCodeOk.value = false;
                duplicateFound = true;
            }

            if (duplicateFound) {
                showErrorInput.value = false;
                setTimeout(() => (showErrorInput.value = true), 0);
            }

            errorMessage.value = message || "Failed to save subject.";
        }
    };

    // 🧠 Helper function to check if all required inputs are OK
    const checkAllOk = () => {
        if (
            isSubjectNameOk.value &&
            isSubjectCodeOk.value &&
            isUnitsOk.value &&
            isLectureOk.value &&
            isLaboratoryOk.value
        ) {
            showErrorInput.value = false;
        }
    };

    // 🕵️ Watchers to auto-clear red border and error when typing
    const watchers = [
    { ref: subjectName, flag: isSubjectNameOk },
    { ref: subjectCode, flag: isSubjectCodeOk },
    { ref: selectedUnits, flag: isUnitsOk },
    { ref: selectedLectureTime, flag: isLectureOk },
    { ref: selectedLaboratoryTime, flag: isLaboratoryOk },
    ];

    watchers.forEach(({ ref, flag }) => {
    watch(ref, (newVal) => {
        // ✅ Handle different data types safely
        const value =
        typeof newVal === "string"
            ? newVal.trim()
            : newVal !== null && newVal !== undefined
            ? String(newVal).trim()
            : "";

        if (value !== "") {
        flag.value = true;
        checkAllOk();
        }
    });
    });

    //////////////////////// Delete Subject Modal /////////////////////////
    const isVisibleDeleteModal = ref(false)
    const subjectIdtoDelete = ref('')
    const subjectNameToDelete = ref('')

    const deleteSubject = async (item) => {
        subjectNameToDelete.value = item.subject_name
        subjectIdtoDelete.value = item.subject_id
        toggleDeleteModal()
    }

    function toggleDeleteModal() {
        isVisibleDeleteModal.value = !isVisibleDeleteModal.value
    }

    async function confirmDelete() {
        try {
            await axios.delete(`http://localhost:3000/subjects/${subjectIdtoDelete.value}`)
            items.value = items.value.filter(s => s.subject_code !== subjectIdtoDelete.value)
            fetchSubjects()
        } catch (err) {
            console.error("Error deleting subject:", err)
            alert("Failed to delete subject.")
        }

        toggleDeleteModal()
    }

    //////////////////////// Navigation Function /////////////////////////
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
                <h1>Subjects</h1>
                <p class="paragraph--gray">Add, edit, or remove subjects.</p>
            </div>
        </header>

        <div id="masterdata-nav">
            <div @click="navBtn('departments')" class="navBtn">
                <p>Departments</p>
            </div>
            <div @click="navBtn('courses')" class="navBtn">
                <p>Courses</p>
            </div>
            <div @click="navBtn('subjects')" class="navBtn active">
                <p>Subjects</p>
            </div>
            <div @click="navBtn('rooms')" class="navBtn">
                <p>Rooms</p>
            </div>
        </div>

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
                    <option value="subject-code-asc">Subject Code (A–Z)</option>
                    <option value="subject-code-desc">Subject Code (Z–A)</option>
                    <option value="name-asc">Name (A–Z)</option>
                    <option value="name-desc">Name (Z–A)</option>
                    <option value="units-asc">Units ↑</option>
                    <option value="units-desc">Units ↓</option>
                    <option value="room-lec-first">Room: Lec → Lab</option>
                    <option value="room-lab-first">Room: Lab → Lec</option>
                </select>

                <button @click="toggleSubjectModal('add')" style="margin-left: auto; width: 200px;">+ Add Subject</button>
            </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 15%;">Subject Code</th>
                            <th style="width: 30%;">Subject Name</th>
                            <th style="width: 11%;">Units</th>
                            <th style="width: 16%;">Hours/Week</th>
                            <th style="width: 16%;">Room Type</th>
                            <th style="width: 11%;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in sortedSubjects" :key="item.id">
                        <td>{{ item.subject_code }}</td>
                        <td>{{ item.subject_name }}</td>
                        <td>{{ item.units }}</td>
                        <td>{{ item.hours_week }}</td>
                        <td>{{ item.room_type }}</td>
                        <td>
                            <div style="display: flex; flex-direction: row; gap: 5px; align-items: center; width: 130px;">
                                <button @click="deleteSubject(item)" class="outlineBtn" style="font-size: 1.2rem; padding: 3px 6px;">
                                    <i class='bx bx-trash'></i>
                                </button>
                                <button @click="setSelectedSubject(item); toggleSubjectModal('update')" style="font-size: 1.2rem; padding: 4px 12px;">
                                    <i class='bx bx-edit-alt'></i>
                                </button>
                            </div>
                        </td>
                        </tr>
                    </tbody>
                </table>
        </main>
        
        <!-- Add Subject Modal -->
        <transition name="fade">
            <div v-show="isVisibleSubjectModal" class="modal" @click.self="toggleSubjectModal('cancel')">
               <div class="modal-content">
                    <h2 style="color: var(--color-primary); line-height: 0; margin: 12px;">{{ subjectTitle }}</h2>

                    <div style="display: flex; flex-direction: column; gap: 14px; width: 100%;">
                        <div>
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Subject Name</p>
                            <input v-model="subjectName"
                            :class="{ 'error-input-border': showErrorInput && !isSubjectNameOk }"></input>
                        </div>

                        <div style="display: flex; flex-direction: row; gap: 14px;">
                            <div style="flex: 1;">
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Subject Code</p>
                                <input v-model="subjectCode"
                                :class="{ 'error-input-border': showErrorInput && !isSubjectCodeOk }"></input>
                            </div>

                            <div style="flex: 1;">
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Units</p>
                                <select v-model="selectedUnits" style="width: 100%;"
                                :class="{ 'error-input-border': showErrorInput && !isUnitsOk }">
                                    <option value="1">1 Units</option>
                                    <option value="2">2 Units</option>
                                    <option value="3">3 Units</option>
                                </select>
                            </div>
                        </div>

                        <div style="display: flex; flex-direction: row; gap: 14px;">
                            <div style="flex: 1;">
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Lecture</p>
                                <select v-model="selectedLectureTime" style="width: 100%;"
                                :class="{ 'error-input-border': showErrorInput && !isLectureOk }">
                                    <option value="0">None</option>
                                    <option value="1">1 hr</option>
                                    <option value="2">2 hrs</option>
                                    <option value="3">3 hrs</option>
                                </select>
                            </div>

                            <div style="flex: 1;">
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Laboratory</p>
                                <select v-model="selectedLaboratoryTime" style="width: 100%;"
                                :class="{ 'error-input-border': showErrorInput && !isLaboratoryOk }">
                                    <option value="0">None</option>
                                    <option value="1">1 hr</option>
                                    <option value="2">2 hrs</option>
                                    <option value="3">3 hrs</option>
                                </select>
                            </div>
                        </div>
                        <label v-show="showErrorInput" style="color: red; font-size: 0.95rem; margin-right: auto;">{{ errorMessage }}</label>
                    </div>

                    <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto;">
                        <button @click="toggleSubjectModal('cancel')" class="cancelBtn">Cancel</button>
                        <button @click="subjectConfirm">{{ subjectButton }}</button>
                    </div>
               </div>
            </div>
        </transition>

        <!-- Delete Subject Modal -->
        <transition name="fade">
            <div v-show="isVisibleDeleteModal" class="modal" @click.self="toggleDeleteModal"> 
                <div class="delete-modal-content">
                    <div style="display: flex; flex-direction: column; width: 100%; gap: 24px;">
                        <div style="display: flex; flex-direction: row; gap: 10px; align-items: center; justify-content: start;">
                            <svg class="svg-icon" style="width: 2.5em; height: 2.5em; vertical-align: middle;fill: #b84343;overflow: hidden;" viewBox="188 129 648 784" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M779.3 228.2h-113v-35.4c0-34.9-28.4-63.3-63.3-63.3H425c-34.9 0-63.3 28.4-63.3 63.3v35.4h-113c-32.9 0-59.7 26.8-59.7 59.7v38.5c0 32.9 26.8 59.7 59.7 59.7h1.8v412.8c0 54.1 44 98.1 98.1 98.1h330.9c54.1 0 98.1-44 98.1-98.1V386.1h1.8c32.9 0 59.7-26.8 59.7-59.7v-38.5c-0.1-32.9-26.8-59.7-59.8-59.7z m-374.9-35.4c0-11.4 9.2-20.6 20.6-20.6h178c11.4 0 20.6 9.2 20.6 20.6v35.4H404.4v-35.4z m330.4 606c0 30.5-24.8 55.4-55.4 55.4H348.5c-30.5 0-55.4-24.8-55.4-55.4V386.1h441.7v412.7z m61.5-472.4c0 9.4-7.6 17-17 17H248.7c-9.4 0-17-7.6-17-17v-38.5c0-9.4 7.6-17 17-17h530.7c9.4 0 17 7.6 17 17v38.5z"  /><path d="M377.9 462.3h42.7v317.5h-42.7zM492.6 462.3h42.7v317.5h-42.7zM607.4 462.3h42.7v317.5h-42.7z"  /></svg>
                            <h3 style="line-height: 0; font-size: x-large; margin: 10px 0px;">Delete Confirmation</h3>
                        </div>
                        
                        <p>Are you sure you want to delete <strong>{{ subjectNameToDelete }}</strong> subject?</p>

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
    
    table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px auto;
        background-color: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 0 5px rgba(0,0,0,0.2);
        table-layout: fixed;
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
    }

    .modal-content {
        display: flex;
        flex-direction: column;
        background-color: white;
        height: auto;
        align-items: center;
        width: 520px;
        padding-top: 30px;
        padding-bottom: 30px;
        padding-left: 50px;
        padding-right: 50px;
        box-shadow: -2px 0 8px rgba(0,0,0,0.2);
        border-radius: 6px;
        gap: 45px;
    }
</style>