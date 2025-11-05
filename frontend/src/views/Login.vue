<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from "axios";

const router = useRouter()

const username = ref("")
const password = ref("")
const rememberMe = ref(false)
const isLoggingIn = ref(false)
const signinBtnText = ref('Sign In')
const loginStatus = ref('')
const showPassword = ref(false)

const attempts = ref(0)
const maxAttempts = 3
const cooldown = ref(0)
let cooldownInterval = null

// --- Restore cooldown if active ---
onMounted(() => {
  const loggedIn = localStorage.getItem('loggedIn') === 'true'
  const rememberMeStored = localStorage.getItem('rememberMe') === 'true'

  if (loggedIn) {
    router.push('/main/home')
  } else if (rememberMeStored) {
    rememberMe.value = true
    username.value = localStorage.getItem('username')
    password.value = localStorage.getItem('password')
  }

  // Check for saved cooldown timestamp
  const savedCooldownEnd = localStorage.getItem('cooldownEnd')
  const now = Date.now()
  if (savedCooldownEnd && now < Number(savedCooldownEnd)) {
    const remaining = Math.ceil((Number(savedCooldownEnd) - now) / 1000)
    startCooldown(remaining)
  }
})

const startCooldown = (seconds = 30) => {
  cooldown.value = seconds
  const endTime = Date.now() + seconds * 1000
  localStorage.setItem('cooldownEnd', endTime.toString())

  signinBtnText.value = `Try again in ${cooldown.value}s`
  isLoggingIn.value = true

  cooldownInterval = setInterval(() => {
    cooldown.value--
    signinBtnText.value = `Try again in ${cooldown.value}s`
    loginStatus.value = `Too many wrong attempts. Please wait ${cooldown.value} seconds.`

    if (cooldown.value <= 0) {
      clearInterval(cooldownInterval)
      localStorage.removeItem('cooldownEnd')
      isLoggingIn.value = false
      signinBtnText.value = 'Sign In'
      attempts.value = 0
      loginStatus.value = ''
    }
  }, 1000)
}

const signinBtn = async () => {
  // prevent login during cooldown
  if (cooldown.value > 0) return

  isLoggingIn.value = true
  signinBtnText.value = 'Logging In...'
  loginStatus.value = ''

  try {
    const res = await axios.post("http://localhost:3000/login", {
      username: username.value,
      password: password.value
    });

    setTimeout(() => {
      if (res.data.success) {
        signinBtnText.value = 'Log in successfully.'

        // Save login
        localStorage.setItem('loggedIn', 'true')

        if (rememberMe.value) {
          localStorage.setItem('rememberMe', 'true')
          localStorage.setItem('username', username.value)
          localStorage.setItem('password', password.value)
        } else {
          localStorage.setItem('rememberMe', 'false')
          localStorage.setItem('username', '')
          localStorage.setItem('password', '')
        }

        setTimeout(() => {
          router.push('/main/home')
          isLoggingIn.value = false
          signinBtnText.value = 'Sign In'
        }, 1000)

      } else {
        attempts.value++
        loginStatus.value = `Wrong email or password. ${maxAttempts - attempts.value} attempt${maxAttempts - attempts.value > 1 ? 's' : ''} remaining.`

        if (attempts.value >= maxAttempts) {
          loginStatus.value = `Too many wrong attempts. Please wait 30 seconds.`
          startCooldown()
        } else {
          isLoggingIn.value = false
          signinBtnText.value = 'Sign In'
        }
      }
    }, 1000)
  } catch (err) {
    loginStatus.value = "⚠️ Server error."
    console.error(err)
    isLoggingIn.value = false
    signinBtnText.value = 'Sign In'
  }
}
</script>

