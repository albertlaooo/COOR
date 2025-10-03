<script setup>
    import { ref, onMounted, computed } from "vue"
    import { useRouter } from 'vue-router'
    import axios from "axios";

    const router = useRouter()

    // DATA
    const roomForms = ref([
        { room_code: "", room_type: "", capacity: "" }
    ])

    const isVisibleRoomModal = ref(false)
    const isVisibleNewSectionBtn = ref(true)

    const searchQuery = ref("")

    const sortValue = ref("")
    const items = ref([]) // your rooms list

    const sortedRooms = computed(() => {
    let result = [...items.value]

    // 🔍 Filter first (search)
    if (searchQuery.value.trim() !== "") {
        const q = searchQuery.value.toLowerCase()
        result = result.filter(room =>
        room.room_code.toLowerCase().includes(q) ||
        room.room_type.toLowerCase().includes(q) ||
        String(room.capacity).toLowerCase().includes(q)
        )
    }

    // ↕️ Sorting
    if (sortValue.value === "code-asc") {
        result.sort((a, b) => a.room_code.localeCompare(b.room_code, undefined, { numeric: true }))
    } else if (sortValue.value === "code-desc") {
        result.sort((a, b) => b.room_code.localeCompare(a.room_code, undefined, { numeric: true }))
    } else if (sortValue.value === "type-asc") {
        result.sort((a, b) => a.room_type.localeCompare(b.room_type))
    } else if (sortValue.value === "type-desc") {
        result.sort((a, b) => b.room_type.localeCompare(a.room_type))
    } else if (sortValue.value === "capacity-asc") {
        result.sort((a, b) => Number(a.capacity) - Number(b.capacity))
    } else if (sortValue.value === "capacity-desc") {
        result.sort((a, b) => Number(b.capacity) - Number(a.capacity))
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
            setTimeout(() => resetInputs(), 100);

            isVisibleRoomModal.value = !isVisibleRoomModal.value
        }
    }

    function resetInputs(){
        roomTitle.value = ''
        roomButton.value = ''
        roomHandler.value = ''
        roomForms.value = [{ room_code: "", room_type: "", capacity: "" }]

        setTimeout(() => isVisibleNewSectionBtn.value = true, 100);
    }

    /////////////////////////////// FETCH ROOMS ////////////////////////////
    const fetchRooms = async () => {
    try {
        const res = await axios.get("http://localhost:3000/rooms")

        items.value = res.data.map(room => ({
            room_id: room.room_id,
            room_code: room.room_code,
            room_type: room.room_type,
            capacity: room.capacity
        }));

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

        if (roomHandler.value === "add") {
            try {
                await axios.post("http://localhost:3000/add-room", {
                    rooms: roomForms.value
                });

                alert("Rooms added successfully!")
                fetchRooms()
                setTimeout(() => resetInputs(), 100);
                isVisibleRoomModal.value = false

                } catch (error) {
                    console.error("Error:", error)
                    alert("Failed to add rooms.")
            }
        }

        else if(roomHandler.value === 'update'){
            try {
                const res = await axios.put(`http://localhost:3000/update-room/${selectedRoom.value.room_id}`, {
                    room_code: roomForms.value[0].room_code,
                    room_type: roomForms.value[0].room_type,
                    capacity: roomForms.value[0].capacity
                });

            console.log(res.data.message);
            alert("Room updated successfully!");
            
            fetchRooms();
            selectedRoom.value = null;
            toggleRoomModal('cancel');

            // Reset Inputs
            setTimeout(() => resetInputs(), 100);
            } catch (error) {
                console.error("Error:", error);
                alert("Failed to update room.");
            }
        }
    }

    function addRoomSection() {
        roomForms.value.push({
            room_code: "",
            room_type: "",
            capacity: ""
        })
    }

    //////////////////////// Delete Room /////////////////////////
    const deleteRoom = async (id) => {
        if (!confirm("Are you sure you want to delete this room?")) {
            return
        }

        try {
            await axios.delete(`http://localhost:3000/rooms/${id}`)
            items.value = items.value.filter(s => s.room_code !== id)
            alert("Deleted Successfully.")
            fetchRooms()
        } catch (err) {
            console.error("Error deleting room:", err)
            alert("Failed to delete room.")
        }
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
                        <th>Capacity</th>
                        <th style="width: 130px">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="item in sortedRooms" :key="item.id">
                    <td>{{ item.room_code }}</td>
                    <td>{{ item.room_type }}</td>
                    <td>{{ item.capacity }}</td>
                    <td>
                        <div style="display: flex; flex-direction: row; gap: 5px; align-items: center; width: 130px;">
                            <button @click="deleteRoom(item.room_id)" class="outlineBtn" style="font-size: 1.2rem; padding: 3px 6px;">
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
                        
                    <div>
                        <div v-for="(form, index) in roomForms" :key="index" style="display: flex; flex-direction: row; gap: 14px; width: 100%; margin-bottom: 12px;">
                            <div style="flex: 1;">
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Room Code</p>
                                <input v-model="form.room_code" />
                            </div>

                            <div style="flex: 1;">
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Room Type</p>
                                <select v-model="form.room_type" style="width: 100%;">
                                    <option value="Classroom">Classroom</option>
                                    <option value="Computer Lab">Computer Lab</option>
                                    <option value="Audio-Visual Room">Audio-Visual Room</option>
                                </select>
                            </div>

                            <div style="flex: 1;">
                                <p class="paragraph--black-bold" style="line-height: 1.8;">Capacity</p>
                                <input v-model="form.capacity" />
                            </div>
                        </div>

                        <button v-show="isVisibleNewSectionBtn" @click="addRoomSection">+ New Section</button>
                    </div>

                    <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto;">
                        <button @click="toggleRoomModal('cancel')" class="cancelBtn">Cancel</button>
                        <button @click="roomConfirm">{{ roomButton }}</button>
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
        width: 720px;
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