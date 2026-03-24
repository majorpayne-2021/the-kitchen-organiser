"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

interface GiftPhotoUploadProps {
  hamperId: number;
}

export default function GiftPhotoUpload({ hamperId }: GiftPhotoUploadProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "gift");
      formData.append("hamperId", String(hamperId));

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      <label className="cursor-pointer">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={uploading}
          onClick={() =>
            document.getElementById(`gift-photo-input-${hamperId}`)?.click()
          }
        >
          {uploading ? "Uploading..." : "Add Photo"}
        </Button>
        <input
          id={`gift-photo-input-${hamperId}`}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
