<template>
  <div class="login-container">
    <div class="login-card">
      <h1>Login</h1>
      <form @submit.prevent="handleLogin">
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
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>
        <!-- Display the error message if it exists -->
        <p v-if="error" class="error-message">{{ error }}</p>
      </form>
      <p class="switch-form">
        Don't have an account? <a href="#" @click.prevent="switchToRegister">Register here</a>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { auth } from '../firebase';

const emit = defineEmits(['switch-form']);

const email = ref('');
const password = ref('');
const loading = ref(false); // Reactive flag for loading state
const error = ref('');     // Reactive string for error messages

const handleLogin = async () => {
  loading.value = true; // Set loading to true when the function starts
  error.value = '';     // Clear any previous errors

  try {
    await auth.signInWithEmailAndPassword(email.value, password.value);
    // On success, App.vue will handle the redirect. No need to set loading to false here.
  } catch (err) {
    console.error("Error during login:", err);
    // Prettify the error message for the user
    switch (err.code) {
      case 'auth/user-not-found':
        error.value = 'No account found with this email.';
        break;
      case 'auth/wrong-password':
        error.value = 'Incorrect password. Please try again.';
        break;
      default:
        error.value = 'An unexpected error occurred. Please try again.';
        break;
    }
    loading.value = false; // Set loading to false on failure
  }
};

const switchToRegister = () => {
  emit('switch-form', 'register');
};
</script>

<style scoped>
/* ... all other styles remain the same ... */
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}

.login-card {
  padding: 2.5em;
  border-radius: 12px;
  background-color: #1e1e1e; /* Updated background color for consistency */
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
  color: #ff6b6b; /* A standard error color */
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
