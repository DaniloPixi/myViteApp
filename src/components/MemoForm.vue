<template>
  <div class="modal-overlay ds-modal-overlay" @click.self="$emit('close')">
    <div class="modal-content ds-modal-surface">
      <h3 class="modal-title ds-modal-title">
        {{ isEditing ? 'Edit Memo' : 'Create New Memo' }}
      </h3>
      <div class="ds-divider-glow modal-title-divider"></div>

      <form @submit.prevent="submitForm" class="plan-form">
        <div class="form-group">
          <label class="ds-label" for="description">Description</label>
          <textarea
            id="description"
            v-model="formData.description"
            class="ds-textarea description-input"
            required
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <LocationAutocomplete
              input-id="memo-location"
              label="Location"
              v-model="formData.location"
              v-model:coords="selectedLocationCoords"
            />
          </div>

          <div class="form-group">
            <label class="ds-label" for="date">Date</label>
            <input id="date" v-model="formData.date" class="ds-input" type="date" required />
          </div>
        </div>

        <div class="form-group">
          <div class="ds-inline-cluster-tight">
            <button
              v-for="tag in availableHashtags"
              :key="tag"
              class="ds-chip"
              :class="{ 'is-selected': formData.hashtags.includes(tag) }"
              @click.prevent="toggleHashtag(tag)"
            >
              #{{ tag }}
            </button>
          </div>
        </div>

        <div class="form-group">
          <input
            id="file-upload"
            type="file"
            @change="handleFileChange"
            multiple
            accept="image/*,video/*"
            :disabled="isUploading"
            class="file-input-hidden"
          />
          <label for="file-upload" class="file-upload-label" :class="{ disabled: isUploading }">
            + Add Media
          </label>
          <div v-if="isUploading" class="upload-status">Uploading... {{ uploadProgress }}%</div>
        </div>

        <div v-if="mediaPreviews.length > 0" class="media-previews">
          <div v-for="(preview, index) in mediaPreviews" :key="index" class="preview-item">
            <img
              v-if="preview.resource_type === 'image'"
              :src="preview.url"
              :class="{ 'adult-preview-blur': preview.isAdult }"
            />
            <video
              v-else-if="preview.resource_type === 'video'"
              :src="preview.url"
              muted
              loop
              playsinline
              class="video-preview"
            ></video>
            <button @click.prevent="removeMedia(index)" class="remove-media-btn">X</button>
            <button
              @click.prevent="toggleAdultFlag(index)"
              class="adult-flag"
              :class="{ 'adult-flag-selected': preview.isAdult }"
            >
              18+
            </button>
          </div>
        </div>

        <div v-if="error" class="error-message ds-alert ds-alert--danger ds-alert--compact">
          {{ error }}
        </div>

        <div class="modal-actions ds-modal-actions">
          <button
            type="submit"
            class="ds-modal-action-btn ds-modal-action-btn--confirm"
            :disabled="isUploading || isSubmitting"
          >
            {{ isSubmitting ? 'Saving...' : 'Save Memo' }}
          </button>

          <button
            type="button"
            class="ds-modal-action-btn ds-modal-action-btn--cancel"
            @click="$emit('close')"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { auth } from '../firebase';
import LocationAutocomplete from './LocationAutocomplete.vue';
import { geocodeLocationLabel, sanitizeLocationLabel } from '../composables/useLocationGeocoding';

const props = defineProps({
  memo: { type: Object, default: null },
  cloudinaryCloudName: { type: String, required: true },
  cloudinaryUploadPreset: { type: String, required: true },
});

const emit = defineEmits(['close', 'memo-saved']);

const availableHashtags = ref([
  'date',
  'party',
  'food',
  '18+',
  'travel',
  'weekend',
  'chill',
  'friends',
  'love',
  'random',
]);
const isEditing = computed(() => !!props.memo);
const formData = ref({ hashtags: [] });
const selectedLocationCoords = ref(null);
const mediaPreviews = ref([]);
const isUploading = ref(false);
const isSubmitting = ref(false);
const uploadProgress = ref(0);
const error = ref(null);

