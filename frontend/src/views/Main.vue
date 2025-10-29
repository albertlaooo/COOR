<script setup>
import { CanceledError } from 'axios'
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from "axios"

const router = useRouter()

// Sidebar
const sidebarBtnRotated = ref(false)
const settingsRotated = ref(false)
const sidebarCollapsed = ref(false)

const showErrorInput = ref(true)

const isCurrentPasswordOk = ref(true)
const isNewPasswordOk = ref(true)
const isConfirmNewPasswordOk = ref(true)

const changePasswordMessage = ref('')

const sidebarBtn = () => {
  sidebarBtnRotated.value = !sidebarBtnRotated.value
  sidebarCollapsed.value = !sidebarCollapsed.value
}

const settings = () => {
  settingsRotated.value = !settingsRotated.value
  isSettingsModalVisible.value = !isSettingsModalVisible.value
}

const tabs = [
  { name: 'Home', path: '/main/home' },
  { name: 'Masterlist', path: '/main/masterlist' },
  { name: 'Class Scheduling', path: '/main/class-scheduling' },
]

function logout() {
  // Save login
  localStorage.setItem('loggedIn', 'false');
  isSettingsModalVisible.value = false
  router.push('/')
}

// Navbar
const isSettingsModalVisible = ref(false)
const isChangePasswordModalVisible = ref(false)
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmNewPassword = ref(false)

const currentPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')

function changePasswordBtn() {
  toggleChangePasswordModal()
  isSettingsModalVisible.value = false
}

async function changePasswordConfirm() {
  // Reset validation flags
  showErrorInput.value = false;
  isCurrentPasswordOk.value = true;
  isNewPasswordOk.value = true;
  isConfirmNewPasswordOk.value = true;
  changePasswordMessage.value = '';

  // Validate empty fields
  let hasError = false;
  if (!currentPassword.value) {
    isCurrentPasswordOk.value = false;
    hasError = true;
  }
  if (!newPassword.value) {
    isNewPasswordOk.value = false;
    hasError = true;
  }
  if (!confirmNewPassword.value) {
    isConfirmNewPasswordOk.value = false;
    hasError = true;
  }
  if (hasError) {
    showErrorInput.value = true;
    changePasswordMessage.value = 'Please fill out all fields.'

    // animate red border
    showErrorInput.value = false
    setTimeout(() => { showErrorInput.value = true; }, 0);
    return; // Stop here if any field is empty
  }

  // Check if new password matches confirm password
  if (newPassword.value !== confirmNewPassword.value) {
    isNewPasswordOk.value = false;
    isConfirmNewPasswordOk.value = false;
    showErrorInput.value = true;
    changePasswordMessage.value = 'New password and confirmation do not match.'

    // animate red border
    showErrorInput.value = false
    setTimeout(() => { showErrorInput.value = true; }, 0);
    return; // Stop here if mismatch
  }

  // Call API to change password
  try {
    const response = await axios.post("http://localhost:3000/change-password", {
      oldPassword: currentPassword.value,
      newPassword: newPassword.value
    });

    if (response.data.success) {
      // Reset fields on success
      currentPassword.value = '';
      newPassword.value = '';
      confirmNewPassword.value = '';
      showErrorInput.value = false;
      toggleChangePasswordModal();
    } else {
      // Old password incorrect
      isCurrentPasswordOk.value = false;
      showErrorInput.value = true;

      // animate red border
      showErrorInput.value = false
      setTimeout(() => { showErrorInput.value = true; }, 0);
      changePasswordMessage.value = 'Current password is incorrect.'
    }
  } catch (error) {
    console.error("Error changing password:", error);
    changePasswordMessage.value = '⚠️ Server error. Please try again later.'
  }
}


function toggleChangePasswordModal(){
  isChangePasswordModalVisible.value = !isChangePasswordModalVisible.value

  setTimeout(() => {
    currentPassword.value = '';
    newPassword.value = '';
    confirmNewPassword.value = '';
  }, 100);
}

// Watch currentPassword input
watch(currentPassword, (newVal) => {
  isCurrentPasswordOk.value = newVal.length > 0
})

// Watch newPassword input
watch(newPassword, (newVal) => {
  isNewPasswordOk.value = newVal.length > 0
})

// Watch confirmNewPassword input
watch(confirmNewPassword, (newVal) => {
  isConfirmNewPasswordOk.value = newVal.length > 0
})
</script>

