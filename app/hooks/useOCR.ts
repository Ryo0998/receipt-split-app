"use client";

import { useState } from "react";
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

/**
 * GPT-4o-mini Vision API を使ったレシートOCRフック
 *
 * 処理フロー:
 * 1. 画像をサーバーの /api/ocr に送信
 * 2. サーバーが GPT-4o-mini にレシート画像を送り、JSON で解析結果を取得
 * 3. 解析結果を ParsedReceipt 型で返す
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
    setState({
      status: "analyzing",
      parsed: null,
      rawText: null,
      imageUrl: null,
      error: null,
      progress: 0,
    });

    try {
      // プログレス表示（API呼び出しは進捗が取れないので疑似的に進める）
      setState((p) => ({ ...p, progress: 10 }));

      const fd = new FormData();
      fd.append("image", file);

      // 疑似プログレスバー（API応答を待つ間）
      const progressInterval = setInterval(() => {
        setState((p) => ({
          ...p,
          progress: Math.min(p.progress + 5, 85),
        }));
      }, 800);

      const res = await fetch("/api/ocr", {
        method: "POST",
        body: fd,
      });

      clearInterval(progressInterval);
      setState((p) => ({ ...p, progress: 90 }));

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `サーバーエラー (${res.status})` }));
        throw new Error(errData.error || `サーバーエラー (${res.status})`);
      }

      const data = await res.json();
      setState((p) => ({ ...p, progress: 95 }));

      if (data.error) {
        throw new Error(data.error);
      }

      const parsed: ParsedReceipt = data.parsed;
      const imageUrl: string | null = data.imageUrl || null;

      console.log("[useOCR] Parsed:", parsed);

      setState({
        status: "done",
        parsed,
        rawText: JSON.stringify(parsed, null, 2),
        imageUrl,
        error: null,
        progress: 100,
      });
    } catch (err) {
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
