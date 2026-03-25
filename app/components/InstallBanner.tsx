"use client";

import { useEffect, useState } from "react";

export default function InstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const dismissed = sessionStorage.getItem("install-banner-dismissed");
    if (isIOS && !isStandalone && !dismissed) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg px-4 py-3 pb-safe">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192x192.png" alt="icon" className="w-12 h-12 rounded-xl shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800">ホーム画面に追加</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Safari の <strong>共有ボタン</strong> ⎋ → <strong>「ホーム画面に追加」</strong> でアプリとして使えます
          </p>
        </div>
        <button
          onClick={() => {
            sessionStorage.setItem("install-banner-dismissed", "1");
            setShow(false);
          }}
          className="text-gray-400 text-xl leading-none shrink-0 pt-0.5"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