<template>
  <div class="main-layout">
    
    <!-- Sidebar -->
    <aside class="sidebar" :style="{ width: sidebarCollapsed ? '75px' : '220px', paddingLeft: sidebarCollapsed ? '0px' : '15px', transition: 'width 0.3s ease' }">

      <svg id="sidebar-btn" @click="sidebarBtn" :style="{ transform: sidebarBtnRotated ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }" width="30" height="30" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
        <circle cx="26" cy="26" r="26" fill="#000000"/>
        <path d="M30 16 L18 26 L30 36" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      
      <div style="display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 4px; margin-right: 15px; margin-top: 28px; margin-bottom: 20px;" :style="{ marginRight: sidebarCollapsed ? '0' : '15px'}">
        <img src="/public/logo.svg" alt="logo" style="width: 55px;" :style="{ width: sidebarCollapsed ? '35px' : '55px'}"/>
        <h1 v-show="!sidebarCollapsed" style="font-weight: 600; line-height: 0;">COOR</h1>
      </div>

      <router-link
        v-for="tab in tabs"
        :key="tab.path"
        :to="tab.path"
        class="tab-btn"
        active-class="active"
        style="display: flex; align-items: center; gap: 12px; padding-left: 18px;"
        :style="{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start', paddingLeft: sidebarCollapsed ? '0px' : '18px' }"
      >
      <!-- Home -->
      <svg
        v-if="tab.name === 'Home'"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5 21.9998H19C19.5304 21.9998 20.0391 21.7891 20.4142 21.414C20.7893 21.039 21 20.5303 21 19.9998V10.9998C21.0008 10.8682 20.9755 10.7377 20.9258 10.6159C20.876 10.4941 20.8027 10.3833 20.71 10.2898L12.71 2.28982C12.5226 2.10357 12.2692 1.99902 12.005 1.99902C11.7408 1.99902 11.4874 2.10357 11.3 2.28982L3.3 10.2898C3.20551 10.3824 3.13034 10.4929 3.07885 10.6148C3.02735 10.7366 3.00055 10.8675 3 10.9998V19.9998C3 20.5303 3.21071 21.039 3.58579 21.414C3.96086 21.7891 4.46957 21.9998 5 21.9998ZM10 19.9998V14.9998H14V19.9998H10ZM5 11.4098L12 4.40982L19 11.4098V19.9998H16V14.9998C16 14.4694 15.7893 13.9607 15.4142 13.5856C15.0391 13.2105 14.5304 12.9998 14 12.9998H10C9.46957 12.9998 8.96086 13.2105 8.58579 13.5856C8.21071 13.9607 8 14.4694 8 14.9998V19.9998H5V11.4098Z"
          fill="currentColor"
        />
      </svg>

      <!-- Masterlist -->
      <svg
        v-else-if="tab.name === 'Masterlist'"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M18 5.25C17.8011 5.25 17.6103 5.17098 17.4697 5.03033C17.329 4.88968 17.25 4.69891 17.25 4.5C17.25 4.30109 17.329 4.11032 17.4697 3.96967C17.6103 3.82902 17.8011 3.75 18 3.75H18.75C19.3467 3.75 19.919 3.98705 20.341 4.40901C20.7629 4.83097 21 5.40326 21 6V18.75C21 19.3467 20.7629 19.919 20.341 20.341C19.919 20.7629 19.3467 21 18.75 21H5.25C4.65326 21 4.08097 20.7629 3.65901 20.341C3.23705 19.919 3 19.3467 3 18.75V6C3 5.40326 3.23705 4.83097 3.65901 4.40901C4.08097 3.98705 4.65326 3.75 5.25 3.75H6C6.19891 3.75 6.38968 3.82902 6.53033 3.96967C6.67098 4.11032 6.75 4.30109 6.75 4.5C6.75 4.69891 6.67098 4.88968 6.53033 5.03033C6.38968 5.17098 6.19891 5.25 6 5.25H5.25C5.05109 5.25 4.86032 5.32902 4.71967 5.46967C4.57902 5.61032 4.5 5.80109 4.5 6V18.75C4.5 18.9489 4.57902 19.1397 4.71967 19.2803C4.86032 19.421 5.05109 19.5 5.25 19.5H18.75C18.9489 19.5 19.1397 19.421 19.2803 19.2803C19.421 19.1397 19.5 18.9489 19.5 18.75V6C19.5 5.80109 19.421 5.61032 19.2803 5.46967C19.1397 5.32902 18.9489 5.25 18.75 5.25H18Z"
          fill="currentColor"
        />
        <path
          d="M7.5 3C7.5 2.80109 7.57902 2.61032 7.71967 2.46967C7.86032 2.32902 8.05109 2.25 8.25 2.25C8.44891 2.25 8.63968 2.32902 8.78033 2.46967C8.92098 2.61032 9 2.80109 9 3V5.25C9 5.44891 8.92098 5.63968 8.78033 5.78033C8.63968 5.92098 8.44891 6 8.25 6C8.05109 6 7.86032 5.92098 7.71967 5.78033C7.57902 5.63968 7.5 5.44891 7.5 5.25V3ZM15 3C15 2.80109 15.079 2.61032 15.2197 2.46967C15.3603 2.32902 15.5511 2.25 15.75 2.25C15.9489 2.25 16.1397 2.32902 16.2803 2.46967C16.421 2.61032 16.5 2.80109 16.5 3V5.25C16.5 5.44891 16.421 5.63968 16.2803 5.78033C16.1397 5.92098 15.9489 6 15.75 6C15.5511 6 15.3603 5.92098 15.2197 5.78033C15.079 5.63968 15 5.44891 15 5.25V3ZM10.5 5.25C10.3011 5.25 10.1103 5.17098 9.96967 5.03033C9.82902 4.88968 9.75 4.69891 9.75 4.5C9.75 4.30109 9.82902 4.11032 9.96967 3.96967C10.1103 3.82902 10.3011 3.75 10.5 3.75H13.5C13.6989 3.75 13.8897 3.82902 14.0303 3.96967C14.171 4.11032 14.25 4.30109 14.25 4.5C14.25 4.69891 14.171 4.88968 14.0303 5.03033C13.8897 5.17098 13.6989 5.25 13.5 5.25H10.5ZM9 13.5C8.80109 13.5 8.61032 13.421 8.46967 13.2803C8.32902 13.1397 8.25 12.9489 8.25 12.75C8.25 12.5511 8.32902 12.3603 8.46967 12.2197C8.61032 12.079 8.80109 12 9 12H15C15.1989 12 15.3897 12.079 15.5303 12.2197C15.671 12.3603 15.75 12.5511 15.75 12.75C15.75 12.9489 15.671 13.1397 15.5303 13.2803C15.3897 13.421 15.1989 13.5 15 13.5H9ZM9 9.75C8.80109 9.75 8.61032 9.67098 8.46967 9.53033C8.32902 9.38968 8.25 9.19891 8.25 9C8.25 8.80109 8.32902 8.61032 8.46967 8.46967C8.61032 8.32902 8.80109 8.25 9 8.25H15C15.1989 8.25 15.3897 8.32902 15.5303 8.46967C15.671 8.61032 15.75 8.80109 15.75 9C15.75 9.19891 15.671 9.38968 15.5303 9.53033C15.3897 9.67098 15.1989 9.75 15 9.75H9ZM9 17.25C8.80109 17.25 8.61032 17.171 8.46967 17.0303C8.32902 16.8897 8.25 16.6989 8.25 16.5C8.25 16.3011 8.32902 16.1103 8.46967 15.9697C8.61032 15.829 8.80109 15.75 9 15.75H15C15.1989 15.75 15.3897 15.829 15.5303 15.9697C15.671 16.1103 15.75 16.3011 15.75 16.5C15.75 16.6989 15.671 16.8897 15.5303 17.0303C15.3897 17.171 15.1989 17.25 15 17.25H9Z"
          fill="currentColor"
        />
      </svg>

      <!-- Class Scheduling -->
      <svg
        v-else-if="tab.name === 'Class Scheduling'"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clip-path="url(#clip0_62_2814)">
          <path
            d="M12 22C6.5 22 2 17.5 2 12C2 6.5 6.5 2 12 2C17.5 2 22 6.5 22 12C22 17.5 17.5 22 12 22ZM12 3.66667C7.41667 3.66667 3.66667 7.41667 3.66667 12C3.66667 16.5833 7.41667 20.3333 12 20.3333C16.5833 20.3333 20.3333 16.5833 20.3333 12C20.3333 7.41667 16.5833 3.66667 12 3.66667Z"
            fill="currentColor"
          />
          <path
            d="M12 12.833C11.5 12.833 11.1666 12.4997 11.1666 11.9997V6.16634C11.1666 5.66634 11.5 5.33301 12 5.33301C12.5 5.33301 12.8333 5.66634 12.8333 6.16634V11.9997C12.8333 12.4997 12.5 12.833 12 12.833Z"
            fill="currentColor"
          />
          <path
            d="M15.3333 16.167C15.0833 16.167 14.9166 16.0837 14.75 15.917L11.4166 12.5837C11.0833 12.2503 11.0833 11.7503 11.4166 11.417C11.75 11.0837 12.25 11.0837 12.5833 11.417L15.9166 14.7503C16.25 15.0837 16.25 15.5837 15.9166 15.917C15.75 16.0837 15.5833 16.167 15.3333 16.167Z"
            fill="currentColor"
          />
        </g>
        <defs>
          <clipPath id="clip0_62_2814">
            <rect width="20" height="20" fill="white" transform="translate(2 2)" />
          </clipPath>
        </defs>
      </svg>

        <label style="font-weight: 400;" v-show="!sidebarCollapsed">{{ tab.name }}</label>
      </router-link>

      <div class="divider" style="margin-right: 15px; margin-top: auto;" :style="{ marginLeft: !sidebarCollapsed ? '0px' : '15px' }"></div>

      <div class="tab-btn" @click="logout" style="display: flex; align-items: center; gap: 12px; padding-left: 18px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 13V11H7V8L2 12L7 16V13H16Z" fill="#444141"/>
          <path d="M20 3H11C9.897 3 9 3.897 9 5V9H11V5H20V19H11V15H9V19C9 20.103 9.897 21 11 21H20C21.103 21 22 20.103 22 19V5C22 3.897 21.103 3 20 3Z" fill="#444141"/>
        </svg>

        <label style="font-weight: 400;" v-show="!sidebarCollapsed">Logout</label>
      </div>
    </aside>

    <div class="content-wrapper">

      <!-- Navbar -->
      <header class="navbar">
        
        <div class="navbar-elements">
          <svg class="svg-icon" style="width: 26px; height: 26px;vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M618.666667 874.666667a106.666667 106.666667 0 0 1-213.333334 0H85.333333c-36.650667 0-56.256-43.178667-32.106666-70.762667l107.136-122.453333C176.853333 662.613333 192 622.293333 192 597.269333V362.666667C192 185.941333 335.274667 42.666667 512 42.666667c176.725333 0 320 143.274667 320 320v234.602666c0 25.066667 15.146667 65.322667 31.637333 84.181334l107.136 122.453333C994.922667 831.488 975.317333 874.666667 938.666667 874.666667H618.666667z m180.757333-137.024C769.28 703.232 746.666667 643.008 746.666667 597.269333V362.666667c0-129.6-105.066667-234.666667-234.666667-234.666667s-234.666667 105.066667-234.666667 234.666667v234.602666c0 45.696-22.656 105.984-52.757333 140.373334L179.349333 789.333333h665.28l-45.226666-51.690666z"  /></svg>
          <svg @click="settings" :style="{ transform: settingsRotated ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.4s' }" width="30" height="30" viewBox="0 0 36 37" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4.02943 23.2874L6.95643 28.3511C7.15076 28.687 7.47052 28.9319 7.84541 29.0321C8.2203 29.1323 8.61962 29.0795 8.95558 28.8853L10.9986 27.7057C11.8475 28.3745 12.7856 28.9233 13.772 29.3331V31.6718C13.772 32.0599 13.9262 32.4322 14.2006 32.7066C14.4751 32.9811 14.8473 33.1353 15.2355 33.1353H21.0895C21.4776 33.1353 21.8499 32.9811 22.1243 32.7066C22.3988 32.4322 22.553 32.0599 22.553 31.6718V29.3331C23.5471 28.9192 24.4801 28.3717 25.3263 27.7057L27.3694 28.8853C28.0675 29.2877 28.966 29.0463 29.3685 28.3511L32.2955 23.2874C32.4881 22.9511 32.5401 22.5523 32.44 22.1778C32.34 21.8034 32.096 21.4836 31.7613 21.2882L29.7534 20.1277C29.9103 19.0483 29.9093 17.9519 29.7505 16.8728L31.7584 15.7123C32.455 15.3098 32.6965 14.4098 32.2926 13.7131L29.3656 8.64942C29.1713 8.31354 28.8515 8.06859 28.4766 7.96842C28.1017 7.86825 27.7024 7.92106 27.3664 8.11524L25.3234 9.29483C24.4783 8.62802 23.5456 8.08044 22.5515 7.66741V5.32874C22.5515 4.94059 22.3973 4.56834 22.1229 4.29388C21.8484 4.01942 21.4762 3.86523 21.088 3.86523H15.234C14.8459 3.86523 14.4736 4.01942 14.1992 4.29388C13.9247 4.56834 13.7705 4.94059 13.7705 5.32874V7.66741C12.7764 8.08131 11.8433 8.62882 10.9972 9.29483L8.95558 8.11524C8.78928 8.0189 8.60561 7.95629 8.41509 7.93099C8.22457 7.9057 8.03093 7.91822 7.84525 7.96783C7.65957 8.01745 7.4855 8.10318 7.33298 8.22014C7.18047 8.33709 7.05251 8.48297 6.95643 8.64942L4.02943 13.7131C3.83682 14.0495 3.78488 14.4483 3.88493 14.8227C3.98498 15.1971 4.22891 15.5169 4.56361 15.7123L6.57153 16.8728C6.41367 17.952 6.41367 19.0485 6.57153 20.1277L4.56361 21.2882C3.86698 21.6907 3.6255 22.5907 4.02943 23.2874ZM18.161 12.6462C21.3895 12.6462 24.015 15.2718 24.015 18.5003C24.015 21.7287 21.3895 24.3543 18.161 24.3543C14.9325 24.3543 12.307 21.7287 12.307 18.5003C12.307 15.2718 14.9325 12.6462 18.161 12.6462Z" fill="black"/>
          </svg>
        </div>

        <!-- Settings Modal -->
        <transition name="slide-down">
          <div v-show="isSettingsModalVisible" class="settings-modal">
            <div @click="changePasswordBtn()" class="settings-btn-modal">
              <label>Change Password</label>
            </div>
            <div class="divider" style="margin: 0 12px; margin-top: 4px; margin-bottom: 4px;"></div>
            <div @click="logout()" class="settings-btn-modal">
              <label>Log Out</label>
            </div>
          </div>
        </transition>

          <!-- Change Password Modal -->
        <transition name="fade">
          <div v-show="isChangePasswordModalVisible" class="modal" @click.self="toggleChangePasswordModal()">
            <div class="change-password-modal-content">
                <h2 style="color: var(--color-primary); line-height: 0; margin: 12px;">Change Password</h2>

                <div style="display: flex; flex-direction: column; gap: 14px; width: 100%;">
                      <div>
                        <p class="paragraph--black-bold" style="line-height: 1.8;">Current password</p>
                        <div style="position: relative;">
                          <input 
                            :type="showCurrentPassword ? 'text' : 'password'" 
                            v-model="currentPassword" 
                            style="width: 100%; height: 45px; padding-right: 40px; box-sizing: border-box;"
                            :class="{ 'error-input-border': showErrorInput && !isCurrentPasswordOk }"
                          />
                          
                          <!-- Password Toggle -->
                          <svg 
                            @click="showCurrentPassword = !showCurrentPassword" 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 1030 1030" 
                            :style="{
                              position: 'absolute',
                              top: '50%',
                              right: '10px',
                              transform: 'translateY(-50%)',
                              width: '32px',
                              height: '32px',
                              cursor: 'pointer',
                              fill: showCurrentPassword ? 'var(--color-primary)' : 'black'
                            }"
                          >
                            <path d="M512 384.128a128 128 0 1 0 0 256 128 128 0 0 0 0-256m0 341.333333a213.333333 213.333333 0 1 1 0-426.666666 213.333333 213.333333 0 0 1 0 426.666666m0-533.333333a504.746667 504.746667 0 0 0-469.333333 320 504.32 504.32 0 0 0 938.666666 0 504.746667 504.746667 0 0 0-469.333333-320z"/>
                          </svg>
                      </div>
                    </div>

                    <div>
                        <p class="paragraph--black-bold" style="line-height: 1.8;">New password</p>
                        <div style="position: relative;">
                          <input 
                            :type="showNewPassword ? 'text' : 'password'" 
                            v-model="newPassword" 
                            style="width: 100%; height: 45px; padding-right: 40px; box-sizing: border-box;"
                            :class="{ 'error-input-border': showErrorInput && !isNewPasswordOk }"
                          />
                          
                          <!-- Password Toggle -->
                          <svg 
                            @click="showNewPassword = !showNewPassword" 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 1030 1030" 
                            :style="{
                              position: 'absolute',
                              top: '50%',
                              right: '10px',
                              transform: 'translateY(-50%)',
                              width: '32px',
                              height: '32px',
                              cursor: 'pointer',
                              fill: showNewPassword ? 'var(--color-primary)' : 'black'
                            }"
                          >
                            <path d="M512 384.128a128 128 0 1 0 0 256 128 128 0 0 0 0-256m0 341.333333a213.333333 213.333333 0 1 1 0-426.666666 213.333333 213.333333 0 0 1 0 426.666666m0-533.333333a504.746667 504.746667 0 0 0-469.333333 320 504.32 504.32 0 0 0 938.666666 0 504.746667 504.746667 0 0 0-469.333333-320z"/>
                          </svg>
                      </div>
                    </div>

                    <div>
                        <p class="paragraph--black-bold" style="line-height: 1.8;">Confirm New password</p>
                        <div style="position: relative;">
                          <input 
                            :type="showConfirmNewPassword ? 'text' : 'password'" 
                            v-model="confirmNewPassword" 
                            style="width: 100%; height: 45px; padding-right: 40px; box-sizing: border-box;"
                            :class="{ 'error-input-border': showErrorInput && !isConfirmNewPasswordOk }"
                          />
                          
                          <!-- Password Toggle -->
                          <svg 
                            @click="showConfirmNewPassword = !showConfirmNewPassword" 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 1030 1030" 
                            :style="{
                              position: 'absolute',
                              top: '50%',
                              right: '10px',
                              transform: 'translateY(-50%)',
                              width: '32px',
                              height: '32px',
                              cursor: 'pointer',
                              fill: showConfirmNewPassword ? 'var(--color-primary)' : 'black'
                            }"
                          >
                            <path d="M512 384.128a128 128 0 1 0 0 256 128 128 0 0 0 0-256m0 341.333333a213.333333 213.333333 0 1 1 0-426.666666 213.333333 213.333333 0 0 1 0 426.666666m0-533.333333a504.746667 504.746667 0 0 0-469.333333 320 504.32 504.32 0 0 0 938.666666 0 504.746667 504.746667 0 0 0-469.333333-320z"/>
                          </svg>
                      </div>
                    </div>
                    <div>
                      
                    <label style="color: red; font-size: 0.95rem;">{{ changePasswordMessage }}</label>
                    </div>
                </div>

                

                <div style="display: flex; flex-direction: row; gap: 6px; margin-left: auto;">
                    <button @click="toggleChangePasswordModal()" class="cancelBtn">Cancel</button>
                    <button @click="changePasswordConfirm()">Confirm</button>
                </div>
            </div>
          </div>
        </transition>



      </header>

      <!-- Main Content -->
      <main class="main-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.main-layout {
  display: flex;
  flex-direction: row;
  height: 100vh;
  width: 100vw;
}

