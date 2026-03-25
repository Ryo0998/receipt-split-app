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
  progress: number;
}

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
    setState({
      status: "analyzing",
      parsed: null,
      rawText: null,
      imageUrl: null,
      error: null,
      progress: 0,
    });

    let blobUrl: string | null = null;

    try {
      // ---- Step 1: リサイズ（Blob URL を返す）----
      setState((p) => ({ ...p, progress: 3 }));
      blobUrl = await preprocessForOCR(file);
      setState((p) => ({ ...p, progress: 8 }));

      // ---- Step 2: Tesseract.js OCR ----
      const Tesseract = await import("tesseract.js");
      setState((p) => ({ ...p, progress: 10 }));

      const worker = await Tesseract.createWorker("jpn", Tesseract.OEM.LSTM_ONLY, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setState((p) => ({
              ...p,
              progress: 15 + Math.round(m.progress * 75),
            }));
          }
        },
      });

      const { data } = await worker.recognize(blobUrl);
      await worker.terminate();

      // Blob URL を解放
      URL.revokeObjectURL(blobUrl);
      blobUrl = null;

      console.log("[useOCR] Confidence:", data.confidence);
      console.log("[useOCR] Raw text:\n", data.text);
      setState((p) => ({ ...p, progress: 93 }));

      // ---- Step 3: 画像アップロード（失敗しても続行）----
      let imageUrl: string | null = null;
      try {
        const fd = new FormData();
        fd.append("image", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (res.ok) ({ imageUrl } = await res.json());
      } catch {
        /* 非致命的 */
      }

      // ---- Step 4: テキスト解析 ----
      const parsed = parseReceiptText(data.text);
      console.log("[useOCR] Parsed:", parsed);

      setState({
        status: "done",
        parsed,
        rawText: data.text,
        imageUrl,
        error: null,
        progress: 100,
      });
    } catch (err) {
      // Blob URL が残っていたら解放
      if (blobUrl) {
        try { URL.revokeObjectURL(blobUrl); } catch { /* noop */ }
      }
      const msg = err instanceof Error ? err.message : "OCRエラーが発生しました";
      console.error("[useOCR] Error:", err);
      setState({
        status: "error",
        parsed: null,
        rawText: null,
        imageUrl: null,
        error: msg,
        progress: 0,
      });
    }
  };

  const reset = () =>
    setState({
      status: "idle",
      parsed: null,
      rawText: null,
      imageUrl: null,
      error: null,
      progress: 0,
    });

  return { ...state, analyze, reset };
}