<template>
  <div id="container">
    <transition name="fade-up" appear>
      <div id="signin-card">
        <img src="../assets/login/lccn_logo.webp" id="LCCN-logo" style="width: 60px; height: auto;"/>
        <label style="font-family: 'Satisfy', cursive; font-size: 1.8rem; margin-top: 4px; margin-bottom: 18px;">La Consolacion College</label>

        <div id="username">
          <div style="display: flex; flex-direction: row; gap: 1px;">          
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.3333 3.66675H3.66668C3.18045 3.66675 2.71413 3.8599 2.37031 4.20372C2.0265 4.54754 1.83334 5.01385 1.83334 5.50008V16.5001C1.83334 16.9863 2.0265 17.4526 2.37031 17.7964C2.71413 18.1403 3.18045 18.3334 3.66668 18.3334H18.3333C18.8196 18.3334 19.2859 18.1403 19.6297 17.7964C19.9735 17.4526 20.1667 16.9863 20.1667 16.5001V5.50008C20.1667 5.01385 19.9735 4.54754 19.6297 4.20372C19.2859 3.8599 18.8196 3.66675 18.3333 3.66675ZM18.3333 7.97508L11 12.8646L3.66668 7.97508V5.77233L11 10.6609L18.3333 5.77233V7.97508Z" fill="black"/>
            </svg>
            <label>Username</label>
          </div>

          <input type="text" v-model="username" placeholder="Enter your username"></input>
        </div>

        <div id="password">
          <div style="display: flex; flex-direction: row; gap: 1px;">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.3333 10.9999C18.3333 9.98884 17.5111 9.16659 16.5 9.16659H15.5833V6.41659C15.5833 3.88934 13.5272 1.83325 11 1.83325C8.47274 1.83325 6.41666 3.88934 6.41666 6.41659V9.16659H5.49999C4.48891 9.16659 3.66666 9.98884 3.66666 10.9999V18.3333C3.66666 19.3443 4.48891 20.1666 5.49999 20.1666H16.5C17.5111 20.1666 18.3333 19.3443 18.3333 18.3333V10.9999ZM8.24999 6.41659C8.24999 4.90042 9.48382 3.66659 11 3.66659C12.5162 3.66659 13.75 4.90042 13.75 6.41659V9.16659H8.24999V6.41659Z" fill="black"/>
            </svg>
            <label>Password</label>
          </div>

          <div style="position: relative;">
            <input 
              :type="showPassword ? 'text' : 'password'" 
              v-model="password" 
              placeholder="Enter your password"
              style="width: 100%; height: 45px; padding-right: 40px; box-sizing: border-box;"
            />
            
            <!-- Password Toggle -->
            <svg 
              @click="showPassword = !showPassword" 
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
                fill: showPassword ? 'var(--color-primary)' : 'black'
              }"
            >
              <path d="M512 384.128a128 128 0 1 0 0 256 128 128 0 0 0 0-256m0 341.333333a213.333333 213.333333 0 1 1 0-426.666666 213.333333 213.333333 0 0 1 0 426.666666m0-533.333333a504.746667 504.746667 0 0 0-469.333333 320 504.32 504.32 0 0 0 938.666666 0 504.746667 504.746667 0 0 0-469.333333-320z"/>
            </svg>
          </div>
          <label style="color: red; font-size: 0.95rem;">{{ loginStatus }}</label>
        </div>

        <!-- Remember Me Checkbox -->
        <div style="display: flex; align-items: center; gap: 6px; user-select: none; margin-right: auto; margin-bottom: 22px;">
            <input type="checkbox" id="rememberMe" v-model="rememberMe">
            <label for="rememberMe">Remember Me</label>
        </div>

        <button id="signin-btn" @click="signinBtn" :disabled="isLoggingIn">{{ signinBtnText }}</button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
  #container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
  background-image: url("../assets/login/background.webp");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  }

  #signin-card {
    display: flex;
    flex-direction: column;
    height: auto;
    width: 450px;
    align-items: center;
    justify-content: center;
    padding-top: 55px;
    padding-bottom: 55px;
    padding-left: 40px;
    padding-right: 40px;

    background-color: white;
    border-radius: 8px;
  }

  #username, #password {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 5px;
    margin-bottom: 18px;
  }

  #signin-btn {
    background-color: var(--color-primary); 
    width: 100%;
    height: 45px;
    color: white;
    border: none; 
    border-radius: 5px;
    cursor: pointer; 
    font-size: 16px; 
    transition: 0.2s ease-in-out;
  }

button:hover {
    background-color: var(--color-primary-hover);
    transform: scale(1.02);
}

  
</style>
