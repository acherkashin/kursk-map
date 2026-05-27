import { describe, expect, it } from "vitest";
import { buildYandexRouteUrls } from "./yandexRoutes";

describe("yandexRoutes", () => {
  it("builds Yandex Maps app and web route URLs to the selected destination", () => {
    const urls = buildYandexRouteUrls(51.5, 35.2);

    expect(urls.appUrl).toBe(
      "yandexmaps://maps.yandex.ru/?mode=routes&rtext=~51.5,35.2&rtt=auto",
    );
    expect(urls.webUrl).toBe("https://yandex.ru/maps/?mode=routes&rtext=~51.5,35.2&rtt=auto");
  });

  it("keeps the route destination in lat,lon order with an empty origin", () => {
    const urls = buildYandexRouteUrls(51.730361, 36.191112);
    const webUrl = new URL(urls.webUrl);

    expect(webUrl.searchParams.get("mode")).toBe("routes");
    expect(webUrl.searchParams.get("rtext")).toBe("~51.730361,36.191112");
    expect(webUrl.searchParams.get("rtt")).toBe("auto");
  });
});