watch(
  () => props.memo,
  (newMemo) => {
    if (newMemo) {
      formData.value = { ...newMemo };
      selectedLocationCoords.value = newMemo.locationCoords || null;
      formData.value.hashtags = (newMemo.hashtags || []).map((t) =>
        t.startsWith('#') ? t.substring(1) : t
      );

      if (newMemo.photos && Array.isArray(newMemo.photos)) {
        mediaPreviews.value = newMemo.photos.map((media) => ({
          ...media,
          resource_type: media.resource_type || 'image',
          source: 'existing',
        }));
      } else {
        mediaPreviews.value = [];
      }
    } else {
      formData.value = {
        description: '',
        location: '',
        date: new Date().toISOString().split('T')[0],
        hashtags: [],
      };
      selectedLocationCoords.value = null;
      mediaPreviews.value = [];
    }
  },
  { immediate: true }
);

const toggleHashtag = (tag) => {
  const index = formData.value.hashtags.indexOf(tag);
  if (index > -1) {
    formData.value.hashtags.splice(index, 1);
  } else if (formData.value.hashtags.length < 3 || tag === '18+') {
    formData.value.hashtags.push(tag);
  }
};

const handleFileChange = (event) => {
  const files = Array.from(event.target.files);
  const availableSlots = 10 - mediaPreviews.value.length;

  if (files.length > availableSlots) {
    error.value = `You can only add ${availableSlots} more files.`;
    event.target.value = null;
    return;
  }
  error.value = null;

  for (const file of files) {
    const resource_type = file.type.startsWith('video') ? 'video' : 'image';
    mediaPreviews.value.push({
      url: URL.createObjectURL(file),
      file: file,
      isAdult: false,
      resource_type: resource_type,
      source: 'new',
    });
  }
  event.target.value = null;
};

const removeMedia = (index) => {
  mediaPreviews.value.splice(index, 1);
};

const toggleAdultFlag = (index) => {
  mediaPreviews.value[index].isAdult = !mediaPreviews.value[index].isAdult;
};

const uploadFiles = async () => {
  isUploading.value = true;
  uploadProgress.value = 0;
  const uploadedMedia = [];

  const filesToUpload = mediaPreviews.value.filter((p) => p.source === 'new');
  if (filesToUpload.length === 0) {
    isUploading.value = false;
    return [];
  }

  for (let i = 0; i < filesToUpload.length; i++) {
    const preview = filesToUpload[i];
    const uploadFormData = new FormData();
    uploadFormData.append('file', preview.file);
    uploadFormData.append('upload_preset', props.cloudinaryUploadPreset);

    try {
      const endpoint = `https://api.cloudinary.com/v1_1/${props.cloudinaryCloudName}/${preview.resource_type}/upload`;
      const response = await fetch(endpoint, {
        method: 'POST',
        body: uploadFormData,
      });
      const data = await response.json();
      if (data.secure_url) {
        uploadedMedia.push({
          url: data.secure_url,
          isAdult: preview.isAdult,
          resource_type: data.resource_type,
        });
        uploadProgress.value = Math.round(((i + 1) / filesToUpload.length) * 100);
      } else {
        throw new Error('File upload failed.');
      }
    } catch (err) {
      error.value = `Upload failed for one or more files: ${err.message}`;
      isUploading.value = false;
      return null;
    }
  }

  isUploading.value = false;
  return uploadedMedia;
};

