import { createApp } from 'vue';
import App from './App.vue';
import './firebase';

// Global styles consolidated here
import './styles/design-system-default.css';

// Import V-Calendar styles & plugin
import VCalendar from 'v-calendar';
import 'v-calendar/style.css';


const app = createApp(App);
app.use(VCalendar, {});
app.mount('#app');