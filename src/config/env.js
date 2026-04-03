const inferDefaultAppEnv = () => {
  if (import.meta.env.VITE_APP_ENV) return String(import.meta.env.VITE_APP_ENV);
  return import.meta.env.PROD ? 'production' : 'staging';
};

export const APP_ENV = inferDefaultAppEnv();
export const IS_PRODUCTION_ENV = APP_ENV === 'production';
export const IS_TEST_MODE = String(import.meta.env.VITE_TEST_MODE || 'false') === 'true';

export const CLOUDINARY_CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dknmcj1qj';

export const CLOUDINARY_UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'memos_and_moments';
