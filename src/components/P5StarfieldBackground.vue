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

    // Shooting star state
    let shootingStars = [];
    let nextShootingStarTime = 0; // seconds

    class Star {
      constructor() {
        this.noiseSeed = p.random(1000);
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
        this.speed = p.random(0.1, 0.6); // how fast noise evolves
      }

      update(t) {
        // Perlin noise in [0, 1]
        const n = p.noise(this.noiseSeed + t * this.speed);

        // Smoothstep to avoid jitter
        const eased = n * n * (3 - 2 * n);

        // Map to ~0.3..1 of base brightness
        const factor = 0.3 + 0.7 * eased;
        this.brightness = this.baseBrightness * factor;
      }
    }

    // Helper for vector lerp without creating p5.Vector instances
    const lerpVec = (a, b, t) => {
      return {
        x: p.lerp(a.x, b.x, t),
        y: p.lerp(a.y, b.y, t),
        z: p.lerp(a.z, b.z, t),
      };
    };

    class ShootingStar {
      constructor(start, end, color, birthTime) {
        this.start = start;
        this.end = end;
        this.color = color;
        this.birthTime = birthTime; // seconds
        this.duration = p.random(0.6, 1.2); // how long the streak lasts
        this.active = true;
        this.t = 0;
      }

      update(now) {
        const raw = (now - this.birthTime) / this.duration;
        if (raw >= 1) {
          this.active = false;
          return;
        }
        // Smoothstep for acceleration/deceleration
        this.t = raw * raw * (3 - 2 * raw);
      }

      draw() {
        if (!this.active) return;
        const t = this.t;

        const headPos = lerpVec(this.start, this.end, t);

        // Trail: multiple segments behind the head
        const segments = 50;
        for (let i = 0; i < segments; i++) {
          const trailT = t - i / (segments * 2); // spaced behind
          if (trailT < 0) continue;

          const pos = lerpVec(this.start, this.end, trailT);

          const falloff = 1 - i / segments;
          const ageFade = 1 - t * 0.6;
          const intensity = Math.max(0, falloff * ageFade);

          const r = this.color.r * intensity;
          const g = this.color.g * intensity;
          const b = this.color.b * intensity;

          const radius = 1.1 + 1.4 * falloff; // bigger near the head

          p.push();
          p.translate(pos.x, pos.y, pos.z);
          p.emissiveMaterial(r, g, b);
          p.sphere(radius, 6, 6);
          p.pop();
        }

        // Bright head
        const rHead = this.color.r;
        const gHead = this.color.g;
        const bHead = this.color.b;

        p.push();
        p.translate(headPos.x, headPos.y, headPos.z);
        p.emissiveMaterial(rHead, gHead, bHead);
        p.sphere(2.4, 8, 8);
        p.pop();
      }
    }

    // Always use viewport size (body / window), not the container
    const getViewportSize = () => {
      return {
        w: window.innerWidth,
        h: window.innerHeight,
      };
    };

    const scheduleNextShootingStar = (nowSeconds) => {
      nextShootingStarTime = nowSeconds + p.random(1, 10); // 1–10s
    };

    const spawnShootingStar = (nowSeconds) => {
      // Random depth: a bit in front of the star sphere, but not too close
      const z = p.random(-900, -300);

      // Base extents in world space
      const xMax = 800;
      const yMax = 300;

      // Pick a direction pattern
      const pattern = Math.floor(p.random(6));
      let start, end;

      switch (pattern) {
        // left -> right, mid-height
        case 0: {
          const y = p.random(-yMax * 0.5, yMax * 0.5);
          start = p.createVector(-xMax, y, z);
          end = p.createVector(xMax, y, z);
          break;
        }
        // right -> left, mid-height
        case 1: {
          const y = p.random(-yMax * 0.5, yMax * 0.5);
          start = p.createVector(xMax, y, z);
          end = p.createVector(-xMax, y, z);
          break;
        }
        // left-bottom -> right-top
        case 2: {
          start = p.createVector(-xMax * 0.8, yMax, z);
          end = p.createVector(xMax * 0.8, -yMax, z);
          break;
        }
        // right-top -> left-bottom
        case 3: {
          start = p.createVector(xMax * 0.8, -yMax, z);
          end = p.createVector(-xMax * 0.8, yMax, z);
          break;
        }
        // left-mid -> right-bottom
        case 4: {
          start = p.createVector(-xMax, 0, z);
          end = p.createVector(xMax * 0.7, yMax, z);
          break;
        }
        // right-mid -> left-bottom
        default: {
          start = p.createVector(xMax, 0, z);
          end = p.createVector(-xMax * 0.7, yMax, z);
          break;
        }
      }

      // Magenta or turquoise
      const magenta = { r: 255, g: 80, b: 255 };
      const turquoise = { r: 80, g: 255, b: 255 };
      const color = p.random() < 0.5 ? magenta : turquoise;

      shootingStars.push(new ShootingStar(start, end, color, nowSeconds));
    };

    p.setup = () => {
      const { w, h } = getViewportSize();
      const canvas = p.createCanvas(w, h, p.WEBGL);

      // Make the canvas full-screen & click-through
      const c = canvas.canvas;
      c.style.position = 'fixed';
      c.style.top = '0';
      c.style.left = '0';
      c.style.width = '100vw';
      c.style.height = '100vh';
      c.style.pointerEvents = 'none'; // click-through
      c.style.zIndex = '0';

      // Generate stars
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push(new Star());
      }

      p.noStroke();
      const aspect = w / h;
      p.perspective((60 * Math.PI) / 180, aspect, 1, 5000);

      // First shooting star sometime in the first 5–20s
      scheduleNextShootingStar(0);
    };

    p.windowResized = () => {
      const { w, h } = getViewportSize();
      p.resizeCanvas(w, h);
      const aspect = w / h;
      p.perspective((60 * Math.PI) / 180, aspect, 1, 5000);
    };

    p.draw = () => {
      const t = p.millis() / 1000; // seconds

      // Deep-ish background; change these values to "tint" the whole scene
      p.background(5, 5, 15);

      // Camera motion
      p.push();
      p.rotateY(t * 0.08);
      p.rotateX(Math.sin(t * 0.15) * 0.2);

      // Stars
      p.blendMode(p.ADD);

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.update(t);

        const b = star.brightness;
        const r = b;
        const g = b * 0.5;
        const bl = 255;

        p.push();
        p.translate(star.pos.x, star.pos.y, star.pos.z);
        p.emissiveMaterial(r, g, bl);
        p.sphere(star.size, 6, 6);
        p.pop();
      }

      // Spawn shooting stars at random intervals (5–20s)
      if (t >= nextShootingStarTime && shootingStars.length < 3) {
        spawnShootingStar(t);
        scheduleNextShootingStar(t);
      }

      // Update & draw shooting stars
      for (let i = 0; i < shootingStars.length; i++) {
        const s = shootingStars[i];
        s.update(t);
        s.draw();
      }

      // Remove inactive ones
      shootingStars = shootingStars.filter((s) => s.active);

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
