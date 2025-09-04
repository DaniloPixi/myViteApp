
<template>
  <!-- ... (template remains the same) ... -->
  <div id="app" class="card">
    <header>
      <h1>Vue PWA Notifications</h1>
      <div v-if="user" class="user-info">
        <span>Welcome, {{ user.displayName || user.email }}</span>
        <button @click="logout" class="logout-button">Logout</button>
      </div>
    </header>
    
    <main>
      <!-- Authentication Forms -->
      <div v-if="!user">
        <div v-if="isRegistering">
          <h2>Register</h2>
          <form @submit.prevent="register" class="auth-form">
            <div class="form-group">
              <label for="nickname">Nickname</label>
              <input id="nickname" type="text" v-model="nickname" placeholder="Your Nickname" required />
            </div>
            <div class="form-group">
              <label for="email-register">Email</label>
              <input id="email-register" type="email" v-model="email" placeholder="Email" required />
            </div>
            <div class="form-group">
              <label for="password-register">Password</label>
              <input id="password-register" type="password" v-model="password" placeholder="Password" required />
            </div>
            <button type="submit">Register</button>
          </form>
        </div>
        <div v-else>
          <h2>Login</h2>
          <form @submit.prevent="login" class="auth-form">
            <div class="form-group">
              <label for="email-login">Email</label>
              <input id="email-login" type="email" v-model="email" placeholder="Email" required />
            </div>
            <div class="form-group">
              <label for="password-login">Password</label>
              <input id="password-login" type="password" v-model="password" placeholder="Password" required />
            </div>
            <button type="submit">Login</button>
          </form>
        </div>
        <p v-if="authError" class="error">{{ authError }}</p>
        <div class="switch-form">
          <a href="#" @click.prevent="isRegistering = !isRegistering">
            {{ isRegistering ? 'Already have an account? Login.' : "Don't have an account? Register." }}
          </a>
        </div>
      </div>
      
      <!-- Notification Controls -->
      <div v-if="user">
        <h2>Notifications</h2>
        <button @click="enableNotifications" :disabled="notificationPermission === 'granted'">
          {{ notificationPermission === 'granted' ? 'Notifications Enabled' : 'Enable Notifications' }}
        </button>
        <p v-if="notificationPermission === 'denied'" class="error">
          Notification permission has been denied. You may need to change this in your browser settings.
        </p>

        <button @click="sendTestNotificationToSelf" :disabled="!user">
            Send Notification to Myself
        </button>
      </div>

    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';
// Import the v8 compat services
import { auth, messaging } from './firebase';

const isRegistering = ref(false);
const nickname = ref('');
const email = ref('');
const password = ref('');
const authError = ref('');
const user = ref(null);
const notificationPermission = ref(Notification.permission);

// --- Core Notification Logic (v8 COMPAT SYNTAX) ---
async function registerDeviceForNotifications() {
  if (notificationPermission.value !== 'granted') {
    console.log('Cannot register device, permission not granted.');
    return;
  }
  if (!user.value) {
    console.log('Cannot register device, user not logged in.');
    return;
  }

  try {
    console.log('Attempting to get FCM token...');
    // Use the v8 compat getToken() method with the CORRECT VAPID KEY
    const currentToken = await messaging.getToken({ vapidKey: 'BPACu3jz1Y3_bB4VPwO96LkPua-bJKVXBOioaf75Gc7xQQ-aqZ04a0qBSbxuX6ZW6KcPB1Lcv68zGP5qrM2q9dU' });
    if (currentToken) {
      console.log('Token retrieved, sending to server...');
      await sendTokenToServer(currentToken);
    } else {
      console.log('No registration token available. It might be necessary to request permission again.');
    }
  } catch (error) {
    console.error('An error occurred while retrieving or sending the token:', error);
  }
}

// --- Authentication (v8 COMPAT SYNTAX) ---
auth.onAuthStateChanged((currentUser) => {
  user.value = currentUser;
  authError.value = '';
  if (currentUser) {
    console.log('User logged in, checking for notification permissions...');
    registerDeviceForNotifications();
  } else {
    nickname.value = '';
    email.value = '';
    password.value = '';
  }
});

