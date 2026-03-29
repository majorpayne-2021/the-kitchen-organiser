"use client";

import React, { useEffect, useState } from "react";

interface FlashMessageProps {
  message: string;
  type?: "success" | "error";
  onDismiss?: () => void;
}

export default function FlashMessage({
  message,
  type = "success",
  onDismiss,
}: FlashMessageProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 3600);

    const dismissTimer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 4000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <div
      className={[
        "fixed top-4 right-4 z-50 max-w-sm px-4 py-3 rounded-card shadow-md",
        "border-l-4 bg-white",
        type === "success"
          ? "border-accent text-warm-800"
          : "border-red-500 text-red-800",
        "transition-opacity duration-400",
        fading ? "opacity-0" : "opacity-100",
      ]
        .filter(Boolean)
        .join(" ")}
      role="alert"
    >
      <div className="flex items-start gap-2">
        <span className="text-sm font-medium flex-1">{message}</span>
        <button
          onClick={() => {
            setVisible(false);
            onDismiss?.();
          }}
          className="text-warm-600 hover:text-warm-800 transition-colors shrink-0"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
