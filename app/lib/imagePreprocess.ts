"use client";

/**
 * レシート画像をOCR用にリサイズする
 *
 * ・iPhoneの12MP画像はそのままだとTesseract WASMがメモリ不足でクラッシュする
 * ・最大1500pxに縮小してBlob URLを返す（data URLはサイズが大きすぎてNG）
 * ・JPEG出力で軽量化（PNGのBase64は10MB超になる）
 * ・2値化はしない（Tesseract内部のSauvola法に任せる）
 */
export async function preprocessForOCR(file: File): Promise<string> {
  const MAX_LONG = 1500;

  return new Promise<string>((resolve) => {
    const img = new Image();
    const originalUrl = URL.createObjectURL(file);

    img.onload = () => {
      const longSide = Math.max(img.width, img.height);

      // 十分小さい画像ならそのまま返す
      if (longSide <= MAX_LONG) {
        console.log(`[preprocess] ${img.width}x${img.height} — small enough, using original`);
        resolve(originalUrl);
        return;
      }

      const scale = MAX_LONG / longSide;
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      console.log(`[preprocess] ${img.width}x${img.height} → ${w}x${h}`);

      try {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(originalUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(originalUrl);

        // Blob URL を返す（data URL の 1/10 以下のメモリ消費）
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const blobUrl = URL.createObjectURL(blob);
              console.log(`[preprocess] Resized blob: ${(blob.size / 1024).toFixed(0)}KB`);
              resolve(blobUrl);
            } else {
              // toBlob 失敗時は元のファイルから再作成
              resolve(URL.createObjectURL(file));
            }
          },
          "image/jpeg",
          0.92
        );
      } catch (e) {
        console.error("[preprocess] Error:", e);
        resolve(originalUrl);
      }
    };

    img.onerror = () => {
      console.error("[preprocess] Image load failed");
      resolve(originalUrl);
    };

    img.src = originalUrl;
  });
}
