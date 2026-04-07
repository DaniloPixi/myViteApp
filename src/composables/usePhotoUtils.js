export function usePhotoUtils() {
  const MEDIA_PRESETS = {
    thumbnail: { width: 320, height: 320, crop: 'fill' },
    card: { width: 600, height: 420, crop: 'fill' },
    modal: { width: 1400, height: 1400, crop: 'fill' },
  };

  /**
   * Builds Cloudinary transformation params.
   * Includes: f_auto,q_auto,dpr_auto and (optionally) crop settings.
   */
  const buildTransformString = ({
    width,
    height,
    crop,
    gravity = 'auto',
    dpr = 'auto',
    quality = 'auto',
  } = {}) => {
    const transforms = ['f_auto', `q_${quality}`, `dpr_${dpr}`];

    if (crop) transforms.push(`c_${crop}`);
    if (crop && gravity) transforms.push(`g_${gravity}`);
    if (width) transforms.push(`w_${width}`);
    if (height) transforms.push(`h_${height}`);

    return transforms.join(',');
  };

  /**
   * General Cloudinary URL helper.
   */
  const getImageUrl = (originalUrl, options = {}) => {
    if (!originalUrl || !originalUrl.includes('res.cloudinary.com')) {
      return originalUrl;
    }

    const transformation = buildTransformString(options);
    return originalUrl.replace('/upload/', `/upload/${transformation}/`);
  };

  /**
   * Preset-based helper.
   */
  const getImageUrlByPreset = (originalUrl, preset = 'thumbnail', overrides = {}) => {
    const presetOptions = MEDIA_PRESETS[preset] || MEDIA_PRESETS.thumbnail;
    return getImageUrl(originalUrl, { ...presetOptions, ...overrides });
  };

  /**
   * Backward-compatible helper (legacy behavior).
   * Keeps old output pattern: w_{width},f_auto,q_auto
   */
  const getOptimizedUrl = (originalUrl, { width = 400 } = {}) => {
    if (!originalUrl || !originalUrl.includes('res.cloudinary.com')) {
      return originalUrl;
    }
    const transformation = `w_${width},f_auto,q_auto`;
    return originalUrl.replace('/upload/', `/upload/${transformation}/`);
  };

  return {
    MEDIA_PRESETS,
    getImageUrl,
    getImageUrlByPreset,
    getOptimizedUrl,
  };
}
