<template>
  <BaseCapsuleModal
    title-id="tc-form-title"
    :show-close-icon="false"
    @close="emitClose"
  >
    <template #label>
      Time capsule
    </template>

    <template #title>
      {{ isEditMode ? 'Edit time capsule' : 'New time capsule' }}
    </template>

    <template #subtitle>
  From {{ fromName }} to {{ recipientLabel }}
</template>


    <!-- BODY -->
    <div class="tc-form-body">
      <!-- Title -->
      <div class="tc-form-field">
        <label class="tc-form-label" for="tc-title">Title</label>
        <input
          id="tc-title"
          v-model="title"
          type="text"
          class="tc-input"
          placeholder="Untitled capsule"
        />
      </div>

      <!-- Message -->
      <div class="tc-form-field">
        <label class="tc-form-label" for="tc-message">Message</label>
        <textarea
          id="tc-message"
          v-model="message"
          class="tc-textarea"
          rows="5"
          placeholder="Write something for your future hearts..."
        />
      </div>

      <!-- Unlock + recipient (centered block) -->
      <div class="tc-form-field tc-form-field--unlock">
        <label class="tc-form-label" for="tc-unlock">
          Unlock date &amp; time
        </label>
        <input
          id="tc-unlock"
          v-model="unlockAtLocal"
          type="datetime-local"
          class="tc-input tc-input--centered"
        />

        <div class="tc-recipient-toggle">
          <button
            type="button"
            class="tc-chip"
            :class="recipient === 'me' ? 'tc-chip-active' : ''"
            @click="recipient = 'me'"
          >
            Me
          </button>
          <button
            type="button"
            class="tc-chip"
            :class="recipient === 'partner' ? 'tc-chip-active' : ''"
            @click="recipient = 'partner'"
          >
            {{ partnerName || 'Partner' }}
          </button>
        </div>
      </div>

      <!-- Media upload + preview (centered) -->
      <div class="tc-form-field tc-form-field--media">
        <label class="tc-form-label">Photos / videos</label>

        <div class="tc-upload-row">
          <input
            ref="fileInput"
            type="file"
            class="tc-file-input"
            accept="image/*,video/*"
            multiple
            @change="onFilesSelected"
          />
          <button
            type="button"
            class="tc-btn tc-btn-ghost tc-upload-btn"
            :disabled="isUploading || isSubmitting"
            @click="triggerFilePicker"
          >
            <span v-if="isUploading">Uploading…</span>
            <span v-else>➕ Add photos / videos</span>
          </button>

          <span v-if="uploadError" class="tc-upload-error">
            {{ uploadError }}
          </span>
        </div>

        <div v-if="photos.length" class="tc-form-photos">
          <div
            v-for="(media, index) in photos"
            :key="index"
            class="tc-photo-thumb"
          >
            <img
              v-if="media.resource_type === 'image' || !media.resource_type"
              :src="media.url"
              alt="Attachment image"
            />
            <video
              v-else-if="media.resource_type === 'video'"
              :src="media.url"
              playsinline
              muted
            ></video>

            <button
              type="button"
              class="tc-photo-remove"
              @click="removePhoto(index)"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <p v-if="submitError" class="tc-form-error">
        {{ submitError }}
      </p>
    </div>

    <!-- FOOTER -->
    <template #footer-text>
      Write a note your future selves will unwrap later.
    </template>

    <template #footer-right>
      <button
        type="button"
        class="tc-btn tc-btn-ghost"
        :disabled="isSubmitting || isUploading"
        @click="emitClose"
      >
        Cancel
      </button>
      <button
        type="button"
        class="tc-btn tc-btn-primary"
        :disabled="isSubmitting || isUploading"
        @click="handleSubmit"
      >
        <span v-if="isEditMode">
          {{ isSubmitting ? 'Saving…' : 'Save changes' }}
        </span>
        <span v-else>
          {{ isSubmitting ? 'Creating…' : 'Create capsule' }}
        </span>
      </button>
    </template>
  </BaseCapsuleModal>
</template>

