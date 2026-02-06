
/**
 * Redimensiona e comprime uma imagem (base64 ou URL) para garantir que caiba no limite do Firestore (1MB).
 * Ajustado para 512px para garantir compatibilidade com ícones de app PWA.
 */
export const compressImage = (base64Str: string, maxWidth = 512, maxHeight = 512, quality = 0.85): Promise<string> => {
  return new Promise((resolve) => {
    if (!base64Str || (!base64Str.startsWith('data:') && !base64Str.startsWith('http'))) {
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

      // Mantém a proporção mas limita ao tamanho de ícone padrão
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
        // Exporta como PNG para manter transparência se houver, ou JPEG para economia
        resolve(canvas.toDataURL('image/png', quality));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
  });
};
