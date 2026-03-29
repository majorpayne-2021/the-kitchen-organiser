import { describe, it, expect } from "vitest";
import { parseIsoDuration, isYouTubeUrl, extractSchemaRecipe, cleanText } from "@/lib/scraper";

describe("parseIsoDuration", () => {
  it("parses minutes", () => { expect(parseIsoDuration("PT30M")).toBe(30); });
  it("parses hours and minutes", () => { expect(parseIsoDuration("PT1H30M")).toBe(90); });
  it("parses hours only", () => { expect(parseIsoDuration("PT2H")).toBe(120); });
  it("handles days", () => { expect(parseIsoDuration("P1DT0H")).toBe(1440); });
  it("returns null for invalid", () => {
    expect(parseIsoDuration(null)).toBeNull();
    expect(parseIsoDuration("")).toBeNull();
    expect(parseIsoDuration("not a duration")).toBeNull();
  });
});

describe("isYouTubeUrl", () => {
  it("detects youtube.com watch URLs", () => { expect(isYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true); });
  it("detects youtu.be URLs", () => { expect(isYouTubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true); });
  it("detects shorts URLs", () => { expect(isYouTubeUrl("https://youtube.com/shorts/dQw4w9WgXcQ")).toBe(true); });
  it("rejects non-YouTube URLs", () => { expect(isYouTubeUrl("https://example.com")).toBe(false); });
});

describe("cleanText", () => {
  it("strips HTML tags", () => { expect(cleanText("<p>Hello <b>world</b></p>")).toBe("Hello world"); });
  it("decodes HTML entities", () => { expect(cleanText("salt &amp; pepper")).toBe("salt & pepper"); });
});

describe("extractSchemaRecipe", () => {
  it("finds Recipe in JSON-LD", () => {
    const html = '<html><head><script type="application/ld+json">{"@type": "Recipe", "name": "Test Recipe", "recipeIngredient": ["1 cup flour"]}</script></head><body></body></html>';
    const result = extractSchemaRecipe(html);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Test Recipe");
  });
  it("finds Recipe in @graph", () => {
    const html = '<html><head><script type="application/ld+json">{"@graph": [{"@type": "WebPage"}, {"@type": "Recipe", "name": "Graph Recipe"}]}</script></head><body></body></html>';
    const result = extractSchemaRecipe(html);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Graph Recipe");
  });
  it("returns null when no recipe found", () => {
    expect(extractSchemaRecipe("<html><head></head><body>No recipe here</body></html>")).toBeNull();
  });
});