<script setup>
  import { computed, ref } from 'vue';
  import BaseCapsuleModal from './BaseCapsuleModal.vue';
  
  const props = defineProps({
    capsule: {
      type: Object,
      default: null, // can be null in "create" mode
    },
    fromName: {
      type: String,
      default: 'Dani',
    },
    partnerName: {
      type: String,
      default: 'partner',
    },
    isSubmitting: {
      type: Boolean,
      default: false,
    },
    submitError: {
      type: String,
      default: '',
    },
    cloudinaryCloudName: {
      type: String,
      default: '',
    },
    cloudinaryUploadPreset: {
      type: String,
      default: '',
    },
  });
  
  const emit = defineEmits(['close', 'save']);
  
  const isEditMode = computed(() => !!props.capsule && !!props.capsule.id);
  
  // Local form state
  const title = ref(props.capsule?.title ?? '');
  const message = ref(props.capsule?.message ?? '');
  const unlockAtLocal = ref(
    props.capsule?.unlockAt ? toLocalInputValue(props.capsule.unlockAt) : ''
  );
  
  // only used in "create" path in parent
  const recipient = ref('partner');
  
  // photos is ALWAYS an array
  const photos = ref(
    Array.isArray(props.capsule?.photos) ? [...props.capsule.photos] : []
  );
  
  // this is what appears in the subtitle after "to"
  const recipientLabel = computed(() => {
    if (recipient.value === 'me') return props.fromName || 'Me';
    return props.partnerName || 'your partner';
  });
  
  // upload state
  const fileInput = ref(null);
  const isUploading = ref(false);
  const uploadError = ref('');
  
  function toLocalInputValue(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
  
  function emitClose() {
    emit('close');
  }
  
  function handleSubmit() {
    emit('save', {
      title: title.value,
      message: message.value,
      unlockAtLocal: unlockAtLocal.value,
      recipient: recipient.value,
      photos: photos.value,
    });
  }
  
  function triggerFilePicker() {
    uploadError.value = '';
    if (fileInput.value) {
      fileInput.value.click();
    }
  }
  
  async function onFilesSelected(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
  
    if (!props.cloudinaryCloudName || !props.cloudinaryUploadPreset) {
      uploadError.value = 'Media upload is not configured.';
      event.target.value = '';
      return;
    }
  
    isUploading.value = true;
    uploadError.value = '';
  
    try {
      for (const file of files) {
        const isVideo = file.type && file.type.startsWith('video');
        const resourceType = isVideo ? 'video' : 'image';
  
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', props.cloudinaryUploadPreset);
  
        const endpoint = `https://api.cloudinary.com/v1_1/${props.cloudinaryCloudName}/${resourceType}/upload`;
  
        const res = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });
  
        if (!res.ok) {
          let msg = 'Upload failed';
          try {
            const errJson = await res.json();
            msg = errJson?.error?.message || msg;
          } catch {
            // ignore parse
          }
          throw new Error(msg);
        }
  
        const data = await res.json();
  
        photos.value.push({
          url: data.secure_url || data.url,
          resource_type: data.resource_type || resourceType,
        });
      }
    } catch (e) {
      console.error('[TimeCapsuleFormModal] upload failed:', e);
      uploadError.value =
        e?.message || 'Failed to upload media. Please try again.';
    } finally {
      isUploading.value = false;
      if (event.target) event.target.value = '';
    }
  }
  
  function removePhoto(index) {
    photos.value.splice(index, 1);
  }
  </script>
  

<style scoped>
/* Main vertical layout */
.tc-form-body {
  margin-top: 0.25rem;
  padding: 0.15rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 55vh;
  overflow-y: auto;
}

.tc-form-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* Centered unlock + recipient block */
.tc-form-field--unlock {
  align-items: center;
  text-align: center;
}

.tc-input--centered {
  max-width: 18rem;
  width: 100%;
}

/* Centered media block */
.tc-form-field--media {
  align-items: center;
  text-align: center;
}

/* Labels */
.tc-form-label {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: #7ef7ff;
  opacity: 0.9;
}

/* Inputs */
.tc-input,
.tc-textarea {
  border-radius: 0.6rem;
  border: 0.0625rem solid rgba(255, 255, 255, 0.25);
  background: rgba(0, 0, 0, 0.75);
  color: #f5f5ff;
  padding: 0.4rem 0.7rem;
  font-size: 0.9rem;
  outline: none;
  box-shadow:
    inset 0 0 0.25rem rgba(0, 0, 0, 0.6),
    0 0 0.5rem rgba(255, 0, 255, 0.25);
  transition: border-color 0.15s ease, box-shadow 0.15s ease,
    background 0.15s ease;
}

.tc-input:focus,
.tc-textarea:focus {
  border-color: rgba(0, 255, 255, 0.95);
  box-shadow:
    inset 0 0 0.3rem rgba(0, 0, 0, 0.7),
    0 0 0.75rem rgba(0, 255, 255, 0.7);
  background: rgba(0, 0, 0, 0.9);
}

.tc-textarea {
  resize: vertical;
  min-height: 6.25rem;
}

/* Recipient toggle */
.tc-recipient-toggle {
  display: inline-flex;
  justify-content: center;
  gap: 0.4rem;
  margin-top: 0.4rem;
  padding: 0.12rem;
  border-radius: 999rem;
  background: rgba(0, 0, 0, 0.7);
  border: 0.0625rem solid rgba(255, 255, 255, 0.25);
}

