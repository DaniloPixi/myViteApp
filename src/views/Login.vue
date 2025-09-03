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
        <button type="submit">Login</button>
      </form>
      <p class="switch-form">
        Don't have an account? <a href="#" @click.prevent="switchToRegister">Register here</a>
      </p>
    </div>
  </div>
</template>

<script>
import { auth, signInWithEmailAndPassword } from '../firebase';

export default {
  name: 'Login',
  data() {
    return {
      email: '',
      password: '',
    };
  },
  methods: {
    async handleLogin() {
      try {
        await signInWithEmailAndPassword(auth, this.email, this.password);
        // App.vue will handle the redirect on successful login
        // because of the onAuthStateChanged listener.
      } catch (error) {
        console.error("Error during login:", error);
        alert(`Login failed: ${error.message}`);
      }
    },
    switchToRegister() {
      this.$emit('switch-form', 'register');
    }
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}

.login-card {
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
