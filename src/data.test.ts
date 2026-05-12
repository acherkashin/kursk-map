import { describe, expect, it } from "vitest";
import { loadPlaces } from "./data";

describe("loadPlaces", () => {
  const places = loadPlaces();

  it("normalizes every object from the default featured source file", () => {
    expect(places).toHaveLength(12);
  });

  it("keeps Kursk-area coordinates in lat/lon order and exposes explicit fields", () => {
    const firstPlace = places[0];

    expect(firstPlace.lat).toBeCloseTo(52.231969);
    expect(firstPlace.lon).toBeCloseTo(35.392868);
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

  it("normalizes description text safely", () => {
    const descriptions = places.map((place) => place.description);

    expect(descriptions.some((description) => description.length > 0)).toBe(true);
    expect(descriptions.every((description) => !description.includes("<br"))).toBe(true);
    expect(descriptions.every((description) => !description.includes("<"))).toBe(true);
  });

  it("builds a carousel-friendly image array even for single-image places", () => {
    const firstPlace = places[0];

    expect(firstPlace.images).toEqual([firstPlace.imageUrl]);
  });
});
