import { describe, it, expect } from "vitest";
import { generateFilename, getThumbFilename, isAllowedExtension } from "@/lib/photos";

describe("photo utilities", () => {
  it("generates UUID filename with extension", () => {
    const name = generateFilename("jpg");
    expect(name).toMatch(/^[a-f0-9]{32}\.jpg$/);
  });
  it("generates thumbnail filename", () => {
    expect(getThumbFilename("abc123.jpg")).toBe("thumb_abc123.jpg");
  });
  it("validates allowed extensions", () => {
    expect(isAllowedExtension("jpg")).toBe(true);
    expect(isAllowedExtension("jpeg")).toBe(true);
    expect(isAllowedExtension("png")).toBe(true);
    expect(isAllowedExtension("webp")).toBe(true);
    expect(isAllowedExtension("gif")).toBe(true);
    expect(isAllowedExtension("exe")).toBe(false);
  });
});
