// src/main.js
import { createApp } from 'vue';
import App from './App.vue';
import './firebase'; // Import and initialize Firebase
import './style.css';  // Import global styles

// Import V-Calendar styles & plugin
import 'v-calendar/style.css';
import VCalendar from 'v-calendar';

const app = createApp(App);

// Use the V-Calendar plugin
app.use(VCalendar, {});

app.mount('#app');
