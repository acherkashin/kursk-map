import { describe, expect, it } from "vitest";
import { loadPlaces } from "./data";
import { filterPlaces, normalizeSearchValue } from "./placeFilters";

describe("placeFilters", () => {
  const places = loadPlaces();

  it("normalizes e and yo variants the same way", () => {
    expect(normalizeSearchValue(" Ёлки-иголки ")).toBe("елки иголки");
    expect(normalizeSearchValue("Семёновская")).toBe("семеновская");
  });

  it("matches places when users search without yo diacritics", () => {
    expect(
      filterPlaces(places, "Воробьевка").some((place) => place.address.includes("Воробьёвка")),
    ).toBe(true);
  });

  it("ignores case and separator noise in common queries", () => {
    expect(
      filterPlaces(places, "  ПАРК ОТЕЛЬ ПЕСЧАНЫЙ  ").some((place) =>
        place.name.includes("Парк-отель"),
      ),
    ).toBe(true);
  });
});
