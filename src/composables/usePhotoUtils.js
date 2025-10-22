
export function usePhotoUtils() {
  /**
   * Generates an optimized Cloudinary URL.
   * @param {string} originalUrl - The original Cloudinary image URL.
   * @param {object} options - The transformation options.
   * @param {number} [options.width=400] - The target width of the image.
   * @returns {string} The new URL with optimization parameters.
   */
  const getOptimizedUrl = (originalUrl, { width = 400 } = {}) => {
    if (!originalUrl || !originalUrl.includes('res.cloudinary.com')) {
      return originalUrl;
    }
    const transformation = `w_${width},f_auto,q_auto`;
    return originalUrl.replace('/upload/', `/upload/${transformation}/`);
  };

  return { getOptimizedUrl };
}
