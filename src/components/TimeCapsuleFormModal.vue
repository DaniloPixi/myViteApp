<template>
  <BaseCapsuleModal
    title-id="tc-form-title"
    :show-close-icon="true"
    @close="emitClose"
  >
    <template #label>
      Time capsule
    </template>

    <template #title>
      {{ modalTitle }}
    </template>

    <template #subtitle>
      {{ modalSubtitle }}
    </template>

    <!-- BODY -->
    <div class="tc-modal-grid">
      <!-- LEFT: meta (recipient + unlock time) -->
      <div class="tc-modal-column tc-modal-column-meta">
        <label class="tc-field">
          <span class="tc-field-label">Recipient</span>

          <!-- Creation: let user choose -->
          <div
            class="tc-recipient-options"
            v-if="!capsule"
          >
            <label class="tc-recipient-pill">
              <input
                type="radio"
                value="partner"
                v-model="formRecipient"
              />
              <span class="pill-main">
                To {{ partnerName || 'partner' }}
              </span>
              <span class="pill-sub">
                They’ll get a notification when it unlocks.
              </span>
            </label>

            <label class="tc-recipient-pill">
              <input
                type="radio"
                value="me"
                v-model="formRecipient"
              />
              <span class="pill-main">To yourself</span>
              <span class="pill-sub">
                A message from past you, for future you.
              </span>
            </label>
          </div>

          <!-- Editing: recipient fixed -->
          <div v-else class="tc-recipient-fixed">
            <p class="tc-recipient-fixed-label">
              {{ recipientSummary }}
            </p>
            <p class="tc-field-hint">
              Recipient can’t be changed after creation.
            </p>
          </div>
        </label>

        <label class="tc-field">
          <span class="tc-field-label">Unlock date &amp; time</span>
          <input
            v-model="formUnlockAt"
            type="datetime-local"
            class="tc-input tc-input-unlock"
          />
          <p class="tc-field-hint" v-if="formUnlockAt">
            This capsule will stay locked until
            <span class="tc-hint-highlight">{{ formUnlockAt }}</span>
            (your local time).
          </p>
          <p class="tc-field-hint" v-else>
            Pick a date in the future. No spoilers before then.
          </p>
        </label>
      </div>

      <!-- RIGHT: title + message + media -->
      <div class="tc-modal-column tc-modal-column-message">
        <label class="tc-field">
          <span class="tc-field-label">Title (optional)</span>
          <input
            v-model="formTitle"
            type="text"
            class="tc-input"
            placeholder="e.g. For the day you forget how loved you are"
          />
        </label>

        <label class="tc-field">
          <span class="tc-field-label">Message</span>
          <textarea
            v-model="formMessage"
            class="tc-textarea tc-textarea-message"
            rows="6"
            placeholder="Write like they can’t open it until exactly when they’ll need it most."
          ></textarea>
        </label>

        <!-- Media upload / previews -->
        <div class="tc-field tc-media-field">
          <span class="tc-field-label">Media (optional)</span>
          <div class="tc-media-upload-row">
            <input
              id="tc-file-upload"
              class="tc-media-file-input"
              type="file"
              multiple
              accept="image/*,video/*"
              :disabled="isSubmitting"
              @change="handleFileChange"
            />
            <label
              for="tc-file-upload"
              class="tc-media-upload-button"
              :class="{ 'tc-media-upload-button-disabled': isSubmitting }"
            >
              + Add photos / videos
            </label>
            <span v-if="isUploading" class="tc-media-upload-status">
              Uploading… {{ uploadProgress }}%
            </span>
            <span v-if="mediaPreviews.length" class="tc-media-count">
              {{ mediaPreviews.length }}/3 attached
            </span>
          </div>

          <div v-if="mediaPreviews.length" class="tc-media-previews">
            <div
              v-for="(preview, idx) in mediaPreviews"
              :key="idx"
              class="tc-media-preview-item"
            >
              <img
                v-if="preview.resource_type === 'image' || !preview.resource_type"
                :src="preview.url"
                class="tc-media-thumb"
                alt="Attached image"
              />
              <video
                v-else-if="preview.resource_type === 'video'"
                :src="preview.url"
                muted
                loop
                playsinline
                class="tc-media-video"
              ></video>

              <button
                class="tc-media-remove"
                @click.prevent="removeMedia(idx)"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <template #footer-text>
      Capsules can be edited until they unlock.
    </template>

    <template #footer-right>
      <button class="tc-btn tc-btn-ghost" @click="emitClose">
        Cancel
      </button>
      <button
        class="tc-btn tc-btn-primary"
        :disabled="isSubmitting || !formUnlockAt"
        @click="submitForm"
      >
        <span v-if="isSubmitting">Saving...</span>
        <span v-else>
          {{ capsule ? 'Save changes' : 'Create capsule' }}
        </span>
      </button>
    </template>

    <p v-if="mergedError" class="tc-error">
      {{ mergedError }}
    </p>
  </BaseCapsuleModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import BaseCapsuleModal from './BaseCapsuleModal.vue';

