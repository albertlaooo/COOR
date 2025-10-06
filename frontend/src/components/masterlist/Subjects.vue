<script setup>
    import { useRouter } from 'vue-router'
    import { ref, watch, onMounted, computed } from "vue"
    import axios from "axios";

    const router = useRouter()

    // DATA
    const subjectName = ref()
    const subjectCode = ref()
    const selectedUnits = ref()
    const selectedLectureTime = ref()
    const selectedLaboratoryTime = ref()

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
        subj.name.toLowerCase().includes(q) ||
        String(subj.units).includes(q) ||
        String(subj.hours_week).includes(q) ||
        subj.room_type.toLowerCase().includes(q)
        )
    }

    // ↕️ Sort options
    if (sortValue.value === "name-asc") {
        result.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortValue.value === "name-desc") {
        result.sort((a, b) => b.name.localeCompare(a.name))
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
            selectedUnits.value = selectedSubject.value.units
            selectedLectureTime.value = selectedSubject.value.lecture
            selectedLaboratoryTime.value = selectedSubject.value.laboratory
            isVisibleSubjectModal.value = !isVisibleSubjectModal.value

            console.log(selectedSubject.value)
        }

        else if(which === 'cancel'){
            setTimeout(() => {
                resetInputs()
            }, 100);

            isVisibleSubjectModal.value = !isVisibleSubjectModal.value
        }
    }

    function resetInputs(){
        subjectTitle.value = ''
        subjectButton.value = ''
        subjectHandler.value = ''
        subjectName.value = ''
        subjectCode.value = ''
        selectedUnits.value = ''
        selectedLectureTime.value = ''
        selectedLaboratoryTime.value = ''
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

    const setSelectedSubject = (subject) => {
        selectedSubject.value = { ...subject }
    }

    const subjectConfirm = async () => {

        if(subjectHandler.value === 'add'){
            try {
                const res = await axios.post("http://localhost:3000/add-subject", {
                    subject_name: subjectName.value,
                    subject_code: subjectCode.value.toUpperCase(),
                    units: selectedUnits.value,
                    lecture: selectedLectureTime.value,
                    laboratory: selectedLaboratoryTime.value
                });
                console.log(res.data.message);
            } catch (error) {
                console.error("Error:", error);
                console.log("Failed to add subject.");
            }
            alert("Add subject Successfully!");

            fetchSubjects()
            setTimeout(() => {
                    resetInputs()
                }, 100);
            isVisibleSubjectModal.value = !isVisibleSubjectModal.value
        }

        else if(subjectHandler.value === 'update'){
            try {
                const res = await axios.put(`http://localhost:3000/update-subject/${selectedSubject.value.subject_id}`, {
                    subject_name: subjectName.value,
                    subject_code: subjectCode.value,
                    units: selectedUnits.value,
                    lecture: selectedLectureTime.value,
                    laboratory: selectedLaboratoryTime.value
                });

            console.log(res.data.message);
            alert("Subject updated successfully!");
            
            fetchSubjects();
            selectedSubject.value = null;
            toggleSubjectModal('cancel');

            // Reset Inputs
            resetInputs()
            } catch (error) {
                console.error("Error:", error);
                alert("Failed to update subject.");
            }
        }
    }

    //////////////////////// Delete Subject /////////////////////////
    const deleteSubject = async (id) => {
        if (!confirm("Are you sure you want to delete this subject?")) {
            return
        }

        try {
            await axios.delete(`http://localhost:3000/subjects/${id}`)
            items.value = items.value.filter(s => s.subject_code !== id)
            alert("Deleted Successfully.")
            fetchSubjects()
        } catch (err) {
            console.error("Error deleting subject:", err)
            alert("Failed to delete subject.")
        }
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
                    <option value="code-asc">Code ↑</option>
                    <option value="name-asc">Name A–Z</option>
                    <option value="name-desc">Name Z–A</option>
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
                            <th>Subject Code</th>
                            <th>Subject Name</th>
                            <th>Units</th>
                            <th>Hours/Week</th>
                            <th>Room Type</th>
                            <th style="width: 130px">Actions</th>
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
                                <button @click="deleteSubject(item.subject_id)" class="outlineBtn" style="font-size: 1.2rem; padding: 3px 6px;">
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
                    <h2 style="color: var(--color-primary); line-height: 0; margin: 12px;">Subject Information</h2>

                    <div style="display: flex; flex-direction: column; gap: 14px; width: 100%;">
                        <div>
                            <p class="paragraph--black-bold" style="line-height: 1.8;">Subject Name</p>
                            <input v-model="subjectName"></input>
                        </div>

                        <div style="display: flex; flex-direction: row; gap: 14px;">
                            <div style="flex: 1;">
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Subject Code</p>
                                <input v-model="subjectCode"></input>
                            </div>

                            <div style="flex: 1;">
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Units</p>
                                <select v-model="selectedUnits" style="width: 100%;">
                                    <option value="1">1 Units</option>
                                    <option value="2">2 Units</option>
                                    <option value="3">3 Units</option>
                                </select>
                            </div>
                        </div>

                        <div style="display: flex; flex-direction: row; gap: 14px;">
                            <div style="flex: 1;">
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Lecture</p>
                                <select v-model="selectedLectureTime" style="width: 100%;">
                                    <option value="0">None</option>
                                    <option value="1">1 hr</option>
                                    <option value="2">2 hrs</option>
                                    <option value="3">3 hrs</option>
                                </select>
                            </div>

                            <div style="flex: 1;">
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Laboratory</p>
                                <select v-model="selectedLaboratoryTime" style="width: 100%;">
                                    <option value="0">None</option>
                                    <option value="1">1 hr</option>
                                    <option value="2">2 hrs</option>
                                    <option value="3">3 hrs</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto;">
                        <button @click="toggleSubjectModal('cancel')" class="cancelBtn">Cancel</button>
                        <button @click="subjectConfirm">Confirm</button>
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
        max-width: 1600px;
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