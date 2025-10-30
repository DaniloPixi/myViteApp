<template>
  <div class="progress-container">
    <div class="progress-bar" :style="{ width: progress + '%' }"></div>
    <div class="progress-text">{{ progressTextMessage }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

const props = defineProps({
  startDate: {
    type: [String, Date],
    required: true,
  },
  endDate: {
    type: [String, Date],
    required: true,
  },
});

const now = ref(new Date());
let timer = null;

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date();
  }, 1000 * 60); // Update every minute
});

onUnmounted(() => {
  clearInterval(timer);
});

const progress = computed(() => {
  const start = new Date(props.startDate).getTime();
  const end = new Date(props.endDate).getTime();
  const currentTime = now.value.getTime();

  if (currentTime >= end) {
    return 100;
  }
  if (currentTime <= start) {
    return 0;
  }

  const totalDuration = end - start;
  const elapsedDuration = currentTime - start;

  return (elapsedDuration / totalDuration) * 100;
});

const progressTextMessage = computed(() => {
    const end = new Date(props.endDate).getTime();
    const currentTime = now.value.getTime();
    const difference = end - currentTime;
    const percentage = progress.value.toFixed(0);

    if (difference <= 0) {
        return `${percentage}% | Time's up!`;
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

    let timeLeftStr = 'Time left: ';
    if (days > 0) timeLeftStr += `${days}d `;
    if (hours > 0) timeLeftStr += `${hours}h `;
    if (minutes > 0) timeLeftStr += `${minutes}m`;

    return `${percentage}% | ${timeLeftStr.trim()}`;
});
</script>

<style scoped>
.progress-container {
  width: 100%;
  background-color: #0a0a0a00;
  border-radius: 7px;
  position: relative;
  height: 1.25rem;
  margin-top: 10px;
  border: 0.01px #f700c1;
  box-shadow: 0 0 8px rgba(5, 136, 243, 0.7);

}

.progress-bar {
  height: 100%;
  background: linear-gradient(to right, rgba(23, 231, 210, 0.39), rgba(255, 0, 255, 0.384));
  border-radius: 7px;
  transition: width 0.5s ease-in-out;
}

.progress-text {
    position: absolute;
    width: 100%;
    text-align: center;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 12px;
}
</style>
