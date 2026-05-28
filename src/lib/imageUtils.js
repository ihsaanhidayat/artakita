/**
 * imageUtils.js
 * Compress & resize gambar di browser sebelum upload ke Supabase Storage.
 * Tidak ada dependency external — murni Canvas API bawaan browser.
 * Target: max 2MB, max 1920px di sisi terpanjang, JPEG quality adaptive.
 */

const MAX_SIZE_BYTES  = 2 * 1024 * 1024; // 2MB
const MAX_DIMENSION   = 1920;             // px
const INITIAL_QUALITY = 0.85;

/**
 * Compress File/Blob gambar ke max 2MB
 * @param {File} file - File gambar input (JPEG/PNG/WEBP)
 * @returns {Promise<Blob>} - Blob terkompresi
 */
export const compressImage = (file) =>
  new Promise((resolve, reject) => {
    // Validasi tipe
    if (!file.type.startsWith("image/")) {
      reject(new Error("File bukan gambar."));
      return;
    }

    // Jika sudah < 2MB, skip compress
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
        // Hitung dimensi baru
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
        const ctx     = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Adaptive quality — turunkan sampai < 2MB
        const tryCompress = (quality) => {
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
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

/**
 * Upload foto ke Supabase Storage dengan compress otomatis
 * @param {File} file
 * @param {string} path - Storage path, cth: "receipts/user_id/txn_id.jpg"
 * @param {object} supabase - Supabase client
 * @returns {Promise<string>} - Public URL foto
 */
export const uploadPhoto = async (file, path, supabase) => {
  const compressed = await compressImage(file);

  const { error } = await supabase.storage
    .from("artakita_bucket")
    .upload(path, compressed, {
      contentType:  "image/jpeg",
      upsert:       true,
      cacheControl: "3600",
    });

  if (error) throw new Error("Upload gagal: " + error.message);

  const { data } = supabase.storage
    .from("artakita_bucket")
    .getPublicUrl(path);

  return data.publicUrl;
};

/**
 * Hapus foto dari Supabase Storage
 * @param {string} path - Storage path
 * @param {object} supabase - Supabase client
 */
export const deletePhoto = async (path, supabase) => {
  await supabase.storage.from("artakita_bucket").remove([path]);
};
