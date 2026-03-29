import * as cheerio from "cheerio";
import path from "path";
import { processAndSavePhoto } from "@/lib/photos";

export type ScrapedRecipe = {
  title: string;
  description: string;
  prepTime: number | null;
  cookTime: number | null;
  servings: number | null;
  source: string;
  ingredients: string[];
  steps: string[];
  tags: string[];
  imageFilename: string | null;
};

// ─── Utility Exports ─────────────────────────────────────────────────────────

export function isYouTubeUrl(url: string): boolean {
  return (
    /youtube\.com\/watch\?.*v=/.test(url) ||
    /youtu\.be\//.test(url) ||
    /youtube\.com\/shorts\//.test(url)
  );
}

export function parseIsoDuration(duration: unknown): number | null {
  if (!duration || typeof duration !== "string" || duration.trim() === "") {
    return null;
  }
  const match = duration.match(
    /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/
  );
  if (!match) return null;
  const days = parseInt(match[1] || "0", 10);
  const hours = parseInt(match[2] || "0", 10);
  const minutes = parseInt(match[3] || "0", 10);
  const total = days * 1440 + hours * 60 + minutes;
  // If everything is 0 and the string isn't a valid PT0M form, return null
  if (total === 0 && !duration.match(/^P(T.*)?$/)) return null;
  return total;
}

export function cleanText(text: string): string {
  const $ = cheerio.load(text, { xmlMode: false });
  return $.root().text();
}

export function extractSchemaRecipe(html: string): any | null {
  const $ = cheerio.load(html);
  const scripts = $('script[type="application/ld+json"]');

  for (let i = 0; i < scripts.length; i++) {
    const content = $(scripts[i]).html();
    if (!content) continue;
    try {
      const data = JSON.parse(content);
      const found = findRecipeInData(data);
      if (found) return found;
    } catch {
      // ignore parse errors
    }
  }
  return null;
}

function findRecipeInData(data: any): any | null {
  if (!data) return null;

  if (data["@type"] === "Recipe") return data;

  if (Array.isArray(data["@type"]) && data["@type"].includes("Recipe")) {
    return data;
  }

  if (Array.isArray(data["@graph"])) {
    for (const item of data["@graph"]) {
      const found = findRecipeInData(item);
      if (found) return found;
    }
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeInData(item);
      if (found) return found;
    }
  }

  return null;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export async function scrapeUrl(
  url: string,
  photoDir: string
): Promise<ScrapedRecipe> {
  if (isYouTubeUrl(url)) {
    return scrapeYouTube(url, photoDir);
  }
  return scrapeRecipeSite(url, photoDir);
}

// ─── YouTube Scraping ─────────────────────────────────────────────────────────

const INGREDIENT_HEADERS =
  /^(ingredients?|what you('ll| will)? need|you('ll| will)? need|shopping list)/i;
const STEP_HEADERS =
  /^(instructions?|directions?|steps?|method|how to make|preparation|recipe)/i;

function extractYouTubeVideoId(url: string): string | null {
  let match = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (match) return match[1];
  match = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (match) return match[1];
  match = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/);
  if (match) return match[1];
  return null;
}

export function extractYouTubeFullDescription(html: string): string | null {
  // YouTube embeds description in ytInitialData
  const match = html.match(/var ytInitialData\s*=\s*({.+?});\s*<\/script>/s);
  if (!match) return null;
  try {
    const data = JSON.parse(match[1]);
    // Navigate to description text
    const videoDetails =
      data?.playerOverlays?.playerOverlayRenderer?.videoDetails
        ?.playerOverlayVideoDetailsRenderer;
    if (videoDetails?.subtitle?.runs) {
      // This is title/author; description is elsewhere
    }
    // Try common path for description
    const desc =
      data?.engagementPanels
        ?.find((p: any) =>
          p?.engagementPanelSectionListRenderer?.panelIdentifier?.includes(
            "description"
          )
        )
        ?.engagementPanelSectionListRenderer?.content?.structuredDescriptionContentRenderer?.items?.find(
          (i: any) => i?.expandableVideoDescriptionBodyRenderer
        )?.expandableVideoDescriptionBodyRenderer?.descriptionBodyText?.runs
        ?.map((r: any) => r.text)
        ?.join("") ?? null;
    if (desc) return desc;

    // Fallback: search all text runs in initialData for long strings
    const str = JSON.stringify(data);
    const attributedDesc = str.match(/"attributedDescriptionBodyText":\{"content":"([^"]+)"/);
    if (attributedDesc) return attributedDesc[1].replace(/\\n/g, "\n");
  } catch {
    // ignore
  }
  return null;
}

export function parseYouTubeDescription(text: string): {
  ingredients: string[];
  steps: string[];
} {
  const lines = text.split("\n").map((l) => l.trim());
  const ingredients: string[] = [];
  const steps: string[] = [];

  type Section = "ingredients" | "steps" | null;
  let currentSection: Section = null;
  let stepIndex = 0;

  for (const line of lines) {
    if (!line) {
      // blank line may end a section; keep current section active
      continue;
    }

    if (INGREDIENT_HEADERS.test(line)) {
      currentSection = "ingredients";
      continue;
    }
    if (STEP_HEADERS.test(line)) {
      currentSection = "steps";
      stepIndex = 0;
      continue;
    }

    if (currentSection === "ingredients") {
      // Stop if we hit another header-like line that doesn't match ingredient/step
      if (/^[A-Z][A-Z\s]+:?$/.test(line) && line.length < 40) {
        currentSection = null;
        continue;
      }
      ingredients.push(line);
    } else if (currentSection === "steps") {
      if (/^[A-Z][A-Z\s]+:?$/.test(line) && line.length < 40) {
        currentSection = null;
        continue;
      }
      steps.push(line);
      stepIndex++;
    }
  }

  return { ingredients, steps };
}

