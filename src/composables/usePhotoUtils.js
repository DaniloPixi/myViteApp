const MEDIA_PRESETS = {
  preview: { width: 160, height: 160, crop: 'fill' },
  thumbnail: { width: 320, height: 320, crop: 'fill' },
  card: { width: 600, height: 420, crop: 'fill' },
  modal: { width: 1400, height: 1400, crop: 'limit' },
};

function transformUrl(originalUrl, options = {}, video = false, poster = false) {
  let url;
  try {
    url = new URL(originalUrl);
  } catch {
    return originalUrl;
  }
  if (url.hostname !== 'res.cloudinary.com' || !url.pathname.includes('/upload/'))
    return originalUrl;
  const { width, height, crop = 'limit', quality = 'auto' } = options;
  const transforms = ['c_' + crop];
  if (crop === 'fill') transforms.push('g_auto');
  if (width) transforms.push('w_' + width);
  if (height) transforms.push('h_' + height);
  if (poster) {
    // Force a still frame for every video extension, including MOV and WebM.
    url.pathname = url.pathname.replace(/\.[^/.]+$/, '') + '.jpg';
    transforms.push('so_0');
  }
  const format = video && !poster ? 'f_auto:video' : 'f_auto';
  url.pathname = url.pathname.replace(
    '/upload/',
    '/upload/' + transforms.join(',') + '/' + format + '/q_' + quality + '/'
  );
  return url.href;
}

export function usePhotoUtils() {
  const getImageUrl = (url, options = {}) => transformUrl(url, options);
  const getImageUrlByPreset = (url, preset = 'thumbnail', overrides = {}) =>
    getImageUrl(url, { ...(MEDIA_PRESETS[preset] || MEDIA_PRESETS.thumbnail), ...overrides });
  const getMediaThumbnail = (media, preset = 'thumbnail', overrides = {}) =>
    transformUrl(
      media.url,
      { ...(MEDIA_PRESETS[preset] || MEDIA_PRESETS.thumbnail), ...overrides },
      media.resource_type === 'video',
      media.resource_type === 'video'
    );
  const getImageSrcSet = (url, preset = 'modal') => {
    if (!/^https:\/\/res\.cloudinary\.com\//.test(url || '')) return undefined;
    const options = MEDIA_PRESETS[preset] || MEDIA_PRESETS.thumbnail;
    const widths = preset === 'modal' ? [480, 800, 1200, 1600, 2000] : [160, 320, 480, 640];
    return widths
      .map((width) => {
        // Width descriptors must describe the actual width. Do not constrain the
        // height of portrait fullscreen photos to a square bounding box.
        const height =
          preset === 'modal' ? undefined : Math.round((width * options.height) / options.width);
        return getImageUrl(url, { ...options, width, height }) + ' ' + width + 'w';
      })
      .join(', ');
  };
  const getVideoUrl = (url, { width = 1200 } = {}) => transformUrl(url, { width }, true);
  const getMediaSrcSet = (media, preset = 'thumbnail') => {
    if (!/^https:\/\/res\.cloudinary\.com\//.test(media.url || '')) return undefined;
    const options = MEDIA_PRESETS[preset] || MEDIA_PRESETS.thumbnail;
    const widths = preset === 'preview' ? [80, 160, 240] : [160, 320, 480, 640, 960, 1280];
    return widths
      .map(
        (width) =>
          getMediaThumbnail(media, preset, {
            width,
            height: Math.round((width * options.height) / options.width),
          }) +
          ' ' +
          width +
          'w'
      )
      .join(', ');
  };
  return {
    MEDIA_PRESETS,
    getImageUrl,
    getImageUrlByPreset,
    getMediaThumbnail,
    getMediaSrcSet,
    getImageSrcSet,
    getVideoUrl,
    getOptimizedUrl: getVideoUrl,
  };
}
