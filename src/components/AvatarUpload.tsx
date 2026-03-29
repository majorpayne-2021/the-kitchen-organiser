"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateAvatar } from "@/actions/user-actions";

export default function AvatarUpload({ userId }: { userId: number }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "avatar");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { filename } = await res.json();
      await updateAvatar(userId, filename);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="text-sm text-warm-500 hover:text-accent transition-colors disabled:opacity-50"
      >
        {uploading ? "Uploading…" : "Upload avatar"}
      </button>
    </>
  );
}
