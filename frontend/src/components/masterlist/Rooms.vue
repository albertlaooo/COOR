<script setup>
    import { ref, onMounted, computed, nextTick, watch } from "vue"
    import { useRouter } from 'vue-router'
    import axios from "axios";

    const router = useRouter()

    // DATA
    const roomForms = ref([{ room_code: "", room_type: "" }])

    const isVisibleRoomModal = ref(false)
    const isVisibleNewSectionBtn = ref(true)

    const showErrorInput = ref(false)
    const duplicateCodes = ref([]);
    const duplicateCode = ref("");

    const errorMessage = ref('');

    const searchQuery = ref("")

    const sortValue = ref("")
    const items = ref([]) // your rooms list

    const sortedRooms = computed(() => {
    let result = [...items.value]

    if (searchQuery.value.trim() !== "") {
        const q = searchQuery.value.toLowerCase()
        result = result.filter(room =>
        room.room_code.toLowerCase().includes(q) ||
        room.room_type.toLowerCase().includes(q)
        )
    }

    if (sortValue.value === "code-asc") {
        result.sort((a, b) => a.room_code.localeCompare(b.room_code, undefined, { numeric: true }))
    } else if (sortValue.value === "code-desc") {
        result.sort((a, b) => b.room_code.localeCompare(a.room_code, undefined, { numeric: true }))
    } else if (sortValue.value === "type-asc") {
        result.sort((a, b) => a.room_type.localeCompare(b.room_type))
    } else if (sortValue.value === "type-desc") {
        result.sort((a, b) => b.room_type.localeCompare(a.room_type))
    }

    return result
    })

    /////////////////////////////// Room Modal ////////////////////////////
    const roomTitle = ref('')
    const roomButton = ref('')

    function toggleRoomModal(which) {
        if(which === 'add'){
            roomTitle.value = 'Room Information'
            roomButton.value = 'Confirm'
            roomHandler.value = 'add'
            isVisibleRoomModal.value = !isVisibleRoomModal.value
        }

        else if(which === 'update'){
            roomTitle.value = 'Update Information'
            roomButton.value = 'Update'
            roomHandler.value = 'update'
            roomForms.value = [{
                room_code: selectedRoom.value.room_code,
                room_type: selectedRoom.value.room_type,
                capacity: selectedRoom.value.capacity
            }]

            isVisibleNewSectionBtn.value = !isVisibleNewSectionBtn.value
            isVisibleRoomModal.value = !isVisibleRoomModal.value
        }

        else if(which === 'cancel'){
            setTimeout(() => resetInputs(), 200);
            showErrorInput.value = false
            isVisibleRoomModal.value = !isVisibleRoomModal.value
        }
    }

    function resetInputs(){
        roomTitle.value = ''
        roomButton.value = ''
        roomHandler.value = ''
        roomForms.value = [{ room_code: "", room_type: "", capacity: "" }]
        duplicateCode.value = ""
        showErrorInput.value = false

        nextTick(() => {
            document
            .querySelectorAll(".error-input-border")
            .forEach((el) => el.classList.remove("error-input-border"))
        });

        setTimeout(() => isVisibleNewSectionBtn.value = true, 100)
    }

    /////////////////////////////// FETCH ROOMS ////////////////////////////
    const fetchRooms = async () => {
        try {
            const res = await axios.get("http://localhost:3000/rooms")
            items.value = res.data.map(room => ({
            room_id: room.room_id,
            room_code: room.room_code,
            room_type: room.room_type
            }))
        } catch (err) {
            console.error("Error fetching rooms:", err)
        }
    }

    onMounted(fetchRooms);

    //////////////////////// Add Room /////////////////////////
    const roomHandler = ref('')
    const selectedRoom = ref(null)

    const setSelectedRoom = (room) => {
        selectedRoom.value = { ...room }
    }

    const roomConfirm = async () => {
        const modal = document.querySelector(".modal-content");
        const inputs = modal ? modal.querySelectorAll("input") : [];
        const selects = modal ? modal.querySelectorAll("select") : [];

        // 🧹 Always set up real-time red border removal
        inputs.forEach(input => {
            input.addEventListener("input", () => {
                input.classList.remove("error-input-border");
            });
        });

        // 🟥 NEW: Real-time red border removal for selects
        selects.forEach(select => {
            select.addEventListener("change", () => {
                select.classList.remove("error-input-border");
            });
        });

        // Shared blank checker
        const blankInputs = roomForms.value.filter(
            form => !form.room_code.trim() || !form.room_type.trim()
        );

        if (blankInputs.length > 0) {
            showErrorInput.value = true;
            await nextTick();

            // Remove all previous borders
            inputs.forEach(input => input.classList.remove("error-input-border"));
            selects.forEach(select => select.classList.remove("error-input-border"));

            // Add red border only to blanks
            inputs.forEach(input => {
                if (!input.value.trim()) {
                    input.classList.add("error-input-border");
                }
            });

            // 🟥 NEW: Add red border to empty selects
            selects.forEach(select => {
                if (!select.value.trim()) {
                    select.classList.add("error-input-border");
                }
            });

            errorMessage.value = "Please fill in all room fields.";
            return;
        }

        if (roomHandler.value === "add") {
            // ADD MODE
            try {
                await axios.post("http://localhost:3000/add-room", {
                    rooms: roomForms.value
                });
            } catch (err) {
                const message = err.response?.data?.message || "";
                const duplicates = err.response?.data?.duplicates || [];

                duplicateCodes.value = duplicates.length
                    ? duplicates
                    : [...message.matchAll(/"([^"]+)"/gi)].map(m => m[1]);

                if (duplicateCodes.value.length > 0) {
                    showErrorInput.value = true;
                    await nextTick();

                    // Clear all previous red borders
                    inputs.forEach(input => input.classList.remove("error-input-border"));
                    selects.forEach(select => select.classList.remove("error-input-border"));

                    // Add red border for duplicates
                    duplicateCodes.value.forEach(code => {
                        const lowerCode = code.toLowerCase();
                        inputs.forEach(input => {
                            if (input.value.toLowerCase() === lowerCode) {
                                input.classList.add("error-input-border");
                            }
                        });
                    });

                    errorMessage.value = "Existing room code found.";
                }
                return;
            }
        } 
        else if (roomHandler.value === "update") {
            // UPDATE MODE
            try {
                await axios.put(`http://localhost:3000/update-room/${selectedRoom.value.room_id}`, {
                    room_code: roomForms.value[0].room_code,
                    room_type: roomForms.value[0].room_type
                });
            } catch (err) {
                const message = err.response?.data?.message || "";
                const duplicates = err.response?.data?.duplicates || [];

                duplicateCodes.value = duplicates.length
                    ? duplicates
                    : [...message.matchAll(/"([^"]+)"/gi)].map(m => m[1]);

                if (duplicateCodes.value.length > 0) {
                    showErrorInput.value = true;
                    await nextTick();

                    // Clear previous red borders
                    inputs.forEach(input => input.classList.remove("error-input-border"));
                    selects.forEach(select => select.classList.remove("error-input-border"));

                    // Highlight duplicates
                    duplicateCodes.value.forEach(code => {
                        const lowerCode = code.toLowerCase();
                        inputs.forEach(input => {
                            if (input.value.toLowerCase() === lowerCode) {
                                input.classList.add("error-input-border");
                            }
                        });
                    });
                    errorMessage.value = "Existing room code found.";
                    
                }
                return;
            }
        }

        // ✅ If no errors, refresh & close
        await fetchRooms();
        toggleRoomModal("cancel");
    };

    // 🔥 Watch for user typing to remove error borders dynamically
    watch(
        roomForms,
        async (newVal) => {
            if (!showErrorInput.value || duplicateCodes.value.length === 0) return;

            // 🧩 Scope inputs to modal just like in roomConfirm
            const modal = document.querySelector(".modal-content");
            const inputs = modal ? modal.querySelectorAll("input") : [];

            // Get all current input values in lowercase
            const currentCodes = newVal.map(f => f.room_code?.toLowerCase?.() || "");

            // Find duplicates that still exist
            const remainingDuplicates = duplicateCodes.value.filter(code =>
                currentCodes.includes(code.toLowerCase())
            );

            // ✅ If all duplicates are fixed
            if (remainingDuplicates.length === 0) {
                showErrorInput.value = false;
                duplicateCodes.value = [];

                await nextTick();
                inputs.forEach(el => el.classList.remove("error-input-border"));
                return;
            }

            // ✅ Keep only unresolved duplicates
            duplicateCodes.value = remainingDuplicates;

            // ✅ Re-apply error borders after DOM update (scoped to modal)
            await nextTick();

            inputs.forEach(input => {
                const value = input.value.toLowerCase();
                if (remainingDuplicates.some(code => code.toLowerCase() === value)) {
                    input.classList.add("error-input-border");
                } else {
                    input.classList.remove("error-input-border");
                }
            });
        },
        { deep: true }
    );

    function addRoomSection() {
        roomForms.value.push({
            room_code: "",
            room_type: "",
            capacity: ""
        })
    }

    function RemoveRoomSection() {
        if (roomForms.value.length > 1) {
            roomForms.value.pop()
        }
    }

    //////////////////////// Delete Room /////////////////////////
    const isVisibleDeleteModal = ref(false)
    const roomIdtoDelete = ref('')
    const roomNameToDelete = ref('')

    const deleteRoom = async (item) => {
        roomNameToDelete.value = item.room_code
        roomIdtoDelete.value = item.room_id
        toggleDeleteModal()
    }

    function toggleDeleteModal() {
        isVisibleDeleteModal.value = !isVisibleDeleteModal.value
    }

    async function confirmDelete() {
        try {
            await axios.delete(`http://localhost:3000/rooms/${roomIdtoDelete.value}`)
            items.value = items.value.filter(s => s.room_code !== roomIdtoDelete.value)
            fetchRooms()
        } catch (err) {
            console.error("Error deleting room:", err)
            alert("Failed to delete room.")
        }

        toggleDeleteModal()
    }
    /////////////////////////////// Navigation Functions ////////////////////////////
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
                <p>Your list of rooms.</p>
            </div>
        </header>

        <div id="masterdata-nav">
            <div @click="navBtn('departments')" class="navBtn">
                <p>Departments</p>
            </div>
            <div @click="navBtn('courses')" class="navBtn">
                <p>Courses</p>
            </div>
            <div @click="navBtn('subjects')" class="navBtn">
                <p>Subjects</p>
            </div>
            <div @click="navBtn('rooms')" class="navBtn active">
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
                <select v-model="sortValue" style="padding: 6px; padding-left: 15px; width: auto;">
                    <option value="">Sort by</option>
                    <option value="code-asc">Room Code (Ascending)</option>
                    <option value="code-desc">Room Code (Descending)</option>
                    <option value="type-asc">Room Type (A–Z)</option>
                    <option value="type-desc">Room Type (Z–A)</option>
                    <option value="capacity-asc">Capacity (Lowest–Highest)</option>
                    <option value="capacity-desc">Capacity (Highest–Lowest)</option>
                </select>

                <svg @click="toggleRoomModal('add')" style="margin-left: auto;" width="32" height="32" viewBox="0 0 33 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="33" height="32" rx="4" fill="#0785D4"/>
                    <path d="M17.0228 11.1006V20.7433M12.3677 15.9219H21.6779" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>

            </div>

            <table>
                <thead>
                    <tr>
                        <th>Room Code</th>
                        <th>Room Type</th>
                        <th style="width: 130px">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="item in sortedRooms" :key="item.id">
                    <td>{{ item.room_code }}</td>
                    <td>{{ item.room_type }}</td>
                    <td>
                        <div style="display: flex; flex-direction: row; gap: 5px; align-items: center; width: 130px;">
                            <button @click="deleteRoom(item)" class="outlineBtn" style="font-size: 1.2rem; padding: 3px 6px;">
                                <i class='bx bx-trash'></i>
                            </button>
                            <button @click="setSelectedRoom(item); toggleRoomModal('update')" style="font-size: 1.2rem; padding: 4px 12px;">
                                <i class='bx bx-edit-alt'></i>
                            </button>
                        </div>
                    </td>
                    </tr>
                </tbody>
            </table>
        </main>

        <!-- Add Room Modal -->
        <transition name="fade">
            <div v-show="isVisibleRoomModal" class="modal" @click.self="toggleRoomModal('cancel')">
               <div class="modal-content">
                    <h2 style="color: var(--color-primary); line-height: 0; margin: 12px;">{{ roomTitle }}</h2>
                        
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <div v-for="(form, index) in roomForms" :key="index" style="display: flex; gap: 14px; width: 100%;">
                            <div style="flex: 1;">
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Room Code</p>
                                <input v-model="form.room_code"/>
                            </div>

                            <div style="flex: 1;">
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Room Type</p>
                                <select v-model="form.room_type" style="width: 100%;">
                                <option value="Classroom">Classroom</option>
                                <option value="Computer Lab">Computer Lab</option>
                                <option value="Audio-Visual Room">Audio-Visual Room</option>
                                </select>
                            </div>
                        </div>

                        <label v-show="showErrorInput" style="color: red; font-size: 0.95rem;">{{ errorMessage }}</label>

                        <div v-show="isVisibleNewSectionBtn" style="display: flex; flex-direction: row; gap: 6px; width: fit-content;">
                            <svg @click="addRoomSection" style="margin-left: auto;" width="32" height="32" viewBox="0 0 33 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="33" height="32" rx="4" fill="#0785D4"/>
                                <path d="M17.0228 11.1006V20.7433M12.3677 15.9219H21.6779" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <svg @click="RemoveRoomSection" width="32" height="32" viewBox="0 0 33 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="33" height="32" rx="4" fill="#A83838"/>
                                <path d="M25 17C25 17.5333 24.7667 18 24.5 18H9.5C9.23333 18 9 17.5333 9 17V15C9 14.4667 9.23333 14 9.5 14H24.5C24.7667 14 25 14.4667 25 15V17Z" fill="white"/>
                            </svg>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto;">
                        <button @click="toggleRoomModal('cancel')" class="cancelBtn">Cancel</button>
                        <button @click="roomConfirm">{{ roomButton }}</button>
                    </div>
               </div>
            </div>
        </transition>

        <!-- Delete Room Modal -->
        <transition name="fade">
            <div v-show="isVisibleDeleteModal" class="modal" @click.self="toggleDeleteModal"> 
                <div class="delete-modal-content">
                    <div style="display: flex; flex-direction: column; width: 100%; gap: 24px;">
                        <div style="display: flex; flex-direction: row; gap: 10px; align-items: center; justify-content: start;">
                            <svg class="svg-icon" style="width: 2.5em; height: 2.5em; vertical-align: middle;fill: #b84343;overflow: hidden;" viewBox="188 129 648 784" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M779.3 228.2h-113v-35.4c0-34.9-28.4-63.3-63.3-63.3H425c-34.9 0-63.3 28.4-63.3 63.3v35.4h-113c-32.9 0-59.7 26.8-59.7 59.7v38.5c0 32.9 26.8 59.7 59.7 59.7h1.8v412.8c0 54.1 44 98.1 98.1 98.1h330.9c54.1 0 98.1-44 98.1-98.1V386.1h1.8c32.9 0 59.7-26.8 59.7-59.7v-38.5c-0.1-32.9-26.8-59.7-59.8-59.7z m-374.9-35.4c0-11.4 9.2-20.6 20.6-20.6h178c11.4 0 20.6 9.2 20.6 20.6v35.4H404.4v-35.4z m330.4 606c0 30.5-24.8 55.4-55.4 55.4H348.5c-30.5 0-55.4-24.8-55.4-55.4V386.1h441.7v412.7z m61.5-472.4c0 9.4-7.6 17-17 17H248.7c-9.4 0-17-7.6-17-17v-38.5c0-9.4 7.6-17 17-17h530.7c9.4 0 17 7.6 17 17v38.5z"  /><path d="M377.9 462.3h42.7v317.5h-42.7zM492.6 462.3h42.7v317.5h-42.7zM607.4 462.3h42.7v317.5h-42.7z"  /></svg>
                            <h3 style="line-height: 0; font-size: x-large; margin: 10px 0px;">Delete Confirmation</h3>
                        </div>
                        
                        <p>Are you sure you want to delete room <strong>{{ roomNameToDelete }}</strong>?</p>

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
        width: auto;
        min-width: 700px;
        max-width: 920px;
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
        margin-top: 20px;
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
        max-height: 90vh;
        align-items: center;
        width: auto;
        padding-top: 30px;
        padding-bottom: 30px;
        padding-left: 50px;
        padding-right: 50px;
        box-shadow: -2px 0 8px rgba(0,0,0,0.2);
        border-radius: 6px;
        gap: 45px;
        overflow-y: auto;
    }
</style>