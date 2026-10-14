"use client";

import { LoaderCircle, LocateFixed, MapPin, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type GeocodeResult,
  reverseGeocode,
  SEARCH_DEBOUNCE_MS,
  SEARCH_MIN_LENGTH,
  searchAddress,
} from "@/lib/geocoding";
import { DEFAULT_CENTER, DEFAULT_ZOOM, type LatLng } from "@/lib/map";
import { cn } from "@/lib/utils";
import { ITEM_LIMITS } from "@/lib/validation/items";
import type { ValidationMessage } from "@/lib/validation/messages";
import { LocationPickerMap, MapFrame } from "./index";
import type { MapViewTarget } from "./location-picker-map";

// Zoom for a chosen place (street level).
const PLACE_ZOOM = 17;

type SearchState = {
  query: string;
  status: "loading" | "done" | "error";
  results: GeocodeResult[];
};
type AddressStatus = "idle" | "loading" | "notFound" | "failed";
type GeoStatus = "idle" | "locating" | "denied" | "unavailable" | "unsupported";

// Coordinates as posted by the form (~0.1 m).
const formatCoordinate = (value: number) => value.toFixed(6);

// Chooses a point on the map (click, drag the pin, address search or the
// device location) and its address. Posts `lat`, `lng` (hidden, empty without
// a point) and `locationName`, which reverse geocoding fills from the pin and
// the user can edit.
export function LocationPicker({
  defaultPoint = null,
  defaultLocationName = "",
  errors,
  locationNameErrors,
  disabled,
}: {
  defaultPoint?: LatLng | null;
  defaultLocationName?: string;
  // Validation message keys for the point (`lat`/`lng`) and the address.
  errors?: string[];
  locationNameErrors?: string[];
  disabled?: boolean;
}) {
  const t = useTranslations("LocationPicker");
  const tValidation = useTranslations("Validation");
  const locale = useLocale();
  const id = useId();

  const [point, setPoint] = useState<LatLng | null>(defaultPoint);
  const [locationName, setLocationName] = useState(defaultLocationName);
  const [view, setView] = useState<MapViewTarget>(() =>
    defaultPoint
      ? { center: defaultPoint, zoom: PLACE_ZOOM }
      : { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM },
  );
  const [addressStatus, setAddressStatus] = useState<AddressStatus>("idle");
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState | null>(null);
  const reverseRequest = useRef<AbortController | null>(null);

  // Errors of the last submit, hidden once a new point is chosen (a new
  // submit passes a new array, which shows again).
  const [dismissedErrors, setDismissedErrors] = useState<string[]>();
  const visibleErrors = errors !== dismissedErrors ? errors : undefined;

  useEffect(() => () => reverseRequest.current?.abort(), []);

  // New pin; the address comes from the search result or reverse geocoding.
  const pick = useCallback(
    (next: LatLng, label?: string) => {
      setPoint(next);
      setDismissedErrors(errors);
      reverseRequest.current?.abort();
      if (label !== undefined) {
        setLocationName(label);
        setAddressStatus("idle");
        return;
      }
      const controller = new AbortController();
      reverseRequest.current = controller;
      setAddressStatus("loading");
      reverseGeocode(next, { locale, signal: controller.signal }).then(
        (address) => {
          if (controller.signal.aborted) return;
          if (address) setLocationName(address);
          setAddressStatus(address ? "idle" : "notFound");
        },
        () => {
          if (!controller.signal.aborted) setAddressStatus("failed");
        },
      );
    },
    [locale, errors],
  );

  const trimmedQuery = query.trim();
  const searchActive = trimmedQuery.length >= SEARCH_MIN_LENGTH;
  useEffect(() => {
    if (!searchActive) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearch({ query: trimmedQuery, status: "loading", results: [] });
      searchAddress(trimmedQuery, { locale, signal: controller.signal }).then(
        (results) =>
          setSearch({ query: trimmedQuery, status: "done", results }),
        () => {
          if (!controller.signal.aborted) {
            setSearch({ query: trimmedQuery, status: "error", results: [] });
          }
        },
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmedQuery, searchActive, locale]);
  // Results of an older query are not shown.
  const currentSearch =
    searchActive && search?.query === trimmedQuery ? search : null;
  const results = currentSearch?.results ?? [];

  function chooseResult(result: GeocodeResult) {
    const next = { lat: result.lat, lng: result.lng };
    pick(next, result.label);
    setView({ center: next, zoom: PLACE_ZOOM });
    setQuery("");
    setSearch(null);
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Enter picks the first result instead of submitting the form.
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (results[0]) chooseResult(results[0]);
  }

  function locate() {
    if (!("geolocation" in navigator)) {
      setGeoStatus("unsupported");
      return;
    }
    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setGeoStatus("idle");
        setView({ center: next, zoom: PLACE_ZOOM });
        pick(next);
      },
      (error) =>
        setGeoStatus(
          error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
        ),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  const searchMessage =
    currentSearch?.status === "loading"
      ? t("searching")
      : currentSearch?.status === "error"
        ? t("searchFailed")
        : currentSearch?.status === "done"
          ? t("resultCount", { count: results.length })
          : null;
  const geoMessage =
    geoStatus === "locating"
      ? t("locating")
      : geoStatus !== "idle"
        ? t(`geo.${geoStatus}`)
        : null;
  const addressHint = {
    idle: undefined,
    loading: t("addressLoading"),
    notFound: t("addressNotFound"),
    failed: t("addressFailed"),
  }[addressStatus];

  const searchId = `${id}-search`;
  const resultsId = `${id}-results`;

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor={searchId}>{t("searchLabel")}</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder={t("searchPlaceholder")}
              autoComplete="off"
              enterKeyHint="search"
              disabled={disabled}
              aria-controls={resultsId}
              className="h-9 pl-8"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={locate}
            disabled={disabled || geoStatus === "locating"}
          >
            {geoStatus === "locating" ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <LocateFixed aria-hidden />
            )}
            {t("useMyLocation")}
          </Button>
        </div>
        <p role="status" className="text-xs text-muted-foreground empty:hidden">
          {geoMessage ?? searchMessage}
        </p>
        <ul
          id={resultsId}
          aria-label={t("resultsLabel")}
          className="grid overflow-hidden rounded-lg border empty:hidden"
        >
          {results.map((result) => (
            <li
              key={`${result.lat},${result.lng}`}
              className="not-last:border-b"
            >
              <button
                type="button"
                onClick={() => chooseResult(result)}
                disabled={disabled}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
              >
                <MapPin
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-1.5">
        <MapFrame
          label={t("mapLabel")}
          className={cn(
            "aspect-4/3 sm:aspect-video",
            visibleErrors?.length && "border-destructive",
          )}
        >
          <LocationPickerMap
            point={point}
            view={view}
            onPick={pick}
            pinLabel={t("pinLabel")}
            disabled={disabled}
          />
        </MapFrame>
        {visibleErrors?.length ? (
          <p className="text-xs text-destructive">
            {tValidation(visibleErrors[0] as ValidationMessage)}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {point
              ? t("pinAt", {
                  lat: point.lat.toFixed(5),
                  lng: point.lng.toFixed(5),
                })
              : t("mapHint")}
          </p>
        )}
      </div>

      <FormField
        id={`${id}-locationName`}
        name="locationName"
        label={t("addressLabel")}
        hint={addressHint}
        maxLength={ITEM_LIMITS.locationNameMax}
        className="h-9"
        value={locationName}
        onChange={(event) => setLocationName(event.target.value)}
        disabled={disabled}
        errors={locationNameErrors}
      />
      <input
        type="hidden"
        name="lat"
        value={point ? formatCoordinate(point.lat) : ""}
      />
      <input
        type="hidden"
        name="lng"
        value={point ? formatCoordinate(point.lng) : ""}
      />
    </div>
  );
}
