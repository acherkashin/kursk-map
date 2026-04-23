import type { Place } from "./types";

function matchesSearchQuery(place: Place, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");

  if (!normalizedQuery) {
    return true;
  }

  return [place.name, place.address, place.description].some((value) =>
    value.toLocaleLowerCase("ru-RU").includes(normalizedQuery),
  );
}

export function filterPlaces(places: Place[], query: string) {
  return places.filter((place) => matchesSearchQuery(place, query));
}