async function downloadYouTubeThumbnail(
  videoId: string,
  photoDir: string
): Promise<string | null> {
  const urls = [
    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; KitchenOrganiser/1.0)" },
      });
      if (!res.ok) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      return await processAndSavePhoto(buffer, "jpg", photoDir);
    } catch {
      continue;
    }
  }
  return null;
}

async function scrapeYouTube(
  url: string,
  photoDir: string
): Promise<ScrapedRecipe> {
  const videoId = extractYouTubeVideoId(url);

  const res = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: { "User-Agent": "Mozilla/5.0 (compatible; KitchenOrganiser/1.0)" },
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  const title =
    $('meta[name="title"]').attr("content") ||
    $('meta[property="og:title"]').attr("content") ||
    $("title").text().replace(" - YouTube", "").trim() ||
    "Untitled";

  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";

  const fullDescription = extractYouTubeFullDescription(html) || description;
  const { ingredients, steps } = parseYouTubeDescription(fullDescription);

  const imageFilename =
    videoId ? await downloadYouTubeThumbnail(videoId, photoDir) : null;

  return {
    title,
    description,
    prepTime: null,
    cookTime: null,
    servings: null,
    source: url,
    ingredients,
    steps,
    tags: [],
    imageFilename,
  };
}

// ─── Recipe Site Scraping ─────────────────────────────────────────────────────

export function extractIngredients(recipeData: any): string[] {
  const raw = recipeData.recipeIngredient;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((i: any) => cleanText(String(i)));
  return [cleanText(String(raw))];
}

export function extractSteps(recipeData: any): string[] {
  const raw = recipeData.recipeInstructions;
  if (!raw) return [];

  const steps: string[] = [];

  function processItem(item: any): void {
    if (typeof item === "string") {
      const text = cleanText(item).trim();
      if (text) steps.push(text);
    } else if (item?.["@type"] === "HowToStep") {
      const text = cleanText(item.text || item.name || "").trim();
      if (text) steps.push(text);
    } else if (item?.["@type"] === "HowToSection") {
      const subItems = item.itemListElement || item.item || [];
      for (const sub of Array.isArray(subItems) ? subItems : [subItems]) {
        processItem(sub);
      }
    } else if (Array.isArray(item)) {
      for (const sub of item) processItem(sub);
    }
  }

  if (Array.isArray(raw)) {
    for (const item of raw) processItem(item);
  } else {
    processItem(raw);
  }

  return steps;
}

export function extractTags(recipeData: any): string[] {
  const tags = new Set<string>();

  function addTags(val: any): void {
    if (!val) return;
    if (typeof val === "string") {
      val.split(/[,;]/).forEach((t: string) => {
        const clean = t.trim();
        if (clean) tags.add(clean);
      });
    } else if (Array.isArray(val)) {
      val.forEach(addTags);
    }
  }

  addTags(recipeData.recipeCategory);
  addTags(recipeData.keywords);

  return Array.from(tags);
}

export function extractImageUrl(recipeData: any): string | null {
  const img = recipeData.image;
  if (!img) return null;
  if (typeof img === "string") return img;
  if (typeof img === "object" && !Array.isArray(img)) return img.url || null;
  if (Array.isArray(img)) {
    for (const item of img) {
      if (typeof item === "string") return item;
      if (item?.url) return item.url;
    }
  }
  return null;
}

export function parseServings(yieldVal: any): number | null {
  if (!yieldVal) return null;
  const str = Array.isArray(yieldVal) ? String(yieldVal[0]) : String(yieldVal);
  const match = str.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export async function downloadImage(
  url: string,
  photoDir: string
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; KitchenOrganiser/1.0)" },
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const ext = path.extname(new URL(url).pathname).slice(1) || "jpg";
    return await processAndSavePhoto(buffer, ext, photoDir);
  } catch {
    return null;
  }
}

async function scrapeRecipeSite(
  url: string,
  photoDir: string
): Promise<ScrapedRecipe> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: { "User-Agent": "Mozilla/5.0 (compatible; KitchenOrganiser/1.0)" },
  });
  const html = await res.text();

  const recipeData = extractSchemaRecipe(html);
  if (!recipeData) {
    throw new Error(`No Schema.org Recipe found at ${url}`);
  }

  const title = cleanText(recipeData.name || "Untitled");
  const description = cleanText(recipeData.description || "");
  const prepTime = parseIsoDuration(recipeData.prepTime);
  const cookTime = parseIsoDuration(recipeData.cookTime);
  const servings = parseServings(recipeData.recipeYield);
  const ingredients = extractIngredients(recipeData);
  const steps = extractSteps(recipeData);
  const tags = extractTags(recipeData);

  const imageUrl = extractImageUrl(recipeData);
  const imageFilename = imageUrl ? await downloadImage(imageUrl, photoDir) : null;

  return {
    title,
    description,
    prepTime,
    cookTime,
    servings,
    source: url,
    ingredients,
    steps,
    tags,
    imageFilename,
  };
}
