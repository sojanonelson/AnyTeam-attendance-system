export const uploadToCloudinary = async (file: File | string): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  // Check if environment variables are configured
  if (!cloudName || !uploadPreset || cloudName.startsWith('your_')) {
    console.log('Cloudinary not configured. Falling back to local Base64 storage.');
    if (typeof file === 'string') {
      return file;
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Cloudinary upload returned an error');
    }

    return data.secure_url;
  } catch (err: any) {
    console.error('Cloudinary upload error:', err);
    throw new Error(err.message || 'Failed to upload image to Cloudinary');
  }
};
