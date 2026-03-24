"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

interface EventPhotoUploadProps {
  mealPlanId: number;
}

export default function EventPhotoUpload({ mealPlanId }: EventPhotoUploadProps) {
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
      formData.append("type", "event");
      formData.append("mealPlanId", String(mealPlanId));

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
            document.getElementById(`event-photo-input-${mealPlanId}`)?.click()
          }
        >
          {uploading ? "Uploading..." : "Add Photo"}
        </Button>
        <input
          id={`event-photo-input-${mealPlanId}`}
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
