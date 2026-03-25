"use client";

/**
 * レシート画像をOCR前に前処理する
 * 1. 最大サイズにリサイズ（iPhoneの12MP画像はメモリを大量消費するため必須）
 * 2. グレースケール変換
 * 3. Otsu法による自動2値化
 */
export async function preprocessForOCR(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        // ---- Step 1: 最大1600pxに収まるようリサイズ ----
        // iPhoneの12MPは処理できないので必ずダウンサイズ
        const MAX_LONG = 1600;
        const longSide = Math.max(img.width, img.height);
        const scale = longSide > MAX_LONG ? MAX_LONG / longSide : 1;
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);

        console.log(`[preprocess] Original: ${img.width}x${img.height} → Resized: ${w}x${h}`);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve(objectUrl);
          return;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(objectUrl);

        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        const n = w * h;

        // ---- Step 2: グレースケール + ヒストグラム構築 ----
        const gray = new Uint8Array(n);
        const hist = new Int32Array(256);
        for (let i = 0; i < n; i++) {
          const v = Math.round(
            0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
          );
          gray[i] = v;
          hist[v]++;
        }

        // ---- Step 3: Otsu法で最適閾値を求める ----
        let total = 0;
        for (let t = 0; t < 256; t++) total += t * hist[t];
        let sumB = 0,
          wB = 0,
          maxVar = 0,
          threshold = 128;
        for (let t = 0; t < 256; t++) {
          wB += hist[t];
          if (wB === 0) continue;
          const wF = n - wB;
          if (wF === 0) break;
          sumB += t * hist[t];
          const mB = sumB / wB;
          const mF = (total - sumB) / wF;
          const varBetween = wB * wF * (mB - mF) ** 2;
          if (varBetween > maxVar) {
            maxVar = varBetween;
            threshold = t;
          }
        }

        console.log(`[preprocess] Otsu threshold: ${threshold}`);

        // ---- Step 4: 2値化（コントラスト強調） ----
        // 閾値付近はより明確に白黒に分離（softerなOtsu）
        for (let i = 0; i < n; i++) {
          const v = gray[i] > threshold ? 255 : 0;
          data[i * 4] = v;
          data[i * 4 + 1] = v;
          data[i * 4 + 2] = v;
          data[i * 4 + 3] = 255;
        }

        ctx.putImageData(imageData, 0, 0);
        const result = canvas.toDataURL("image/png");
        console.log(`[preprocess] Done. DataURL length: ${result.length}`);
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
