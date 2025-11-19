<template>
  <div class="p5-starfield-wrapper">
    <!-- p5 will inject the <canvas> into this div -->
    <div ref="p5Container" class="p5-canvas-layer"></div>

    <!-- Your clickable content -->
    <div class="p5-content-layer">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import p5 from 'p5';

const p5Container = ref(null);
let p5Instance = null;

onMounted(() => {
  const sketch = (p) => {
    const STAR_COUNT = 400; // tweak for density
    let stars = [];
    let containerEl = null;

    class Star {
      constructor() {
        this.reset();
      }

      reset() {
        // Random point in a spherical shell
        const radius = p.random(300, 900);
        const theta = p.random(p.TWO_PI);
        const phi = p.random(-p.PI / 2, p.PI / 2);

        this.pos = p.createVector(
          radius * Math.cos(phi) * Math.cos(theta),
          radius * Math.sin(phi),
          radius * Math.cos(phi) * Math.sin(theta)
        );

        this.size = p.random(1, 2.2); // core size-ish
        this.baseBrightness = p.random(150, 255);
        this.phase = p.random(p.TWO_PI);
        this.speed = p.random(0.4, 1.4);
      }

      update(t) {
        const pulse = Math.sin(t * this.speed + this.phase) * 0.5 + 0.5; // 0..1
        this.brightness = this.baseBrightness * (0.6 + 0.4 * pulse);
      }
    }

    // Always use viewport size (body / window), not the container
    const getViewportSize = () => {
      return {
        w: window.innerWidth,
        h: window.innerHeight,
      };
    };

    p.setup = () => {
      containerEl = p5Container.value;
      const { w, h } = getViewportSize();
      const canvas = p.createCanvas(w, h, p.WEBGL);

      // Make the canvas full-screen & click-through
      const c = canvas.canvas;
      c.style.position = 'fixed';
      c.style.top = '0';
      c.style.left = '0';
      c.style.width = '100vw';
      c.style.height = '100vh';
      c.style.pointerEvents = 'none'; // <- click-through
      c.style.zIndex = '0'; // background layer, content will sit above with z=1

      // Generate stars
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push(new Star());
      }

      p.noStroke();
      const aspect = w / h;
      p.perspective((60 * Math.PI) / 180, aspect, 1, 5000);
    };

    p.windowResized = () => {
      const { w, h } = getViewportSize();
      p.resizeCanvas(w, h);
      const aspect = w / h;
      p.perspective((60 * Math.PI) / 180, aspect, 1, 5000);
    };

    p.draw = () => {
      const t = p.millis() / 1000;

      // Deep-ish background
      p.background(5, 5, 15); // can tint this later

      // Subtle camera motion
      p.push();
      p.rotateY(t * 0.08);
      p.rotateX(Math.sin(t * 0.15) * 0.2);

      // Slight additive feel for glow
      p.blendMode(p.ADD);

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.update(t);

        const b = star.brightness;
        // Cool-ish sexy tint: white core + magenta/blue influence
        const r = b;
        const g = b * 0.5;
        const bl = 255;

        p.push();
        p.translate(star.pos.x, star.pos.y, star.pos.z);

        // Emissive material gives that glowy vibe
        p.emissiveMaterial(r, g, bl);
        p.sphere(star.size, 6, 6); // low poly, tiny
        p.pop();
      }

      p.blendMode(p.BLEND);
      p.pop();
    };
  };

  p5Instance = new p5(sketch, p5Container.value);
});

onBeforeUnmount(() => {
  if (p5Instance) {
    p5Instance.remove();
    p5Instance = null;
  }
});
</script>

<style scoped>
.p5-starfield-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

/* p5 injects canvas here; the canvas itself is fixed fullscreen */
.p5-canvas-layer {
  position: relative;
  z-index: 0;
}

/* Your app on top, fully interactive */
.p5-content-layer {
  position: relative;
  z-index: 1;
}
</style>
