
<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h3>{{ isEditing ? 'Edit Memo' : 'Create New Memo' }}</h3>
      <form @submit.prevent="submitForm" class="plan-form">

        <!-- Description -->
        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description" v-model="formData.description" required></textarea>
        </div>

        <!-- Location & Date -->
        <div class="form-row">
          <div class="form-group">
            <label for="location">Location</label>
            <input type="text" id="location" v-model="formData.location" />
          </div>
          <div class="form-group">
            <label for="date">Date</label>
            <input type="date" id="date" v-model="formData.date" required />
          </div>
        </div>

        <!-- Hashtags -->
        <div class="form-group">
          <div class="hashtag-selection-container">
            <button v-for="tag in availableHashtags" :key="tag" @click.prevent="toggleHashtag(tag)" :class="{ selected: formData.hashtags.includes(tag) }">
              #{{ tag }}
            </button>
          </div>
        </div>

        <!-- Photo Uploader -->
        <div class="form-group">
          <input type="file" id="file-upload" @change="handleFileChange" multiple accept="image/*" :disabled="isUploading" class="file-input-hidden" />
          <label for="file-upload" class="file-upload-label" :class="{ 'disabled': isUploading }">
            + Add Photos
          </label>
          <div v-if="isUploading" class="upload-status">Uploading... {{ uploadProgress }}%</div>
        </div>

        <!-- Image Previews -->
        <div class="image-previews" v-if="imagePreviews.length > 0">
          <div v-for="(preview, index) in imagePreviews" :key="index" class="preview-item">
            <img :src="preview.url" :class="{'adult-preview-blur': preview.isAdult}" />
            <button @click.prevent="removeImage(index)" class="remove-image-btn">×</button>
            <button @click.prevent="toggleAdultFlag(index)" class="adult-flag" :class="{'adult-flag-selected': preview.isAdult}">18+</button>
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="error" class="error-message">{{ error }}</div>

        <!-- Action Buttons -->
        <div class="modal-actions">
          <button type="submit" class="confirm-button" :disabled="isUploading || isSubmitting">
            {{ isSubmitting ? 'Saving...' : 'Save Memo' }}
          </button>
          <button type="button" @click="$emit('close')" class="cancel-button">Cancel</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { auth } from '../firebase';

const props = defineProps({
  memo: { type: Object, default: null },
  cloudinaryCloudName: { type: String, required: true },
  cloudinaryUploadPreset: { type: String, required: true },
});

const emit = defineEmits(['close', 'memo-saved']);

const availableHashtags = ref(['date', 'party', 'food', '18+', 'travel', 'weekend', 'chill', 'friends', 'love', 'random']);
const isEditing = computed(() => !!props.memo);
const formData = ref({ hashtags: [] });
const imagePreviews = ref([]);
const isUploading = ref(false);
const isSubmitting = ref(false);
const uploadProgress = ref(0);
const error = ref(null);

watch(() => props.memo, (newMemo) => {
  if (newMemo) {
    formData.value = { ...newMemo };
    if (newMemo.hashtags && Array.isArray(newMemo.hashtags)) {
        formData.value.hashtags = newMemo.hashtags.map(t => t.startsWith('#') ? t.substring(1) : t);
    } else {
        formData.value.hashtags = [];
    }

    if (newMemo.photos && Array.isArray(newMemo.photos)) {
        imagePreviews.value = newMemo.photos.map(photo => ({ ...photo, source: 'existing' }));
    } else if (newMemo.photoUrls && Array.isArray(newMemo.photoUrls)) {
        const contains18plus = newMemo.hashtags && newMemo.hashtags.includes('#18+');
        imagePreviews.value = newMemo.photoUrls.map(url => ({ url, isAdult: contains18plus, source: 'existing' }));
    } else {
        imagePreviews.value = [];
    }
  } else {
    formData.value = { description: '', location: '', date: new Date().toISOString().split('T')[0], hashtags: [] };
    imagePreviews.value = [];
  }
}, { immediate: true });

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
  const availableSlots = 10 - imagePreviews.value.length;

  if (files.length > availableSlots) {
    error.value = `You can only add ${availableSlots} more photos.`;
    event.target.value = null;
    return;
  }
  error.value = null;

  for (const file of files) {
    imagePreviews.value.push({
      url: URL.createObjectURL(file),
      file: file,
      isAdult: false,
      source: 'new'
    });
  }
  event.target.value = null;
};

const removeImage = (index) => {
  imagePreviews.value.splice(index, 1);
};

const toggleAdultFlag = (index) => {
  imagePreviews.value[index].isAdult = !imagePreviews.value[index].isAdult;
};

