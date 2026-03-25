"use client";

import { useState } from "react";
import { parseReceiptText } from "@/app/lib/parseReceipt";
import { preprocessForOCR } from "@/app/lib/imagePreprocess";
import type { ParsedReceipt } from "@/types/receipt";

type OcrStatus = "idle" | "analyzing" | "done" | "error";

interface OcrState {
  status: OcrStatus;
  parsed: ParsedReceipt | null;
  rawText: string | null;
  imageUrl: string | null;
  error: string | null;
  progress: number; // 0-100
}

/**
 * iPhone（ブラウザ）上でTesseract.jsを実行するフック
 *
 * 処理フロー:
 * 1. リサイズ + グレースケール + コントラスト強調（2値化はしない）
 * 2. Tesseract.js jpn（best_intモデル自動使用）PSM=AUTO
 * 3. parseReceiptText でレシート情報を抽出
 */
export function useOCR() {
  const [state, setState] = useState<OcrState>({
    status: "idle",
    parsed: null,
    rawText: null,
    imageUrl: null,
    error: null,
    progress: 0,
  });

  const analyze = async (file: File) => {
    setState({ status: "analyzing", parsed: null, rawText: null, imageUrl: null, error: null, progress: 0 });

    try {
      // ---- Step 1: 画像前処理（リサイズ + グレースケール + コントラスト）----
      // ※2値化はTesseractの内部Sauvola法に任せる
      setState((prev) => ({ ...prev, progress: 3 }));
      let processedDataUrl: string;
      try {
        processedDataUrl = await preprocessForOCR(file);
        setState((prev) => ({ ...prev, progress: 10 }));
      } catch (prepErr) {
        console.warn("[useOCR] Preprocessing failed, using original:", prepErr);
        processedDataUrl = URL.createObjectURL(file);
        setState((prev) => ({ ...prev, progress: 10 }));
      }

      // ---- Step 2: Tesseract.js OCR ----
      // v7はLSTMモード時にbest_int（高精度）モデルを自動使用
      const { createWorker, PSM } = await import("tesseract.js");

      const worker = await createWorker("jpn", 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setState((prev) => ({
              ...prev,
              progress: 15 + Math.round(m.progress * 75),
            }));
          }
        },
      });

      // PSM.AUTO: Tesseractにレイアウト自動判定させる
      // （レシートは1カラムだが、AUTO の方が行認識が安定する場合がある）
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
      });

      const { data } = await worker.recognize(processedDataUrl);
      await worker.terminate();

      console.log("[useOCR] Raw OCR text:\n", data.text);
      console.log("[useOCR] Confidence:", data.confidence);
      setState((prev) => ({ ...prev, progress: 92 }));

      // ---- Step 3: 画像をサーバーに保存（失敗しても続行）----
      let imageUrl: string | null = null;
      try {
        const fd = new FormData();
        fd.append("image", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (res.ok) ({ imageUrl } = await res.json());
      } catch {
        // 画像保存失敗は非致命的
      }

      const parsed = parseReceiptText(data.text);
      console.log("[useOCR] Parsed:", parsed);

      setState({ status: "done", parsed, rawText: data.text, imageUrl, error: null, progress: 100 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "OCRエラーが発生しました";
      console.error("[useOCR] Error:", err);
      setState({ status: "error", parsed: null, rawText: null, imageUrl: null, error: msg, progress: 0 });
    }
  };

  const reset = () =>
    setState({ status: "idle", parsed: null, rawText: null, imageUrl: null, error: null, progress: 0 });

  return { ...state, analyze, reset };
}
