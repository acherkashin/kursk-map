import rawCollection from "./all-objects.json";
import type { Place, RawFeatureCollection } from "./types";

const BASE_URL = "https://gokursk.ru";

function resolvePublicUrl(path: string) {
  return new URL(path.replace(/^\//, ""), window.location.origin + import.meta.env.BASE_URL).toString();
}

function normalizeThumbnailUrl(value: string | undefined, fallbackUrl: string) {
  const thumbnail = value?.trim();

  if (!thumbnail) {
    return fallbackUrl;
  }

  return thumbnail.startsWith("/") ? resolvePublicUrl(thumbnail) : thumbnail;
}

function stripTags(value: string) {
  return value.replace(/<[^>]*>/g, " ");
}

function normalizeDescription(value: string) {
  return stripTags(value.replace(/<br\s*\/?>/gi, "\n"))
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function createHighlight(description: string) {
  const sentences = description
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return "Идея для неспешного маршрута по Курской области.";
  }

  const preferred = sentences.find((sentence) => sentence.length >= 60);
  return preferred ?? sentences[0];
}

export function normalizePlaces(raw: RawFeatureCollection): Place[] {
  return raw.features.map((feature) => {
    const content = feature.properties.balloonContent;
    const [lat, lon] = feature.geometry.coordinates;
    const description = normalizeDescription(content.description);
    const imageUrl = new URL(content.image, BASE_URL).toString();
    const detailsUrl = new URL(content.url, BASE_URL).toString();
    const thumbnailUrl = normalizeThumbnailUrl(content.thumbnail, imageUrl);

    return {
      id: feature.properties.id ?? feature.id,
      name: content.name.trim() || "Место без названия",
      description,
      highlight: createHighlight(description),
      address: content.address.trim() || "Адрес уточняется",
      lat,
      lon,
      images: [imageUrl],
      imageUrl,
      thumbnailUrl,
      detailsUrl,
      section: feature.properties.section,
      categoryType: feature.properties.type,
      ctaLabel: content.button.trim() || "Узнать подробнее",
    };
  });
}

export function loadPlaces() {
  return normalizePlaces(rawCollection as RawFeatureCollection);
}