const uploadImages = async () => {
  isUploading.value = true;
  uploadProgress.value = 0;
  const uploadedPhotos = [];

  const filesToUpload = imagePreviews.value.filter(p => p.source === 'new');
  if (filesToUpload.length === 0) {
    isUploading.value = false;
    return [];
  }

  for (let i = 0; i < filesToUpload.length; i++) {
    const preview = filesToUpload[i];
    const formData = new FormData();
    formData.append('file', preview.file);
    formData.append('upload_preset', props.cloudinaryUploadPreset);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${props.cloudinaryCloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.secure_url) {
        uploadedPhotos.push({ url: data.secure_url, isAdult: preview.isAdult });
        uploadProgress.value = Math.round(((i + 1) / filesToUpload.length) * 100);
      } else {
        throw new Error('Image upload failed.');
      }
    } catch (err) {
      error.value = `Upload failed for one or more images: ${err.message}`;
      isUploading.value = false;
      return null;
    }
  }

  isUploading.value = false;
  return uploadedPhotos;
};

const submitForm = async () => {
  isSubmitting.value = true;
  error.value = null;

  const newPhotos = await uploadImages();
  if (newPhotos === null) {
    isSubmitting.value = false;
    return;
  }

  const existingPhotos = imagePreviews.value
    .filter(p => p.source === 'existing')
    .map(({url, isAdult}) => ({url, isAdult}));

  const finalPhotos = [...existingPhotos, ...newPhotos];

  const memoHashtags = new Set(formData.value.hashtags);
  const hasAdultContent = finalPhotos.some(p => p.isAdult);

  if (hasAdultContent) {
    memoHashtags.add('18+');
  }

  const payload = {
    ...formData.value,
    hashtags: Array.from(memoHashtags).map(tag => `#${tag}`),
    photos: finalPhotos,
  };
  delete payload.photoUrls;

  try {
    if (!auth.currentUser) throw new Error('Authentication required.');
    const idToken = await auth.currentUser.getIdToken();

    const url = isEditing.value ? `/api/memos/${props.memo.id}` : '/api/memos';
    const method = isEditing.value ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
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
    console.error("Form submission error:", err);
    error.value = err.message;
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #000;
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid magenta;
  box-shadow: 0 0 25px rgba(255, 0, 255, 0.4);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

h3 {
  font-family: 'Great Vibes', cursive;
  color: magenta;
  text-align: center;
  margin-top: 0;
  margin-bottom: 2rem;
  font-size: 3em;
  text-shadow: 0 0 10px magenta;
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

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: turquoise;
}

input, textarea {
  box-sizing: border-box;
  width: 100%;
  padding: 0.8em 1em;
  border-radius: 8px;
  border: 1px solid transparent;
  background-color: #000;
  color: turquoise;
  font-size: 1em;
  box-shadow: inset 0 0 5px rgba(64, 224, 208, 0.5), 0 0 5px rgba(64, 224, 208, 0.5);
  transition: box-shadow 0.3s ease;
}
textarea {
  min-height: 100px;
  resize: vertical;
}

input:focus, textarea:focus {
    outline: none;
    box-shadow: inset 0 0 8px rgba(64, 224, 208, 0.8), 0 0 8px rgba(64, 224, 208, 0.8);
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

.modal-actions button {
  padding: 0.7em 1.4em;
  border-radius: 30px;
  border: 1px solid;
  font-size: 1.5em;
  cursor: pointer;
  font-family: 'Great Vibes', cursive;
  background-color: black;
  transition: box-shadow 0.3s ease, color 0.3s ease;
}

.confirm-button {
  color: magenta;
  border-color: magenta;
  box-shadow: inset 0 0 8px rgba(255, 0, 255, 0.5), 0 0 8px rgba(255, 0, 255, 0.5);
}

.confirm-button:hover {
  box-shadow: inset 0 0 12px rgba(255, 0, 255, 0.8), 0 0 12px rgba(255, 0, 255, 0.8);
}

.cancel-button {
  color: turquoise;
  border-color: turquoise;
  box-shadow: inset 0 0 8px rgba(64, 224, 208, 0.5), 0 0 8px rgba(64, 224, 208, 0.5);
}

.cancel-button:hover {
    box-shadow: inset 0 0 12px rgba(64, 224, 208, 0.8), 0 0 12px rgba(64, 224, 208, 0.8);
}

.error-message {
  color: #ff6b6b;
  text-align: center;
  margin-top: 1rem;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hashtag-selection-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.hashtag-selection-container button {
  background-color: #000;
  color: turquoise;
  border: 1px solid turquoise;
  border-radius: 15px;
  padding: 0.5em 1em;
  cursor: pointer;
  transition: background-color 0.3s, box-shadow 0.3s;
}

.hashtag-selection-container button.selected {
  background-color: turquoise;
  color: #000;
  box-shadow: 0 0 10px turquoise;
}
.file-input-hidden { display: none; }
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
.file-upload-label:hover { background-color: turquoise; color:#000; }
.file-upload-label.disabled { opacity: 0.5; cursor: not-allowed; }

.upload-status { margin-top: 0.5rem; color: turquoise; }

.image-previews {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 10px;
  margin-top: 1rem;
}
.preview-item {
  position: relative;
}

.preview-item img {
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

.remove-image-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  background: rgba(0,0,0,0.6);
  color: white;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 14px;
  line-height: 20px;
  text-align: center;
  cursor: pointer;
}

.adult-flag {
  position: absolute;
  bottom: 2px;
  right: 2px;
  background: rgba(0,0,0,0.6);
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

</style>
