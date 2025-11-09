import { createRouter, createWebHistory } from 'vue-router'

// Pages
import Login from '../views/Login.vue'
import Main from '../views/Main.vue'

// Nested tab components for Main
import Home from '../components/home/Home.vue'

// Masterlist
import Masterlist from '../components/masterlist/MasterList.vue'
import Teachers from '../components/masterlist/Teacher.vue'
import Sections from '../components/masterlist/Sections.vue'
import Departments from '../components/masterlist/Departments.vue'
import Courses from '../components/masterlist/Courses.vue'
import Subjects from '../components/masterlist/Subjects.vue'
import Rooms from '../components/masterlist/Rooms.vue'

// ClassScheduling
import ClassScheduling from '../components/class_scheduling/ClassScheduling.vue'
import WeekTable from '../components/class_scheduling/WeekTable.vue'

const routes = [
  { path: '/', name: 'Login', component: Login, meta: { title: 'COOR | Login' } },
  { 
    path: '/main',
    component: Main,
    meta: { requiresAuth: true },
    children: [
      { path: 'home', name: 'Home', component: Home, meta: { title: 'COOR | Home' } },

      // Masterlist parent route
      { 
        path: 'masterlist', 
        name: 'Masterlist', 
        component: Masterlist, 
        meta: { title: 'COOR | Masterlist' },
        children: [
          { 
            path: 'teachers', 
            name: 'Teachers', 
            component: Teachers, 
            meta: { title: 'COOR | Teachers' } 
          },
          { 
            path: 'sections', 
            name: 'Sections', 
            component: Sections, 
            meta: { title: 'COOR | Sections' } 
          },
          { 
            path: 'departments', 
            name: 'Departments', 
            component: Departments, 
            meta: { title: 'COOR | Departments' }
          },
          { 
            path: 'courses', 
            name: 'Courses', 
            component: Courses, 
            meta: { title: 'COOR | Courses' } 
          },
          { 
            path: 'subjects', 
            name: 'Subjects', 
            component: Subjects, 
            meta: { title: 'COOR | Subjects' } 
          },
          { 
            path: 'rooms', 
            name: 'Rooms', 
            component: Rooms, 
            meta: { title: 'COOR | Rooms' } 
          }
        ]
      },

      { 
        path: 'class-scheduling', 
        name: 'ClassScheduling', 
        component: ClassScheduling, meta: { title: 'COOR | Class Scheduling' },
        children: [
          { 
            path: 'week-table', 
            name: 'WeekTable', 
            component: WeekTable, 
            meta: { title: 'COOR | Week Table' } 
          }
        ]
      },
      
      { path: '', redirect: 'home' } // default tab
    ]
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title || 'COOR'
  const token = localStorage.getItem('token') // check token

  // check if any matched route requires auth
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  if (requiresAuth && !token) {
    next('/') // redirect to login
  } else {
    next()
  }
})

export default router
