import { describe, expect, it } from "vitest";
import { loadPlaces } from "./data";

describe("loadPlaces", () => {
  const places = loadPlaces();

  it("normalizes every object from the source file", () => {
    expect(places).toHaveLength(265);
  });

  it("keeps Kursk-area coordinates in lat/lon order and exposes explicit fields", () => {
    const firstPlace = places[0];

    expect(firstPlace.lat).toBeCloseTo(51.745877);
    expect(firstPlace.lon).toBeCloseTo(36.194813);
  });

  it("resolves relative image and details urls to gokursk", () => {
    const firstPlace = places[0];

    expect(firstPlace.imageUrl.startsWith("https://gokursk.ru/")).toBe(true);
    expect(firstPlace.detailsUrl.startsWith("https://gokursk.ru/")).toBe(true);
  });

  it("uses a thumbnail field when it is available in the source data", () => {
    const firstPlace = places[0];

    expect(firstPlace.thumbnailUrl).toBeTruthy();
  });

  it("normalizes description text safely and preserves readable line breaks", () => {
    const placeWithBreaks = places.find((place) => place.description.includes("\n"));

    expect(placeWithBreaks).toBeDefined();
    expect(placeWithBreaks?.description.includes("<br")).toBe(false);
    expect(placeWithBreaks?.description.includes("<")).toBe(false);
  });

  it("builds a carousel-friendly image array even for single-image places", () => {
    const firstPlace = places[0];

    expect(firstPlace.images).toEqual([firstPlace.imageUrl]);
  });
});
