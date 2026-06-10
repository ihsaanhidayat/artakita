import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_SIZE_BYTES  = 2 * 1024 * 1024;
const MAX_DIMENSION   = 1920;
const INITIAL_QUALITY = 0.85;

export const compressImage = (file: File): Promise<Blob> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("File bukan gambar."));
      return;
    }

    if (file.size <= MAX_SIZE_BYTES) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal memuat gambar."));
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width >= height) {
            height = Math.round((height / width) * MAX_DIMENSION);
            width  = MAX_DIMENSION;
          } else {
            width  = Math.round((width / height) * MAX_DIMENSION);
            height = MAX_DIMENSION;
          }
        }

        const canvas  = document.createElement("canvas");
        canvas.width  = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas context tidak tersedia.")); return; }
        ctx.drawImage(img, 0, 0, width, height);

        const tryCompress = (quality: number): void => {
          canvas.toBlob(
            (blob) => {
              if (!blob) { reject(new Error("Canvas toBlob gagal.")); return; }
              if (blob.size <= MAX_SIZE_BYTES || quality <= 0.3) {
                resolve(blob);
              } else {
                tryCompress(quality - 0.1);
              }
            },
            "image/jpeg",
            quality
          );
        };

        tryCompress(INITIAL_QUALITY);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });

export const uploadPhoto = async (
  file: File,
  path: string,
  supabaseClient: SupabaseClient
): Promise<string> => {
  const compressed = await compressImage(file);

  const { error } = await supabaseClient.storage
    .from("artakita_bucket")
    .upload(path, compressed, {
      contentType:  "image/jpeg",
      upsert:       true,
      cacheControl: "3600",
    });

  if (error) throw new Error("Upload gagal: " + error.message);

  const { data } = supabaseClient.storage
    .from("artakita_bucket")
    .getPublicUrl(path);

  return data.publicUrl;
};

export const deletePhoto = async (
  path: string,
  supabaseClient: SupabaseClient
): Promise<void> => {
  await supabaseClient.storage.from("artakita_bucket").remove([path]);
};
