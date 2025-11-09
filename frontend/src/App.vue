<template>
  <div id="app">
    <router-view />
    <ScheduleExport/>
    <TeacherScheduleExport/>
  </div>
</template>


<script setup>
import ScheduleExport from './components/schedule_export/ScheduleExport.vue'
import TeacherScheduleExport from './components/schedule_export/TeacherScheduleExport.vue'
</script>

<style>

</style>