const props = defineProps({
  capsule: { type: Object, default: null },
  partnerName: { type: String, default: 'partner' },
  isSubmitting: { type: Boolean, default: false },
  submitError: { type: String, default: '' },

  cloudinaryCloudName: { type: String, required: true },
  cloudinaryUploadPreset: { type: String, required: true },
});

const emit = defineEmits(['save', 'close']);

const formTitle = ref('');
const formMessage = ref('');
const formUnlockAt = ref('');
const formRecipient = ref('partner'); // 'partner' | 'me'

// media state
// { url, file?, resource_type, source: 'new' | 'existing' }
const mediaPreviews = ref([]);
const isUploading = ref(false);
const uploadProgress = ref(0);
const localError = ref('');

// derived submitting state
const isSubmitting = computed(() => props.isSubmitting || isUploading.value);
const mergedError = computed(() => props.submitError || localError.value);

// title/subtitle
const modalTitle = computed(() =>
  props.capsule ? 'Edit your capsule' : 'Drop a new capsule into time'
);

const modalSubtitle = computed(() =>
  props.capsule
    ? 'Update the words or timing. The recipient stays the same.'
    : 'Choose who it’s for, when it unlocks, and what future hearts will read.'
);

const recipientSummary = computed(() => {
  const c = props.capsule;
  if (!c) return '';
  if (!c.toUid || !c.fromUid) {
    return 'Recipient was set when this capsule was created.';
  }
  if (c.toUid === c.fromUid) return 'To your future self.';
  return 'To your partner.';
});

// init/reset when capsule changes
watch(
  () => props.capsule,
  (capsule) => {
    localError.value = '';
    uploadProgress.value = 0;

    if (capsule) {
      formTitle.value = capsule.title || '';
      formMessage.value = capsule.message || '';

      if (capsule.unlockAt) {
        const d = new Date(capsule.unlockAt);
        if (!Number.isNaN(d.getTime())) {
          const local = new Date(
            d.getTime() - d.getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16);
          formUnlockAt.value = local;
        } else {
          formUnlockAt.value = '';
        }
      } else {
        formUnlockAt.value = '';
      }

      // existing photos
      if (Array.isArray(capsule.photos)) {
        mediaPreviews.value = capsule.photos.map((media) => ({
          url: media.url,
          resource_type: media.resource_type || 'image',
          source: 'existing',
        }));
      } else {
        mediaPreviews.value = [];
      }
    } else {
      formTitle.value = '';
      formMessage.value = '';

      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const local = new Date(
        tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16);

      formUnlockAt.value = local;
      formRecipient.value = 'partner';
      mediaPreviews.value = [];
    }
  },
  { immediate: true },
);

function emitClose() {
  emit('close');
}

/**
 * File handling / previews
 * Limit total to 3 items.
 */
function handleFileChange(event) {
  const files = Array.from(event.target.files || []);
  const limit = 3;
  const remaining = limit - mediaPreviews.value.length;

  if (files.length > remaining) {
    if (remaining <= 0) {
      localError.value = 'You can only attach up to 3 media files per capsule.';
    } else {
      localError.value = `You can only add ${remaining} more file${remaining === 1 ? '' : 's'}.`;
    }
    event.target.value = '';
    return;
  }

  localError.value = '';

  for (const file of files) {
    const resource_type = file.type.startsWith('video') ? 'video' : 'image';
    mediaPreviews.value.push({
      url: URL.createObjectURL(file),
      file,
      resource_type,
      source: 'new',
    });
  }

  event.target.value = '';
}

