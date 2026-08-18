/**
 * Compresses an image before it is sent to the AI provider.
 *
 * Full-resolution photos (often 3-12 MB) are the #1 cause of slow requests:
 * base64 inflates them by ~33% and the provider must ingest every pixel.
 * Downscaling to a sane max dimension and re-encoding as JPEG keeps the
 * quality more than sufficient for OCR/homework pages while cutting the
 * payload by 10-50x.
 *
 * Non-image files (PDF, text, ...) are returned unchanged.
 */
export async function compressImageForAI(
  imageFile: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<{ blob: Blob; mimeType: string }> {
  if (!imageFile.type.startsWith("image/")) {
    return { blob: imageFile, mimeType: imageFile.type };
  }

  try {
    const bitmap = await createImageBitmap(imageFile);
    try {
      const scale = Math.min(
        1,
        maxDimension / Math.max(bitmap.width, bitmap.height)
      );
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) {
        return { blob: imageFile, mimeType: imageFile.type };
      }

      // White background: homework pages are documents, not transparent PNGs
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality)
      );

      if (!blob) {
        return { blob: imageFile, mimeType: imageFile.type };
      }

      return { blob, mimeType: "image/jpeg" };
    } finally {
      bitmap.close();
    }
  } catch (error) {
    console.warn("Image compression failed, using original file:", error);
    return { blob: imageFile, mimeType: imageFile.type };
  }
}