/* Navbar */
.navbar {
  display: flex;
  height: 52px;
  justify-content: space-between;
  align-items: center;
  padding: 10px 30px;
  background-color: white;
  border-bottom: 1px solid var(--color-border);
  color: black;
}

.navbar-elements {
  display: flex; 
  flex-direction: row; 
  align-items: center; 
  margin-left: auto; gap: 10px;
  transition: all 0.2s;
}

.settings-modal {
  position: absolute; 
  top: 60px; 
  right: 30px; 
  display: flex; 
  flex-direction: column; 
  width: 200px; 
  padding: 4px 0;
  background-color: white; 
  border: 1px solid var(--color-border); 
  border-radius: 8px;
  overflow: hidden;
}

.settings-btn-modal {
  flex: 1; 
  width: 100%; 
  padding: 8px 25px;
}

.settings-btn-modal:hover {
  background-color: var(--color-lightgray-hover);
  transition: background-color 0.1s ease-in-out;
}

.change-password-modal-content {
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

/* Wrapper for sidebar + content */
.content-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
}

/* Sidebar */
.sidebar {
  position: relative;
  width: 220px;
  background-color: white;
  padding-top: 15px;
  padding-bottom: 10px;
  padding-left: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-right: 1px solid var(--color-border);
  user-select: none;
}

#sidebar-btn {
  position: absolute;
  top: 20px;
  right: -15px;

}

.tab-btn {
  text-decoration: none;
  color: black;
  padding: 10px;
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
}

.tab-btn.active,
.tab-btn.active:hover {
  background-color: var(--color-secondary);
  border-right: 4px solid var(--color-primary);
  color: var(--color-primary);
  font-weight: bold;
}

.tab-btn:not(.active):hover {
  background-color: var(--color-lightgray-hover);
  transition: background-color 0.1s ease-in-out;
}

/* Main content */
.main-content {
  flex: 1;
  background-color: var(--color-main-background);
  padding-top: 35px;
  padding-bottom: 35px;
  padding-left: 55px;
  padding-right: 55px;
  overflow-y: auto;
}
</style>
