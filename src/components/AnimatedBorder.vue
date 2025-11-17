<template>
              <div
                class="animated-border"
                ref="borderContainer"
                :style="{ maxWidth: maxWidth }"
              >
                <div class="animated-border-glow" :style="{ opacity: opacity1, width: size1 + '%', height: size1 + '%' }"></div>
                <div class="animated-border-glow-secondary" :style="{ opacity: opacity2, width: size2 + '%', height: size2 + '%' }"></div>
                <div class="animated-border-content">
                  <slot></slot>
                </div>
              </div>
            </template>
            
            <script setup>
            import { ref } from 'vue';
            import { useShimmeringOpacity } from '../composables/useShimmeringOpacity';
            
            defineProps({
              maxWidth: {
                type: String,
                default: '700px',
              },
            });

            const borderContainer = ref(null);
            const { opacity1, opacity2, size1, size2 } = useShimmeringOpacity();
            </script>
            
            <style scoped>
            .animated-border {
              position: relative;
              margin: 0 auto;
              padding: 0.22rem;
              border-radius: 20px;
              overflow: hidden;
              transition: max-width 0.5s cubic-bezier(0.25, 1, 0.5, 1);
            }
            
            .animated-border-glow,
            .animated-border-glow-secondary {
              position: absolute;
              top: -50%;
              left: -50%;
              animation: star-trail 4s linear infinite;
              transition: opacity 0.7s ease-in-out, width 0.05s linear, height 0.05s linear;
            }
            
            .animated-border-glow {
              background-image: conic-gradient(
                transparent,
                rgba(214, 7, 197, 0.8), /* Magenta */
                transparent 30%
              );
            }
            
            .animated-border-glow-secondary {
              background-image: conic-gradient(
                transparent,
                rgba(7, 197, 214, 0.8), /* Cyan */
                transparent 30%
              );
              animation-direction: reverse;
            }
            
            @keyframes star-trail {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            
            .animated-border-content {
              position: relative;
              z-index: 1;
              background-color: #000000;
              border-radius: 22px;
              display: flex;
              justify-content: center;
            }
            </style>