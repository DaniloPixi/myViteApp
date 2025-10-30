<template>
  <div class="register-container">
    <div class="register-card">
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
        <button type="submit" :disabled="loading">
          {{ loading ? 'Registering...' : 'Register' }}
        </button>
        <p v-if="error" class="error-message">{{ error }}</p>
      </form>
      <p class="switch-form">
        You got one already baby <a href="#" @click.prevent="switchToLogin">Login here</a>
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
const loading = ref(false);
const error = ref('');

const handleRegister = async () => {
  loading.value = true;
  error.value = '';

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
  } catch (err) {
    console.error("Error during registration:", err);
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
    loading.value = false;
  }
};

const switchToLogin = () => {
  emit('switch-form', 'login');
};
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  padding: 2rem;
}

.register-card {
  padding: 2.5em;
  border-radius: 20px;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 3, 220, 0.2);
  box-shadow: 0 0 20px rgba(255, 3, 220, 0.5), inset 0 0 15px rgba(3, 220, 255, 0.4);
  width: 100%;
  max-width: 420px;
  text-align: center;
}

h1 {
  font-family: 'Great Vibes', cursive;
  color: magenta;
  font-size: 3.5rem;
  margin-bottom: 1.5rem;
  font-weight: normal;
}

.form-group {
  margin-bottom: 1.5rem;
  text-align: left;
}

label {
  display: block;
  margin-bottom: 0.75rem;
  color: turquoise;
  font-weight: 500;
  font-size: 1.1rem;
}

input {
  width: 100%;
  padding: 0.8em 1em;
  border-radius: 8px;
  border: 1px solid magenta;
  background-color: rgba(0,0,0,0.4);
  color: #fff;
  font-size: 1em;
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
}

input:focus {
  outline: none;
  border-color: turquoise;
  box-shadow: 0 0 15px rgba(3, 220, 255, 0.6);
}

button {
  width: 100%;
  border-radius: 30px;
  border: 1px solid magenta;
  background-color: transparent;
  color: magenta;
  font-family: 'Great Vibes', cursive;
  font-size: 2rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: inset 0 0 8px rgba(255, 0, 255, 0.5), 0 0 8px rgba(255, 0, 255, 0.5);
}

button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: inset 0 0 12px rgba(255, 0, 255, 0.8), 0 0 12px rgba(255, 0, 255, 0.8);
}

.error-message {
  color: #ff6b6b;
  margin-top: 1.5rem;
  font-weight: 500;
}

button:disabled {
  background: #555;
  cursor: not-allowed;
  opacity: 0.6;
}

.switch-form {
  font-family:'Great Vibes', cursive;
  font-weight: 800;
  font-size: 2rem;
  margin-top: 2rem;
  color: rgba(255, 255, 255, 0.7);
}

.switch-form a {
  color: turquoise;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.3s ease, text-shadow 0.3s ease;
}

.switch-form a:hover {
  color: magenta;
  text-shadow: 0 0 5px rgba(255, 3, 220, 0.7);
}
</style>