.tc-chip {
  border: none;
  background: transparent;
  color: #e2e2ff;
  padding: 0.22rem 0.8rem;
  font-size: 0.8rem;
  border-radius: 999rem;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease,
    box-shadow 0.15s ease, transform 0.12s ease;
}

.tc-chip-active {
  background: radial-gradient(circle at 0% 0%, #00ffff55, #ff00ff55);
  color: #0a0a0a;
  box-shadow:
    0 0 0.5rem rgba(0, 255, 255, 0.8),
    0 0 0.6rem rgba(255, 0, 255, 0.7);
  transform: translateY(-0.06rem);
}

/* Upload row */
.tc-upload-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.tc-file-input {
  display: none;
}

.tc-upload-btn {
  min-width: 9rem;
}

.tc-upload-error {
  font-size: 0.78rem;
  color: #ff6b9a;
}

/* Photo preview */
.tc-form-photos {
  margin-top: 0.3rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.45rem;
}

.tc-photo-thumb {
  position: relative;
  width: 5.5rem;
  height: 5.5rem;
  border-radius: 0.75rem;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.9);
  border: 0.0625rem solid rgba(255, 255, 255, 0.2);
  box-shadow:
    0 0 0.5rem rgba(255, 0, 255, 0.4),
    0 0 0.6rem rgba(0, 255, 255, 0.35);
}

.tc-photo-thumb img,
.tc-photo-thumb video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.tc-photo-remove {
  position: absolute;
  top: 0.2rem;
  right: 0.2rem;
  border: none;
  border-radius: 999rem;
  width: 1.2rem;
  height: 1.2rem;
  font-size: 0.75rem;
  line-height: 1;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.85);
  color: #ffb0c5;
  box-shadow: 0 0 0.35rem rgba(0, 0, 0, 0.8);
}

/* Error */
.tc-form-error {
  margin: 0.2rem 0 0;
  font-size: 0.8rem;
  color: #ff6b9a;
}

/* Buttons */
.tc-btn {
  border-radius: 999rem;
  padding: 0.3rem 0.95rem;
  font-size: 0.8rem;
  cursor: pointer;
  border: 0.0625rem solid transparent;
  background: transparent;
  color: #f5f5ff;
  transition: all 0.15s ease;
}

.tc-btn-ghost {
  border-color: rgba(255, 255, 255, 0.35);
  background: rgba(0, 0, 0, 0.65);
}

.tc-btn-ghost:hover:not(:disabled) {
  border-color: rgba(0, 255, 255, 0.9);
  box-shadow: 0 0 0.6rem rgba(0, 255, 255, 0.6);
  transform: translateY(-0.06rem);
}

.tc-btn-primary {
  border-color: magenta;
  background: rgba(0, 0, 0, 0.8);
  color: magenta;
  box-shadow:
    inset 0 0 0.4rem rgba(255, 0, 255, 0.6),
    0 0 0.4rem rgba(255, 0, 255, 0.5);
}

.tc-btn-primary:hover:not(:disabled) {
  box-shadow:
    inset 0 0 0.5rem rgba(255, 0, 255, 0.9),
    0 0 0.6rem rgba(0, 255, 255, 0.6);
  transform: translateY(-0.06rem);
}

.tc-btn:disabled {
  opacity: 0.55;
  cursor: default;
  box-shadow: none;
}

/* Keep modal compact on mobile */
:deep(.tc-modal-body) {
  padding-top: 0.1rem;
}

@media (max-width: 37.5rem) {
  :deep(.tc-modal-shell) {
    width: 90vw;
    max-width: 26rem;
    padding: 1.1rem 1rem 0.7rem;
    border-radius: 1rem;
  }

  :deep(.tc-modal-header) {
    padding-bottom: 0.4rem;
    margin-bottom: 0.15rem;
  }

  :deep(.tc-modal-header::after) {
    margin-top: 0.3rem;
  }

  :deep(.tc-modal-title) {
    font-size: 1.8rem;
  }

  /* keep subtitle, it's short now */
  .tc-form-body {
    max-height: 50vh;
    gap: 0.5rem;
    padding-right: 0.1rem;
  }

  .tc-input,
  .tc-textarea {
    padding: 0.35rem 0.6rem;
    font-size: 0.85rem;
  }

  .tc-textarea {
    min-height: 5.5rem;
  }

  .tc-upload-row {
    flex-direction: column;
    align-items: center;
  }

  .tc-form-photos {
    max-height: 7rem;
    overflow-x: auto;
    overflow-y: hidden;
    gap: 0.35rem;
  }

  .tc-photo-thumb {
    width: 4.5rem;
    height: 4.5rem;
  }

  :deep(.tc-modal-footer) {
    margin-top: 0.4rem;
    padding-top: 0.4rem;
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  :deep(.tc-modal-footer-right) {
    justify-content: flex-end;
  }
}
</style>
