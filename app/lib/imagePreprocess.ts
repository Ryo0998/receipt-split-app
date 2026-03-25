"use client";

/**
 * レシート画像をOCR前に前処理する
 * - グレースケール変換
 * - 拡大（低解像度画像対策）
 * - 適応的2値化（Adaptive Thresholding）でテキストを鮮明化
 */
export async function preprocessForOCR(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        // 幅が小さければ拡大（最低1200px幅で精度向上）
        const TARGET_WIDTH = 1200;
        const scale = img.width < TARGET_WIDTH ? Math.min(TARGET_WIDTH / img.width, 3) : 1;
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve(objectUrl); // フォールバック
          return;
        }

        // 白背景で描画
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(objectUrl);

        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        // ---- Step 1: グレースケール ----
        const gray = new Uint8Array(w * h);
        for (let i = 0; i < w * h; i++) {
          const r = data[i * 4];
          const g = data[i * 4 + 1];
          const b = data[i * 4 + 2];
          gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        }

        // ---- Step 2: 積分画像（Integral Image）の計算 ----
        // 適応的閾値化のためにローカル平均を効率計算
        const BLOCK = Math.max(15, Math.round(w / 20)); // ブロックサイズ（幅の1/20程度）
        const C = 8; // 閾値調整定数（大きいほど文字が細くなる）

        const integral = new Float64Array((w + 1) * (h + 1));
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            integral[(y + 1) * (w + 1) + (x + 1)] =
              gray[y * w + x] +
              integral[y * (w + 1) + (x + 1)] +
              integral[(y + 1) * (w + 1) + x] -
              integral[y * (w + 1) + x];
          }
        }

        // ---- Step 3: 適応的2値化 ----
        for (let i = 0; i < w * h; i++) {
          const x = i % w;
          const y = Math.floor(i / w);

          const x1 = Math.max(0, x - BLOCK);
          const y1 = Math.max(0, y - BLOCK);
          const x2 = Math.min(w - 1, x + BLOCK);
          const y2 = Math.min(h - 1, y + BLOCK);

          const count = (x2 - x1 + 1) * (y2 - y1 + 1);
          const sum =
            integral[(y2 + 1) * (w + 1) + (x2 + 1)] -
            integral[y1 * (w + 1) + (x2 + 1)] -
            integral[(y2 + 1) * (w + 1) + x1] +
            integral[y1 * (w + 1) + x1];

          const localMean = sum / count;
          const v = gray[i] < localMean - C ? 0 : 255;

          data[i * 4] = v;
          data[i * 4 + 1] = v;
          data[i * 4 + 2] = v;
          data[i * 4 + 3] = 255;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        URL.revokeObjectURL(objectUrl);
        reject(e);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("画像の読み込みに失敗しました"));
    };

    img.src = objectUrl;
  });
}
