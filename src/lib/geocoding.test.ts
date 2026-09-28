import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearGeocodingCache,
  createThrottle,
  formatPlace,
  GeocodingError,
  MIN_REQUEST_INTERVAL_MS,
  reverseGeocode,
  reverseUrl,
  searchAddress,
  searchUrl,
} from "./geocoding";

describe("formatPlace", () => {
  it("builds a short label from the address parts", () => {
    expect(
      formatPlace({
        lat: "41.99",
        lon: "21.43",
        name: "Градски трговски центар",
        display_name:
          "Градски трговски центар, 1, Плоштад Македонија, Центар, Скопје, Општина Центар, Град Скопје, Скопски Регион, 1000, Северна Македонија",
        address: {
          road: "Плоштад Македонија",
          house_number: "1",
          suburb: "Центар",
          city: "Скопје",
          postcode: "1000",
          country: "Северна Македонија",
        },
      }),
    ).toBe("Градски трговски центар, Плоштад Македонија 1, Центар, Скопје");
  });

  it("skips repeated and missing parts", () => {
    expect(
      formatPlace({
        lat: "41",
        lon: "21",
        name: "Охрид",
        address: { town: "Охрид", municipality: "Општина Охрид" },
      }),
    ).toBe("Охрид");
    expect(
      formatPlace({
        lat: "41",
        lon: "21",
        name: "",
        address: { road: "Partizanska", village: "Dolno Sonje" },
      }),
    ).toBe("Partizanska, Dolno Sonje");
  });

  it("falls back to display_name and fits location_name", () => {
    expect(
      formatPlace({ lat: "41", lon: "21", display_name: " Somewhere " }),
    ).toBe("Somewhere");
    expect(
      formatPlace({ lat: "41", lon: "21", display_name: "x".repeat(300) }),
    ).toHaveLength(200);
  });
});

describe("URLs", () => {
  it("search is limited to North Macedonia in the page language", () => {
    const url = new URL(searchUrl("Плоштад Македонија", "mk"));
    expect(url.origin + url.pathname).toBe(
      "https://nominatim.openstreetmap.org/search",
    );
    expect(url.searchParams.get("q")).toBe("Плоштад Македонија");
    expect(url.searchParams.get("countrycodes")).toBe("mk");
    expect(url.searchParams.get("accept-language")).toBe("mk");
    expect(url.searchParams.get("format")).toBe("jsonv2");
  });

  it("reverse rounds coordinates to 6 decimals", () => {
    const url = new URL(reverseUrl({ lat: 41.99812345, lng: 21.4254 }, "en"));
    expect(url.pathname).toBe("/reverse");
    expect(url.searchParams.get("lat")).toBe("41.998123");
    expect(url.searchParams.get("lon")).toBe("21.425400");
    expect(url.searchParams.get("accept-language")).toBe("en");
  });
});

describe("createThrottle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("spaces request starts by the interval", async () => {
    const throttle = createThrottle(1000);
    const starts: number[] = [];
    const start = Date.now();
    const run = () => throttle().then(() => starts.push(Date.now() - start));
    const all = Promise.all([run(), run(), run()]);
    await vi.advanceTimersByTimeAsync(5000);
    await all;
    expect(starts).toEqual([0, 1000, 2000]);
  });

  it("does not reserve a slot for an aborted caller", async () => {
    const throttle = createThrottle(1000);
    const start = Date.now();
    await throttle();
    const controller = new AbortController();
    const aborted = throttle(controller.signal);
    const abortedResult = expect(aborted).rejects.toBeDefined();
    await vi.advanceTimersByTimeAsync(300);
    controller.abort();
    await abortedResult;
    let next = -1;
    const waiting = throttle().then(() => (next = Date.now() - start));
    await vi.advanceTimersByTimeAsync(1000);
    await waiting;
    expect(next).toBe(1000);
  });

  it("rejects at once when already aborted", async () => {
    const throttle = createThrottle(1000);
    await expect(throttle(AbortSignal.abort())).rejects.toBeDefined();
  });
});

describe("requests", () => {
  const fetchMock = vi.fn();
  let now = Date.parse("2026-09-28T12:00:00Z");

  beforeEach(() => {
    // A new "second" for each test so the shared throttle never waits.
    vi.useFakeTimers();
    vi.setSystemTime((now += 10_000));
    clearGeocodingCache();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const respond = (body: unknown, status = 200) =>
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(body), { status }),
    );

  it("searchAddress skips short queries without a request", async () => {
    expect(await searchAddress("  ab ", { locale: "mk" })).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("searchAddress maps results and drops invalid ones", async () => {
    respond([
      {
        lat: "41.9965",
        lon: "21.4314",
        name: "Камен мост",
        address: { city: "Скопје" },
      },
      { lat: "nope", lon: "21", name: "Broken" },
    ]);
    expect(await searchAddress(" камен мост ", { locale: "mk" })).toEqual([
      { lat: 41.9965, lng: 21.4314, label: "Камен мост, Скопје" },
    ]);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("q")).toBe("камен мост");
  });

  it("caches identical requests", async () => {
    respond([]);
    await searchAddress("Bitola", { locale: "en" });
    await searchAddress("Bitola", { locale: "en" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("waits more than a second between requests", async () => {
    expect(MIN_REQUEST_INTERVAL_MS).toBeGreaterThan(1000);
    respond([]);
    respond([]);
    await searchAddress("Bitola", { locale: "en" });
    const second = searchAddress("Ohrid", { locale: "en" });
    await vi.advanceTimersByTimeAsync(MIN_REQUEST_INTERVAL_MS - 1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await second;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws GeocodingError on HTTP errors", async () => {
    respond({}, 429);
    await expect(searchAddress("Bitola", { locale: "en" })).rejects.toThrow(
      GeocodingError,
    );
  });

  it("reverseGeocode returns the label, or null without an address", async () => {
    respond({
      lat: "41.9981",
      lon: "21.4254",
      name: "",
      address: { road: "Macedonia Street", city: "Skopje" },
    });
    expect(
      await reverseGeocode({ lat: 41.9981, lng: 21.4254 }, { locale: "en" }),
    ).toBe("Macedonia Street, Skopje");
    vi.setSystemTime(Date.now() + MIN_REQUEST_INTERVAL_MS);
    respond({ error: "Unable to geocode" });
    expect(
      await reverseGeocode({ lat: 40, lng: 19 }, { locale: "en" }),
    ).toBeNull();
  });
});
