import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PlacePanel } from "./PlacePanel";
import type { Place } from "../types";
import { buildYandexRouteUrls } from "../yandexRoutes";

const place: Place = {
  id: 1,
  name: "Марьино",
  description: "Дворцово-парковый ансамбль для длинной прогулки.",
  highlight: "Дворцово-парковый ансамбль для длинной прогулки.",
  address: "Курская область",
  lat: 51.5,
  lon: 35.2,
  images: ["https://gokursk.ru/example.jpg"],
  imageUrl: "https://gokursk.ru/example.jpg",
  thumbnailUrl: "/place-thumbnails/example.webp",
  detailsUrl: "https://gokursk.ru/details",
  categoryType: "204",
  ctaLabel: "Узнать подробнее",
};

describe("PlacePanel", () => {
  it("does not render a detail panel when no place is selected", () => {
    const { container } = render(<PlacePanel place={null} onClose={() => undefined} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByLabelText("Информация о месте")).not.toBeInTheDocument();
  });

  it("renders selected place details and keeps carousel controls safe for a single image", async () => {
    const user = userEvent.setup();

    const routeUrls = buildYandexRouteUrls(place.lat, place.lon);

    render(<PlacePanel place={place} routeUrls={routeUrls} onClose={() => undefined} />);

    expect(screen.getByRole("heading", { name: "Марьино" })).toBeInTheDocument();
    expect(screen.getByText("1 / 1")).toBeInTheDocument();

    const nextButton = screen.getByRole("button", { name: "Следующее изображение" });
    expect(nextButton).toBeDisabled();

    await user.click(screen.getByRole("link", { name: "Узнать подробнее" }));
    expect(screen.getByRole("link", { name: "Узнать подробнее" })).toHaveAttribute(
      "href",
      "https://gokursk.ru/details",
    );

    expect(screen.getByRole("link", { name: "Построить маршрут" })).toHaveAttribute(
      "href",
      "https://yandex.ru/maps/?mode=routes&rtext=~51.5,35.2&rtt=auto",
    );
  });
});
