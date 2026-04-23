import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Place } from "./types";

vi.mock("./components/MapView", () => ({
  MapView: ({
    places,
    onSelectPlace,
  }: {
    places: Place[];
    activePlace: Place | null;
    onSelectPlace: (place: Place) => void;
  }) => (
    <div data-testid="mock-map">
      {places.map((place) => (
        <button key={place.id} type="button" onClick={() => onSelectPlace(place)}>
          {place.name}
        </button>
      ))}
    </div>
  ),
}));

describe("App filters", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the compact brand and search toolbar", async () => {
    const { default: App } = await import("./App");

    render(<App />);

    expect(screen.getByRole("heading", { name: "Короче, Курск" })).toBeInTheDocument();
    expect(screen.getByText("Путеводитель для местных")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Поиск мест" })).toBeInTheDocument();
    expect(screen.queryByText("265 мест")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Курск" })).not.toBeInTheDocument();
  });

  it("filters places by search query", async () => {
    const user = userEvent.setup();
    const { default: App } = await import("./App");

    render(<App />);

    await user.type(screen.getByRole("searchbox", { name: "Поиск мест" }), "Марьино");

    expect(screen.getByTestId("mock-map")).toHaveTextContent("Марьино");
  });

  it("closes the selected panel when filters exclude the active place", async () => {
    const user = userEvent.setup();
    const { default: App } = await import("./App");

    render(<App />);

    const map = screen.getByTestId("mock-map");
    await user.click(
      within(map).getByRole("button", {
        name: "Государственное управление Банка России по Курской области",
      }),
    );

    expect(screen.getByRole("heading", { name: /Банка России/ })).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox", { name: "Поиск мест" }), "Марьино");

    expect(screen.queryByRole("heading", { name: /Банка России/ })).not.toBeInTheDocument();
  });
});
