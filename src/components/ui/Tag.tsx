import React from "react";

interface TagProps {
  children: React.ReactNode;
  className?: string;
}

export default function Tag({ children, className = "" }: TagProps) {
  return (
    <span
      className={[
        "inline-flex items-center px-2.5 py-0.5 text-xs font-medium",
        "bg-accent-light text-accent-hover rounded-tag",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
