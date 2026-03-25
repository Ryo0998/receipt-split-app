"use client";

import { useState } from "react";
import { parseReceiptText } from "@/app/lib/parseReceipt";
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

    const previewUrl = URL.createObjectURL(file);

    try {
      // Dynamic import to avoid SSR
      const { createWorker } = await import("tesseract.js");

      setState((prev) => ({ ...prev, progress: 5 }));

      const worker = await createWorker("jpn", 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setState((prev) => ({
              ...prev,
              progress: 10 + Math.round(m.progress * 85),
            }));
          }
        },
      });

      const { data } = await worker.recognize(previewUrl);
      await worker.terminate();
      URL.revokeObjectURL(previewUrl);

      console.log("[useOCR] Raw text:\n", data.text.slice(0, 400));

      // 画像をサーバーに保存（失敗しても続行）
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
      URL.revokeObjectURL(previewUrl);
      setState({ status: "error", parsed: null, imageUrl: null, error: msg, progress: 0 });
    }
  };

  const reset = () =>
    setState({ status: "idle", parsed: null, imageUrl: null, error: null, progress: 0 });

  return { ...state, analyze, reset };
}
