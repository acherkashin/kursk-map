import type { Place } from "./types";

export function normalizeSearchValue(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("ru-RU")
    .replaceAll("ё", "е")
    .replace(/[\s.,/#!$%^&*;:{}=\-_`~()«»"'?<>[\]\\|+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesSearchQuery(place: Place, query: string) {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return true;
  }

  return [place.name, place.address, place.description].some((value) =>
    normalizeSearchValue(value).includes(normalizedQuery),
  );
}

export function filterPlaces(places: Place[], query: string) {
  return places.filter((place) => matchesSearchQuery(place, query));
}
