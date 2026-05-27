export type YandexRouteUrls = {
  appUrl: string;
  webUrl: string;
};

const YANDEX_MAPS_APP_ROUTE_URL = "yandexmaps://maps.yandex.ru/";
const YANDEX_MAPS_WEB_ROUTE_URL = "https://yandex.ru/maps/";
const MOBILE_USER_AGENT_PATTERN =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;
const ROUTE_FALLBACK_DELAY_MS = 900;

function formatCoordinate(value: number) {
  return String(value);
}

function createRouteSearchParams(lat: number, lon: number) {
  const destination = `~${formatCoordinate(lat)},${formatCoordinate(lon)}`;

  return `mode=routes&rtext=${destination}&rtt=auto`;
}

export function buildYandexRouteUrls(lat: number, lon: number): YandexRouteUrls {
  const routeSearchParams = createRouteSearchParams(lat, lon);

  return {
    appUrl: `${YANDEX_MAPS_APP_ROUTE_URL}?${routeSearchParams}`,
    webUrl: `${YANDEX_MAPS_WEB_ROUTE_URL}?${routeSearchParams}`,
  };
}

export function isMobileDevice(
  userAgent = navigator.userAgent,
  maxTouchPoints = navigator.maxTouchPoints,
) {
  const isTouchMac = userAgent.includes("Macintosh") && maxTouchPoints > 1;

  return MOBILE_USER_AGENT_PATTERN.test(userAgent) || isTouchMac;
}

export function openYandexRoute(urls: YandexRouteUrls, targetWindow: Window = window) {
  if (!isMobileDevice(targetWindow.navigator.userAgent, targetWindow.navigator.maxTouchPoints)) {
    targetWindow.open(urls.webUrl, "_blank", "noopener,noreferrer");
    return;
  }

  let shouldOpenFallback = true;

  const clearFallback = () => {
    shouldOpenFallback = false;
    targetWindow.clearTimeout(fallbackTimeoutId);
    removeListeners();
  };

  const handleVisibilityChange = () => {
    if (targetWindow.document.visibilityState === "hidden") {
      clearFallback();
    }
  };

  const removeListeners = () => {
    targetWindow.removeEventListener("pagehide", clearFallback);
    targetWindow.removeEventListener("blur", clearFallback);
    targetWindow.document.removeEventListener("visibilitychange", handleVisibilityChange);
  };

  const fallbackTimeoutId = targetWindow.setTimeout(() => {
    removeListeners();

    if (shouldOpenFallback) {
      targetWindow.location.href = urls.webUrl;
    }
  }, ROUTE_FALLBACK_DELAY_MS);

  targetWindow.addEventListener("pagehide", clearFallback, { once: true });
  targetWindow.addEventListener("blur", clearFallback, { once: true });
  targetWindow.document.addEventListener("visibilitychange", handleVisibilityChange);

  targetWindow.location.href = urls.appUrl;
}
