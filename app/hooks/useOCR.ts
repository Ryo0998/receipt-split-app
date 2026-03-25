"use client";

import { useState } from "react";
import { parseReceiptText } from "@/app/lib/parseReceipt";
import { preprocessForOCR } from "@/app/lib/imagePreprocess";
import type { ParsedReceipt } from "@/types/receipt";

type OcrStatus = "idle" | "analyzing" | "done" | "error";

interface OcrState {
  status: OcrStatus;
  parsed: ParsedReceipt | null;
  imageUrl: string | null;
  error: string | null;
  progress: number; // 0-100
}

/**
 * iPhone（ブラウザ）上でTesseract.jsを実行するフック
 * サーバー不要・APIキー不要・完全無料
 * 前処理: 適応的2値化 → Tesseract（PSM=4, OEM=1）
 */
export function useOCR() {
  const [state, setState] = useState<OcrState>({
    status: "idle",
    parsed: null,
    imageUrl: null,
    error: null,
    progress: 0,
  });

  const analyze = async (file: File) => {
    setState({ status: "analyzing", parsed: null, imageUrl: null, error: null, progress: 0 });

    try {
      // ---- Step 1: 画像前処理（適応的2値化・拡大）----
      setState((prev) => ({ ...prev, progress: 3 }));
      let processedDataUrl: string;
      try {
        processedDataUrl = await preprocessForOCR(file);
      } catch {
        // 前処理失敗時はオリジナルをそのまま使う
        processedDataUrl = URL.createObjectURL(file);
      }
      setState((prev) => ({ ...prev, progress: 8 }));

      // ---- Step 2: Tesseract.js OCR ----
      const { createWorker } = await import("tesseract.js");

      const worker = await createWorker("jpn", 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setState((prev) => ({
              ...prev,
              progress: 10 + Math.round(m.progress * 80),
            }));
          }
        },
      });

      // PSM.SINGLE_COLUMN (4): 単一カラムのテキスト（レシートに最適）
      const { PSM } = await import("tesseract.js");
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_COLUMN,
      });

      const { data } = await worker.recognize(processedDataUrl);
      await worker.terminate();

      console.log("[useOCR] Raw OCR text:\n", data.text.slice(0, 600));

      // ---- Step 3: 画像をサーバーに保存（失敗しても続行）----
      setState((prev) => ({ ...prev, progress: 92 }));
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

      setState({ status: "done", parsed, imageUrl, error: null, progress: 100 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "OCRエラーが発生しました";
      console.error("[useOCR] Error:", err);
      setState({ status: "error", parsed: null, imageUrl: null, error: msg, progress: 0 });
    }
  };

  const reset = () =>
    setState({ status: "idle", parsed: null, imageUrl: null, error: null, progress: 0 });

  return { ...state, analyze, reset };
}
