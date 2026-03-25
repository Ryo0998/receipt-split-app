"use client";

/**
 * レシート画像をOCR前に前処理する
 *
 * 重要: Tesseract.js は内部で独自の2値化（Sauvola法）を行うため、
 * ここでOtsu等の2値化を行うと精度が落ちる。
 * リサイズ + グレースケール + コントラスト強調のみ行い、
 * 2値化はTesseractの内部処理に任せる。
 */
export async function preprocessForOCR(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        // ---- Step 1: リサイズ（メモリ節約 + Tesseractの処理速度向上）----
        const MAX_LONG = 2000;
        const longSide = Math.max(img.width, img.height);
        const scale = longSide > MAX_LONG ? MAX_LONG / longSide : 1;
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);

        console.log(`[preprocess] ${img.width}x${img.height} → ${w}x${h} (scale=${scale.toFixed(2)})`);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve(objectUrl);
          return;
        }

        // ---- Step 2: グレースケール + コントラスト強調（CSS Filter）----
        // Canvas CSS Filter（GPU高速処理）
        // ・grayscale(1): カラーノイズ除去
        // ・contrast(1.5): テキストと背景の差を強調
        // ・2値化はしない（Tesseract内部のSauvolaに任せる）
        const supportsFilter = typeof ctx.filter === "string";

        if (supportsFilter) {
          ctx.filter = "grayscale(1) contrast(1.5)";
          ctx.drawImage(img, 0, 0, w, h);
          ctx.filter = "none";
          console.log("[preprocess] Used CSS filter (GPU-accelerated)");
        } else {
          // フォールバック: 手動でグレースケール+コントラスト
          ctx.drawImage(img, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            // contrast 1.5x
            gray = Math.min(255, Math.max(0, (gray - 128) * 1.5 + 128));
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
          }
          ctx.putImageData(imageData, 0, 0);
          console.log("[preprocess] Used manual pixel processing (fallback)");
        }

        URL.revokeObjectURL(objectUrl);

        // ---- Step 3: シャープ化（Canvasで近似的に実施）----
        // 一度縮小して拡大することでアンチエイリアスを再適用
        // → 代わりにimageSmoothingをオフにして鮮鋭な画像を維持
        const result = canvas.toDataURL("image/png");
        console.log(`[preprocess] Done. Output size: ${(result.length / 1024).toFixed(0)}KB`);
        resolve(result);
      } catch (e) {
        console.error("[preprocess] Error:", e);
        URL.revokeObjectURL(objectUrl);
        reject(e);
      }
    };

    img.onerror = (e) => {
      console.error("[preprocess] Image load error:", e);
      URL.revokeObjectURL(objectUrl);
      reject(new Error("画像の読み込みに失敗しました"));
    };

    img.src = objectUrl;
  });
}
