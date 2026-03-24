"use client";

import React from "react";
import Image from "next/image";
import { setPhotoPrimary, deletePhotoAction } from "@/actions/photo-actions";
import Button from "@/components/ui/Button";

interface Photo {
  id: number;
  filename: string;
  isPrimary: boolean;
  caption: string | null;
}

interface PhotoGalleryProps {
  photos: Photo[];
}

export default function PhotoGallery({ photos }: PhotoGalleryProps) {
  if (photos.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="relative group rounded-card border border-warm-200 overflow-hidden"
        >
          <div className="relative aspect-square">
            <Image
              src={`/photos/thumb_${photo.filename}`}
              alt={photo.caption || "Recipe photo"}
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover"
            />
          </div>
          {photo.isPrimary && (
            <span className="absolute top-2 left-2 bg-accent text-white text-xs px-2 py-0.5 rounded-tag font-medium">
              Primary
            </span>
          )}
          <div className="absolute inset-0 bg-warm-800/0 group-hover:bg-warm-800/40 transition-colors flex items-end justify-center gap-2 p-2 opacity-0 group-hover:opacity-100">
            {!photo.isPrimary && (
              <form action={setPhotoPrimary}>
                <input type="hidden" name="photoId" value={photo.id} />
                <Button type="submit" variant="secondary" size="sm">
                  Set Primary
                </Button>
              </form>
            )}
            <form action={deletePhotoAction}>
              <input type="hidden" name="photoId" value={photo.id} />
              <Button type="submit" variant="danger" size="sm">
                Delete
              </Button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}