function removeMedia(index) {
  const item = mediaPreviews.value[index];
  if (!item) return;

  if (item.url && item.url.startsWith('blob:')) {
    URL.revokeObjectURL(item.url);
  }

  mediaPreviews.value.splice(index, 1);
}

/**
 * Upload only the "new" files to Cloudinary.
 * Returns:
 *  - Array of { url, resource_type } on success
 *  - null on failure
 */
async function uploadFiles() {
  const filesToUpload = mediaPreviews.value.filter(
    (p) => p.source === 'new' && p.file,
  );

  if (!filesToUpload.length) {
    return [];
  }

  isUploading.value = true;
  uploadProgress.value = 0;
  localError.value = '';

  const uploadedMedia = [];

  for (let i = 0; i < filesToUpload.length; i++) {
    const preview = filesToUpload[i];
    const resourceType = preview.resource_type || 'image';

    const formData = new FormData();
    formData.append('file', preview.file);
    formData.append('upload_preset', props.cloudinaryUploadPreset);

    try {
      const endpoint = `https://api.cloudinary.com/v1_1/${props.cloudinaryCloudName}/${resourceType}/upload`;
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!response.ok || !data.secure_url) {
        const msg =
          data.error?.message || data.message || 'File upload failed.';
        throw new Error(msg);
      }

      uploadedMedia.push({
        url: data.secure_url,
        resource_type: data.resource_type || resourceType,
      });

      uploadProgress.value = Math.round(
        ((i + 1) / filesToUpload.length) * 100,
      );
    } catch (err) {
      console.error('[TimeCapsuleFormModal] Upload failed:', err);
      localError.value = 'Upload failed for one or more files.';
      isUploading.value = false;
      return null;
    }
  }

  isUploading.value = false;
  return uploadedMedia;
}

/**
 * Submit: validate, upload new media, merge with existing, emit all data upwards.
 */
async function submitForm() {
  localError.value = '';

  if (!formUnlockAt.value) {
    localError.value = 'Please choose an unlock date & time.';
    return;
  }

  const unlockDate = new Date(formUnlockAt.value);
  if (Number.isNaN(unlockDate.getTime())) {
    localError.value = 'Invalid unlock date/time.';
    return;
  }

  if (unlockDate.getTime() <= Date.now()) {
    localError.value = 'Unlock time must be in the future.';
    return;
  }

  if (!formMessage.value || !formMessage.value.trim()) {
    localError.value = 'Message cannot be empty.';
    return;
  }

  const newMedia = await uploadFiles();
  if (newMedia === null) {
    return;
  }

  const existingMedia = mediaPreviews.value
    .filter((p) => p.source === 'existing')
    .map(({ url, resource_type }) => ({
      url,
      resource_type: resource_type || 'image',
    }));

  const photos = [...existingMedia, ...newMedia];

  emit('save', {
    title: formTitle.value,
    message: formMessage.value.trim(),
    unlockAtLocal: formUnlockAt.value,
    recipient: formRecipient.value,
    photos,
  });
}
</script>

<style scoped>
/* Grid layout inside modal */

.tc-modal-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.4fr);
  gap: 1rem;
}

