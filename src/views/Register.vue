<template>
  <div class="register-container">
    <div class="register-card">
      <h1>Register</h1>
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="nickname">Nickname</label>
          <input type="text" id="nickname" v-model="nickname" required />
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" v-model="email" required />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" v-model="password" required />
        </div>
        <!-- Bind the disabled state and change the text based on the loading flag -->
        <button type="submit" :disabled="loading">
          {{ loading ? 'Registering...' : 'Register' }}
        </button>
        <!-- Display the error message if it exists -->
        <p v-if="error" class="error-message">{{ error }}</p>
      </form>
      <p class="switch-form">
        Already have an account? <a href="#" @click.prevent="switchToLogin">Login here</a>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { auth } from '../firebase';

const emit = defineEmits(['switch-form']);

const nickname = ref('');
const email = ref('');
const password = ref('');
const loading = ref(false); // Reactive flag for loading state
const error = ref('');     // Reactive string for error messages

const handleRegister = async () => {
  loading.value = true;
  error.value = '';

  // --- VALIDATION ---
  if (!nickname.value.trim()) {
    error.value = 'Please enter a nickname.';
    loading.value = false;
    return;
  }

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email.value, password.value);
    await userCredential.user.updateProfile({ 
      displayName: nickname.value 
    });
    // On success, App.vue will handle the redirect. We don't need to set loading to false.
  } catch (err) {
    console.error("Error during registration:", err);
    // Prettify the error message
    switch (err.code) {
      case 'auth/email-already-in-use':
        error.value = 'This email address is already in use.';
        break;
      case 'auth/weak-password':
        error.value = 'The password is too weak. Please choose a stronger one.';
        break;
      case 'auth/invalid-display-name':
        error.value = 'The nickname is not valid. Please try another one.';
        break;
      default:
        error.value = 'An unexpected error occurred during registration.';
        break;
    }
    loading.value = false; // Set loading to false only on failure
  }
};

const switchToLogin = () => {
  emit('switch-form', 'login');
};
</script>

<style scoped>
/* ... all other styles remain the same ... */
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}

.register-card {
  padding: 2.5em;
  border-radius: 12px;
  background-color: #2f2f2f;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
  text-align: center;
}

h1 {
  color: #42b883;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
  text-align: left;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

input {
  width: 100%;
  padding: 0.8em 1em;
  border-radius: 8px;
  border: 1px solid #444;
  background-color: #1a1a1a;
  color: #fff;
  font-size: 1em;
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

/* Style for the error message */
.error-message {
  color: #ff6b6b;
  margin-top: 1.5rem;
  font-weight: 500;
}

button:disabled {
  background-color: #333;
  color: #777;
  cursor: not-allowed;
}

.switch-form {
  margin-top: 2rem;
  color: rgba(255, 255, 255, 0.6);
}

.switch-form a {
  color: #42b883;
  text-decoration: none;
  font-weight: 600;
}

.switch-form a:hover {
  text-decoration: underline;
}
</style>
