/**
 * Compresses and resizes an uploaded image to WebP format.
 * Ensures the output string stays under the 1MB Server Action payload limit.
 */
export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        const MAX_WIDTH = width > height ? 1920 : 1080;
        const MAX_HEIGHT = width > height ? 1080 : 1920;
        
        if (width > MAX_WIDTH) { 
          height = Math.round((height * MAX_WIDTH) / width); 
          width = MAX_WIDTH; 
        }
        if (height > MAX_HEIGHT) { 
          width = Math.round((width * MAX_HEIGHT) / height); 
          height = MAX_HEIGHT; 
        }
        
        canvas.width = width; 
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        let quality = 0.9;
        let dataUrl = canvas.toDataURL('image/webp', quality);
        
        while (dataUrl.length > 1000000 && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/webp', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
  });
};

/**
 * Formats a date string into a readable format.
 */
export const formatDate = (dateStr: string | Date, showTime: boolean) => {
  const d = new Date(dateStr);
  return showTime ? d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : d.toLocaleDateString();
};