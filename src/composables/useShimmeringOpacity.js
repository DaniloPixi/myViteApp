import { ref, onMounted, onUnmounted } from 'vue';

export function useShimmeringOpacity() {
  const opacity1 = ref(0.8);
  const opacity2 = ref(0.8);
  const size1 = ref(150);
  const size2 = ref(150);
  let intervalId = null;

  const createNoiseGenerator = (initialValue, min, max, step) => {
    let value = initialValue;
    return () => {
      const direction = Math.random() > 0.5 ? 1 : -1;
      value += direction * Math.random() * step;
      if (value > max) value = max;
      if (value < min) value = min;
      return value;
    };
  };

  const generateOpacity1 = createNoiseGenerator(0.8, 0.3, 1.0, 0.15);
  const generateOpacity2 = createNoiseGenerator(0.8, 0.3, 1.0, 0.35);
  const generateSize1 = createNoiseGenerator(150, 100, 200, 1);
  const generateSize2 = createNoiseGenerator(150, 100, 200, 1.5);

  onMounted(() => {
    intervalId = setInterval(() => {
      opacity1.value = generateOpacity1();
      opacity2.value = generateOpacity2();
      size1.value = generateSize1();
      size2.value = generateSize2();
    }, 50);
  });

  onUnmounted(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  return {
    opacity1,
    opacity2,
    size1,
    size2,
  };
}
