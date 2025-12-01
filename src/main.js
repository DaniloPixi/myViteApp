// src/main.js
import { createApp } from 'vue';
import App from './App.vue';
import './firebase'; // Import and initialize Firebase
import './style.css';  // Import global styles

// Import V-Calendar styles & plugin
import 'v-calendar/style.css';
import VCalendar from 'v-calendar';
import { forceReloadCalendarQuests } from './composables/useDailyQuests';
const app = createApp(App);

// Use the V-Calendar plugin
app.use(VCalendar, {});

app.mount('#app');

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const data = event.data;
      if (!data) return;
  
      if (data.type === 'questCompleted') {
        // Pull fresh quests for the calendar
        forceReloadCalendarQuests();
      }
    });
}