"use client";

import { useState } from "react";
import { parseReceiptText } from "@/app/lib/parseReceipt";
import { preprocessForOCR } from "@/app/lib/imagePreprocess";
import type { ParsedReceipt } from "@/types/receipt";

type OcrStatus = "idle" | "analyzing" | "done" | "error";

interface OcrState {
  status: OcrStatus;
  parsed: ParsedReceipt | null;
  rawText: string | null; // デバッグ用
  imageUrl: string | null;
  error: string | null;
  progress: number; // 0-100
}

/**
 * iPhone（ブラウザ）上でTesseract.jsを実行するフック
 * サーバー不要・APIキー不要・完全無料
 *
 * 処理フロー:
 * 1. 画像を最大1600pxにリサイズ（メモリ節約）
 * 2. Otsu法で2値化（テキスト/背景を鮮明分離）
 * 3. Tesseract.js jpn+eng で OCR（日本語+英数字）
 * 4. parseReceiptText でレシート情報を抽出
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
      // ---- Step 1: 画像前処理（リサイズ + Otsu 2値化）----
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

      // ---- Step 2: Tesseract.js OCR（日本語 + 英数字）----
      const { createWorker, PSM } = await import("tesseract.js");

      // jpn+eng: 日本語テキスト + 数字・記号の精度向上
      const worker = await createWorker("jpn+eng", 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setState((prev) => ({
              ...prev,
              progress: 15 + Math.round(m.progress * 75),
            }));
          }
        },
      });

      // PSM.SINGLE_COLUMN: 縦長1カラムのレシートに最適
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_COLUMN,
      });

      const { data } = await worker.recognize(processedDataUrl);
      await worker.terminate();

      console.log("[useOCR] Raw OCR text:\n", data.text);
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
