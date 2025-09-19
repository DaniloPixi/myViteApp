
<template>
  <div class="form-overlay">
    <div class="form-container">
      <form @submit.prevent="submitForm">
        <h2>{{ isEditing ? 'Edit Memo' : 'Create New Memo' }}</h2>

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
            <img :src="preview.url" />
            <button @click.prevent="removeImage(index)" class="remove-image-btn">×</button>
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="error" class="error-message">{{ error }}</div>

        <!-- Action Buttons -->
        <div class="form-actions">
          <button type="button" @click="$emit('close')" class="btn-cancel">Cancel</button>
          <button type="submit" class="btn-submit" :disabled="isUploading || isSubmitting">
            {{ isSubmitting ? 'Saving...' : 'Save Memo' }}
          </button>
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
const selectedFiles = ref([]);
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
    imagePreviews.value = newMemo.photoUrls ? newMemo.photoUrls.map(url => ({ url, source: 'existing' })) : [];
  } else {
    formData.value = { description: '', location: '', date: new Date().toISOString().split('T')[0], hashtags: [] };
    imagePreviews.value = [];
  }
  selectedFiles.value = [];
}, { immediate: true });

const toggleHashtag = (tag) => {
  const index = formData.value.hashtags.indexOf(tag);
  if (index > -1) {
    formData.value.hashtags.splice(index, 1);
  } else if (formData.value.hashtags.length < 3) {
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
    selectedFiles.value.push(file);
    imagePreviews.value.push({ url: URL.createObjectURL(file), source: 'new' });
  }
  event.target.value = null;
};

const removeImage = (index) => {
  const removed = imagePreviews.value.splice(index, 1)[0];
  if (removed.source === 'new') {
    const fileIndex = selectedFiles.value.findIndex(f => URL.createObjectURL(f) === removed.url);
    if (fileIndex > -1) {
      selectedFiles.value.splice(fileIndex, 1);
    }
  }
};

const uploadImages = async () => {
  isUploading.value = true;
  uploadProgress.value = 0;
  const uploadedUrls = [];

  const filesToUpload = selectedFiles.value;
  if (filesToUpload.length === 0) {
    isUploading.value = false;
    return [];
  }

  for (let i = 0; i < filesToUpload.length; i++) {
    const file = filesToUpload[i];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', props.cloudinaryUploadPreset);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${props.cloudinaryCloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.secure_url) {
        uploadedUrls.push(data.secure_url);
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
  return uploadedUrls;
};

const submitForm = async () => {
  isSubmitting.value = true;
  error.value = null;

  const newImageUrls = await uploadImages();
  if (newImageUrls === null) {
    isSubmitting.value = false;
    return;
  }

  const existingImageUrls = imagePreviews.value
    .filter(p => p.source === 'existing')
    .map(p => p.url);
  
  const finalPhotoUrls = [...existingImageUrls, ...newImageUrls];

  const payload = {
    ...formData.value,
    hashtags: formData.value.hashtags.map(tag => `#${tag}`),
    photoUrls: finalPhotoUrls,
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
.form-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.form-container {
  background: #2a2a2a;
  padding: 2rem;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid #444;
}
.form-row {
  display: flex;
  gap: 1rem;
}
.form-row .form-group {
  flex: 1;
}
.form-group {
  margin-bottom: 1rem;
}
label {
  display: block;
  margin-bottom: 0.5rem;
  color: #ccc;
}
input[type="text"], input[type="date"], textarea {
  width: 100%;
  padding: 0.8em;
  border: 1px solid #555;
  background-color: #333;
  color: #fff;
  border-radius: 6px;
}
textarea {
  min-height: 100px;
  resize: vertical;
}

.file-input-hidden { display: none; }
.file-upload-label {
  display: inline-block;
  padding: 0.7em 1.5em;
  background-color: #555;
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.3s;
}
.file-upload-label:hover { background-color: #666; }
.file-upload-label.disabled { opacity: 0.5; cursor: not-allowed; }

.upload-status { margin-top: 0.5rem; color: #42b883; }

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
}

.error-message { color: #ff6b6b; margin-bottom: 1rem; }

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}
.btn-cancel, .btn-submit {
  padding: 0.7em 1.5em;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}
.btn-cancel { background-color: #555; color: white; }
.btn-submit { background-color: #42b883; color: white; }
.btn-submit:disabled { background-color: #36a473; opacity: 0.6; }
</style>
