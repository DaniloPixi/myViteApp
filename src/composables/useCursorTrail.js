import { onUnmounted } from 'vue';

// The two colors from the animated border's gradients (without alpha)
const BORDER_COLORS = [
  'rgb(214, 7, 197)', // Magenta
  'rgb(7, 197, 214)',  // Cyan
];

// Helper to generate a random number within a range
const random = (min, max) => Math.random() * (max - min) + min;

export function useCursorTrail(containerRef) {
  let canCreateTrail = true;
  let activeParticles = [];
  let lastX = null;
  let lastY = null;

  const handlePointerMove = (event) => {
    if (!canCreateTrail || !containerRef.value) return;

    canCreateTrail = false;
    setTimeout(() => {
      canCreateTrail = true;
    }, 15); // Create particles more frequently for a smoother line

    const rect = containerRef.value.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (lastX === null) {
      lastX = x;
      lastY = y;
      return;
    }

    const deltaX = x - lastX;
    const deltaY = y - lastY;
    
    if (Math.abs(deltaX) < 2 && Math.abs(deltaY) < 2) {
        return;
    }

    const baseAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    lastX = x;
    lastY = y;

    // --- Create a single, more controlled particle ---
    const particle = document.createElement('div');
    particle.classList.add('cursor-trail-particle');
    
    const color = BORDER_COLORS[Math.floor(Math.random() * BORDER_COLORS.length)];
    // Make particles shorter-lived and smaller for a more subtle effect
    const lifetime = random(300, 500); 
    const width = random(1, 2);     
    const height = random(10, 20);    
    // Drastically reduce angle deviation for a more cohesive line
    const angleDeviation = random(-4, 4); 
    
    const finalAngle = baseAngle + 90 + angleDeviation;

    particle.style.setProperty('--particle-color', color);
    particle.style.setProperty('--particle-width', `${width}px`);
    particle.style.setProperty('--particle-height', `${height}px`);
    particle.style.setProperty('--angle-deg', `${finalAngle}deg`);
    particle.style.setProperty('--particle-lifetime', `${lifetime / 1000}s`);

    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;

    containerRef.value.appendChild(particle);
    activeParticles.push(particle);

    setTimeout(() => {
        particle.remove();
        activeParticles = activeParticles.filter(p => p !== particle);
    }, lifetime);
  };

  onUnmounted(() => {
    activeParticles.forEach(p => p.remove());
  });

  return {
    handlePointerMove,
  };
}
