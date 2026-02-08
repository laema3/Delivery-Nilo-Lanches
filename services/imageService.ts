
/**
 * Redimensiona e comprime uma imagem (base64 ou URL) para garantir que caiba no limite do Firestore (1MB).
 * Converte obrigatoriamente para JPEG para máxima economia de espaço.
 */
export const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.6): Promise<string> => {
  return new Promise((resolve) => {
    if (!base64Str) return resolve("");
    
    if (!base64Str.startsWith('data:') && !base64Str.startsWith('http')) {
      return resolve(base64Str);
    }

    const img = new Image();
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
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        let compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        
        // Se ainda for muito grande (raro em JPEG), reduz qualidade agressivamente
        if (compressedBase64.length > 850000) {
          compressedBase64 = canvas.toDataURL('image/jpeg', 0.4);
        }
        
        resolve(compressedBase64);
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
  });
};