const submitForm = async () => {
  isSubmitting.value = true;
  error.value = null;

  const newMedia = await uploadFiles();
  if (newMedia === null) {
    isSubmitting.value = false;
    return;
  }

  const existingMedia = mediaPreviews.value
    .filter((p) => p.source === 'existing')
    .map(({ url, isAdult, resource_type }) => ({ url, isAdult, resource_type }));

  const finalMedia = [...existingMedia, ...newMedia];
  const memoHashtags = new Set(formData.value.hashtags);
  const hasAdultContent = finalMedia.some((p) => p.isAdult);

  if (hasAdultContent) memoHashtags.add('18+');

  const payload = {
    ...formData.value,
    location: sanitizeLocationLabel(formData.value.location),
    locationCoords:
      selectedLocationCoords.value || (await geocodeLocationLabel(formData.value.location)),
    hashtags: Array.from(memoHashtags).map((tag) => `#${tag}`),
    photos: finalMedia,
  };

  try {
    if (!auth.currentUser) throw new Error('Authentication required.');
    const idToken = await auth.currentUser.getIdToken();

    const url = isEditing.value ? `/api/memos/${props.memo.id}` : '/api/memos';
    const method = isEditing.value ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save memo.');
    }

    emit('memo-saved');
    emit('close');
  } catch (err) {
    console.error('Form submission error:', err);
    error.value = err.message;
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.modal-content {
  position: relative;
  overflow-x: hidden;
  overflow-y: hidden;
  animation: memo-modal-glow 4.5s ease-in-out infinite;
}

.modal-title {
  margin: 0;
  text-align: center;
}

.modal-title-divider {
  width: 92%;
  margin: 0.6rem auto var(--ds-space-5);
}

@media (max-width: 480px) {
  .modal-title {
    line-height: 1.08;
  }

  .modal-title-divider {
    width: 100%;
    margin-bottom: var(--ds-space-4);
  }
}

.plan-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.form-row {
  display: flex;
  gap: 1rem;
}
.form-row .form-group {
  flex: 1;
}

.form-group {
  width: 100%;
}
.description-input {
  font-size: clamp(1rem, 0.9rem + 0.45vw, 1.25rem);
  line-height: 1.45;
}
.file-input-hidden {
  display: none;
}
.file-upload-label {
  display: inline-block;
  padding: 0.7em 1.5em;
  background-color: #000;
  color: turquoise;
  border: 1px solid turquoise;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.3s;
}
.file-upload-label:hover {
  background-color: turquoise;
  color: #000;
}
.file-upload-label.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.upload-status {
  margin-top: 0.5rem;
  color: turquoise;
}

.media-previews {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 10px;
  margin-top: 1rem;
}
.preview-item {
  position: relative;
}

.preview-item img,
.video-preview {
  width: 100%;
  height: 80px;
  object-fit: cover;
  border-radius: 6px;
  display: block;
  transition: filter 0.3s ease;
}

.adult-preview-blur {
  filter: blur(8px);
}

.remove-media-btn {
  position: absolute;
  top: -0.8rem;
  right: -0.3rem;
  background: rgba(0, 0, 0, 0);
  color: rgb(247, 6, 6);
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 16px;
  line-height: 20px;
  text-align: center;
  cursor: pointer;
}

.adult-flag {
  position: absolute;
  bottom: 2px;
  right: 2px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: 1px solid white;
  border-radius: 4px;
  padding: 1px 4px;
  font-size: 10px;
  cursor: pointer;
}

.adult-flag-selected {
  background: #ff6b6b;
  color: black;
  border-color: #ff6b6b;
}
@keyframes memo-modal-glow {
  0%,
  100% {
    border-color: rgba(255, 0, 255, 0.32);
    box-shadow:
      inset 0 2px 4px rgba(0, 0, 0, 0.4),
      inset 0 0 10px rgba(255, 0, 255, 0.5),
      -60px 0 80px -40px rgba(255, 0, 255, 0.5),
      60px 0 80px -40px rgba(0, 255, 255, 0.5);
  }
  50% {
    border-color: rgba(0, 255, 255, 0.45);
    box-shadow:
      inset 0 2px 4px rgba(0, 0, 0, 0.4),
      inset 0 0 10px rgba(0, 255, 255, 0.5),
      -70px 0 100px -45px rgba(0, 255, 255, 0.7),
      70px 0 100px -45px rgba(255, 0, 255, 0.7);
  }
}

@keyframes memo-strip-flow {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

@media (max-width: 700px) {
  .modal-content {
    width: min(420px, calc(100vw - 1.7rem));
    padding: 1.4rem 1.2rem 0.9rem;
    border-radius: 16px;
  }
}
@media (max-width: 480px) {
  .modal-title {
    margin-bottom: var(--ds-space-4);
    line-height: 1.08;
  }

  .modal-title::after {
    width: 100%;
  }
}
</style>
