import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

  it("updates the input immediately and filters after the debounce settles", async () => {
    const { SEARCH_DEBOUNCE_MS, default: App } = await import("./App");

    render(<App />);

    const input = screen.getByRole("searchbox", { name: "Поиск мест" });
    fireEvent.change(input, { target: { value: "Марьино" } });

    expect(input).toHaveValue("Марьино");
    expect(screen.getByTestId("mock-map")).toHaveTextContent(
      "Государственное управление Банка России по Курской области",
    );

    await new Promise((resolve) => window.setTimeout(resolve, SEARCH_DEBOUNCE_MS + 40));

    await waitFor(() => {
      expect(screen.getByTestId("mock-map")).toHaveTextContent("Марьино");
    });
  });

  it("closes the selected panel when filters exclude the active place", async () => {
    const { SEARCH_DEBOUNCE_MS, default: App } = await import("./App");

    render(<App />);

    const map = screen.getByTestId("mock-map");
    fireEvent.click(
      within(map).getByRole("button", {
        name: "Государственное управление Банка России по Курской области",
      }),
    );

    expect(screen.getByRole("heading", { name: /Банка России/ })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Поиск мест" }), {
      target: { value: "Марьино" },
    });

    expect(screen.getByRole("heading", { name: /Банка России/ })).toBeInTheDocument();

    await new Promise((resolve) => window.setTimeout(resolve, SEARCH_DEBOUNCE_MS + 40));

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /Банка России/ })).not.toBeInTheDocument();
    });
  });
});