.tc-modal-column {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.tc-modal-column-meta {
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  padding-right: 0.8rem;
}

.tc-modal-column-message {
  padding-left: 0.1rem;
}

/* Fields */

.tc-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tc-field-label {
  font-size: 0.8rem;
  opacity: 0.85;
}

.tc-input,
.tc-textarea {
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(0, 0, 0, 0.85);
  color: #f5f5ff;
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  outline: none;
}

.tc-input:focus,
.tc-textarea:focus {
  border-color: cyan;
  box-shadow: 0 0 7px rgba(0, 255, 255, 0.7);
}

.tc-input-unlock {
  font-family: inherit;
}

.tc-textarea-message {
  min-height: 140px;
  resize: vertical;
}

/* Recipient pills */

.tc-recipient-options {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.tc-recipient-pill {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.35rem 0.55rem 0.35rem 1.8rem;
  border-radius: 10px;
  background:
    radial-gradient(circle at 0% 0%, rgba(255, 0, 255, 0.18), transparent 60%),
    rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.18);
  cursor: pointer;
  font-size: 0.8rem;
}

.tc-recipient-pill input[type='radio'] {
  position: absolute;
  left: 0.5rem;
  top: 0.6rem;
  width: 12px;
  height: 12px;
  accent-color: magenta;
}

.tc-recipient-pill .pill-main {
  font-weight: 500;
}

.tc-recipient-pill .pill-sub {
  opacity: 0.75;
  font-size: 0.75rem;
}

.tc-recipient-fixed-label {
  font-size: 0.85rem;
  font-weight: 500;
}

/* Hint text */

.tc-field-hint {
  margin: 0.1rem 0 0;
  font-size: 0.75rem;
  opacity: 0.75;
}

.tc-hint-highlight {
  color: #ffdf7f;
  font-weight: 500;
}

/* MEDIA FIELD */

.tc-media-field {
  margin-top: 0.3rem;
}

.tc-media-upload-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.tc-media-file-input {
  display: none;
}

.tc-media-upload-button {
  display: inline-block;
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  border: 1px solid rgba(0, 255, 255, 0.7);
  background: rgba(0, 0, 0, 0.85);
  color: #7ef7ff;
  font-size: 0.8rem;
  cursor: pointer;
  box-shadow: 0 0 7px rgba(0, 255, 255, 0.6);
  transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}

.tc-media-upload-button:hover {
  border-color: magenta;
  box-shadow: 0 0 10px rgba(255, 0, 255, 0.7);
  transform: translateY(-0.5px);
}

.tc-media-upload-button-disabled {
  opacity: 0.55;
  cursor: default;
  box-shadow: none;
}

.tc-media-upload-status {
  font-size: 0.75rem;
  opacity: 0.85;
  color: #7ef7ff;
}

.tc-media-count {
  font-size: 0.75rem;
  opacity: 0.85;
}

.tc-media-previews {
  margin-top: 0.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  gap: 0.4rem;
}

.tc-media-preview-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.9);
  box-shadow: 0 0 8px rgba(255, 0, 255, 0.35);
}

.tc-media-thumb,
.tc-media-video {
  display: block;
  width: 100%;
  height: 70px;
  object-fit: cover;
}

.tc-media-remove {
  position: absolute;
  top: -0.4rem;
  right: -0.2rem;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.85);
  color: #ff6b6b;
  font-size: 0.9rem;
  cursor: pointer;
}

/* Buttons */

.tc-btn {
  border-radius: 999px;
  padding: 0.3rem 0.85rem;
  font-size: 0.8rem;
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  color: #f5f5ff;
  transition: all 0.15s ease;
}

.tc-btn-ghost {
  border-color: rgba(255, 255, 255, 0.35);
  background: rgba(0, 0, 0, 0.6);
}

.tc-btn-ghost:hover {
  border-color: rgba(0, 255, 255, 0.8);
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
}

.tc-btn-primary {
  border-color: magenta;
  background: rgba(0, 0, 0, 0.7);
  color: magenta;
  box-shadow:
    inset 0 0 6px rgba(255, 0, 255, 0.6),
    0 0 6px rgba(255, 0, 255, 0.5);
}

.tc-btn-primary:hover:not(:disabled) {
  box-shadow:
    inset 0 0 8px rgba(255, 0, 255, 0.9),
    0 0 10px rgba(0, 255, 255, 0.6);
  transform: translateY(-0.5px);
}

.tc-btn:disabled {
  opacity: 0.55;
  cursor: default;
  box-shadow: none;
}

/* Error */

.tc-error {
  margin-top: 0.6rem;
  text-align: center;
  font-size: 0.8rem;
  color: #ff6b6b;
}

/* Responsive */

@media (max-width: 700px) {
  .tc-modal-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.8rem;
  }

  .tc-modal-column-meta {
    border-right: none;
    padding-right: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding-bottom: 0.6rem;
    margin-bottom: 0.4rem;
  }

  .tc-modal-column-message {
    padding-left: 0;
  }
}
</style>
