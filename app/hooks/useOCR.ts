"use client";

import { useState } from "react";
import type { ParsedReceipt } from "@/types/receipt";

type OcrStatus = "idle" | "analyzing" | "done" | "error";

interface OcrState {
  status: OcrStatus;
  parsed: ParsedReceipt | null;
  imageUrl: string | null;
  error: string | null;
}

export function useOCR() {
  const [state, setState] = useState<OcrState>({
    status: "idle",
    parsed: null,
    imageUrl: null,
    error: null,
  });

  const analyze = async (file: File) => {
    console.log("[useOCR] Starting analysis for:", file.name);
    setState({ status: "analyzing", parsed: null, imageUrl: null, error: null });

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/ocr", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "OCR解析に失敗しました");
      }

      console.log("[useOCR] Success:", data.parsed);
      setState({
        status: "done",
        parsed: data.parsed,
        imageUrl: data.imageUrl,
        error: null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "エラーが発生しました";
      console.error("[useOCR] Error:", err);
      setState({ status: "error", parsed: null, imageUrl: null, error: msg });
    }
  };

  const reset = () => {
    setState({ status: "idle", parsed: null, imageUrl: null, error: null });
  };

  return { ...state, analyze, reset };
}
