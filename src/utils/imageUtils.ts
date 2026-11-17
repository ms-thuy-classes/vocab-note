export async function compressImageToDataUrl(
  fileOrBlob: Blob,
  maxDimension = 420,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(fileOrBlob);
  });
}

export interface WikimediaImageResult {
  title: string;
  url: string;
  thumbUrl: string;
}

interface WikimediaPage {
  title?: string;
  imageinfo?: Array<{
    url?: string;
    thumburl?: string;
    mime?: string;
  }>;
}

export async function searchWikimediaImages(query: string): Promise<WikimediaImageResult[]> {
  const clean = query.trim();
  if (!clean) return [];

  const endpoint = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
    clean
  )}&gsrlimit=12&prop=imageinfo&iiprop=url|mime&iiurlwidth=360&format=json&origin=*`;

  const res = await fetch(endpoint);
  if (!res.ok) {
    throw new Error('Image search unavailable.');
  }

  const json = (await res.json()) as {
    query?: { pages?: Record<string, WikimediaPage> };
  };
  const pages = json.query?.pages ? Object.values(json.query.pages) : [];

  const results: WikimediaImageResult[] = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const mime = info.mime || '';
    if (!mime.startsWith('image/')) continue;
    const thumb = info.thumburl || info.url;
    if (!thumb) continue;
    results.push({
      title: (page.title || clean).replace(/^File:/i, '').replace(/\.[^.]+$/, ''),
      url: info.url || thumb,
      thumbUrl: thumb,
    });
  }
  return results;
}
