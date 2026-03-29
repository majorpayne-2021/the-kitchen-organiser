"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useRef, useState } from "react";
import { updateAvatar } from "@/actions/user-actions";

type UserProfile = { id: number; name: string; avatarFilename: string | null };

export default function ProfilePicker({ users }: { users: UserProfile[] }) {
  const router = useRouter();
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [uploading, setUploading] = useState<number | null>(null);

  async function selectUser(userId: number) {
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    router.push("/");
    router.refresh();
  }

  async function handleAvatarUpload(userId: number, file: File) {
    setUploading(userId);
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
      setUploading(null);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-warm-50">
      <h1 className="font-serif text-4xl font-semibold text-warm-800 mb-2">
        The Kitchen Organiser
      </h1>
      <p className="text-warm-600 mb-12">Who&apos;s cooking?</p>
      <div className="flex gap-8">
        {users.map((user) => (
          <div key={user.id} className="flex flex-col items-center gap-3">
            <button
              onClick={() => selectUser(user.id)}
              className="flex flex-col items-center gap-3 group cursor-pointer"
            >
              <div className="w-28 h-28 rounded-full bg-accent flex items-center justify-center text-3xl font-semibold text-white overflow-hidden transition-transform group-hover:scale-105">
                {user.avatarFilename ? (
                  <Image
                    src={`/avatars/${user.avatarFilename}`}
                    alt={user.name}
                    width={112}
                    height={112}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              <span className="text-warm-800 font-medium text-lg group-hover:text-accent transition-colors">
                {user.name}
              </span>
            </button>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={(el) => { fileInputRefs.current[user.id] = el; }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(user.id, file);
              }}
            />
            <button
              onClick={() => fileInputRefs.current[user.id]?.click()}
              disabled={uploading === user.id}
              className="text-sm text-warm-500 hover:text-accent transition-colors disabled:opacity-50"
            >
              {uploading === user.id ? "Uploading…" : "Upload avatar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
