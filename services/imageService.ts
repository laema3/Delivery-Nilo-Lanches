
/**
 * Redimensiona e comprime uma imagem (base64 ou URL) para garantir que caiba no limite do Firestore (1MB).
 */
export const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    if (!base64Str || (!base64Str.startsWith('data:') && !base64Str.startsWith('http'))) {
      return resolve(base64Str);
    }

    const img = new Image();
    // Crucial para evitar "SecurityError: Failed to execute 'toDataURL' on 'HTMLCanvasElement': Tainted canvases may not be exported."
    if (base64Str.startsWith('http')) {
      img.crossOrigin = "anonymous";
    }
    
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Exporta como JPEG para melhor compressão
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
  });
};