const register = async () => {
  authError.value = '';
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email.value, password.value);
    await userCredential.user.updateProfile({ displayName: nickname.value });
    user.value = auth.currentUser;
  } catch (error) {
    authError.value = error.message;
  }
};

const login = async () => {
  authError.value = '';
  try {
    await auth.signInWithEmailAndPassword(email.value, password.value);
  } catch (error) {
    authError.value = error.message;
  }
};

const logout = () => {
  auth.signOut();
};

// --- Push Notifications (No changes needed here) ---
async function sendTokenToServer(token) {
  if (!user.value) {
      console.error("Cannot send token to server, user not logged in.");
      return;
  }

  try {
    // 1. Get the Firebase ID token for the current user.
    const idToken = await user.value.getIdToken();

    // 2. Send the request with the Authorization header.
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // --- ADDED: Securely identify the user ---
        'Authorization': `Bearer ${idToken}` 
      },
      body: JSON.stringify({ token: token }), // The body now only needs the FCM token
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.message || `Server responded with ${response.status}`);
    }

    const result = await response.json();
    console.log('Token successfully registered with the server:', result.message);

  } catch (error) {
    console.error('Error sending token to server:', error);
  }
}

async function enableNotifications() {
  console.log('Requesting notification permission from user...');
  // Notification.requestPermission() is a browser API, not Firebase
  const permission = await Notification.requestPermission();
  notificationPermission.value = permission;

  if (permission === 'granted') {
    console.log('Permission granted by user.');
    await registerDeviceForNotifications();
  }
}

async function sendTestNotificationToSelf() {
    if (!user.value) return;
    try {
        console.log('Sending notification request to server...');
        const response = await fetch('/api/send-to-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.value.uid,
                title: 'Test From Client',
                body: `Hello ${user.value.displayName || 'there'}, this is a test!`
            }),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(errorBody.error || `Server responded with status: ${response.status}`);
        }
        
        console.log('Notification request sent successfully!');

    } catch (error) {
        console.error('Error sending test notification:', error);
        // Optionally, inform the user that the request failed.
    }
}


// --- UPDATED: Listen for foreground messages ---
messaging.onMessage((payload) => {
  console.log('Foreground message received.', payload);

  // Handle both "notification" and "data" payloads to avoid crashes.
  const notificationTitle = payload.notification?.title || payload.data?.title;
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body,
    icon: '/pwa-192x192.png'
  };

  // Only show notification if there's a title.
  if (notificationTitle) {
      new Notification(notificationTitle, notificationOptions);
  } else {
      console.warn("Received foreground message without a title.", payload);
  }
});

</script>

<style>
/* ... (styles remain the same) ... */
#app {
  max-width: 500px;
  margin: 2rem auto;
  padding: 2em;
  border-radius: 12px;
  background-color: #242424;
}

header {
  margin-bottom: 2rem;
}

.user-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
}

.logout-button {
  background-color: #555;
}

.auth-form, .notification-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  text-align: left;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: rgba(255, 255, 255, 0.7);
}

input {
  width: 100%;
  padding: 0.8em 1em;
  border-radius: 8px;
  border: 1px solid #444;
  background-color: #1a1a1a;
  color: #fff;
  font-size: 1em;
  box-sizing: border-box;
}

button {
  width: 100%;
  padding: 0.8em 1.2em;
  border-radius: 8px;
  border: none;
  background-color: #42b883;
  color: white;
  font-size: 1.1em;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #368f6a;
}

button:disabled {
  background-color: #333;
  color: #777;
  cursor: not-allowed;
}

.error {
  color: #ff6b6b;
  margin-top: 1rem;
}

.switch-form {
  margin-top: 1.5rem;
}

.switch-form a {
  color: #42b883;
  text-decoration: none;
}
.switch-form a:hover {
  text-decoration: underline;
}
</style>
