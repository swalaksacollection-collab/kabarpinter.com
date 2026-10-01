// Browser-only: decode a photo (honouring EXIF orientation), scale it down and
// re-encode as JPEG. Phone photos are 3-8 MB; this keeps uploads ~100-400 KB.
import { fitWithin } from "./application";

export async function resizeToJpeg(file: File, maxSide: number, square = false): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Browser tidak mendukung pemrosesan gambar.");

    if (square) {
      const side = Math.min(bitmap.width, bitmap.height);
      const target = Math.min(side, maxSide);
      canvas.width = target;
      canvas.height = target;
      ctx.drawImage(
        bitmap,
        Math.floor((bitmap.width - side) / 2),
        Math.floor((bitmap.height - side) / 2),
        side,
        side,
        0,
        0,
        target,
        target
      );
    } else {
      const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(bitmap, 0, 0, width, height);
    }

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Gagal memproses gambar."))),
        "image/jpeg",
        0.85
      )
    );
  } finally {
    bitmap.close();
  }
}
