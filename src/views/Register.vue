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
        <button type="submit">Register</button>
      </form>
      <p class="switch-form">
        Already have an account? <a href="#" @click.prevent="switchToLogin">Login here</a>
      </p>
    </div>
  </div>
</template>

<script>
import { auth, createUserWithEmailAndPassword, updateProfile } from '../firebase';

export default {
  name: 'Register',
  data() {
    return {
      nickname: '',
      email: '',
      password: '',
    };
  },
  methods: {
    async handleRegister() {
      try {
        // 1. Create the user with email and password
        const userCredential = await createUserWithEmailAndPassword(auth, this.email, this.password);
        const user = userCredential.user;

        // 2. Update the user's profile with the nickname
        await updateProfile(user, { 
          displayName: this.nickname 
        });

        alert(`Successfully registered! Welcome, ${this.nickname}!`);

        // This component doesn't need to do anything else.
        // App.vue will detect the authentication state change and switch the view.

      } catch (error) {
        console.error("Error during registration:", error);
        alert(`Registration failed: ${error.message}`);
      }
    },
    switchToLogin() {
      this.$emit('switch-form', 'login');
    }
  }
};
</script>

<style scoped>
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
