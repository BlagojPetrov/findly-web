import { icon, Marker } from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIconImage from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import type { StaticImageData } from "next/image";

// Bundlers disagree on what an image import is: webpack gives StaticImageData
// (`.src`), Turbopack (Vercel builds, `next dev`) the URL string for images in
// node_modules, and Vite (Vitest) a string too.
function assetUrl(image: StaticImageData | string) {
  return typeof image === "string" ? image : image.src;
}

// Leaflet's default marker icon with the bundled images. Leaflet's own default
// finds its images through a CSS path guess that bundlers break.
export const markerIcon = icon({
  iconUrl: assetUrl(markerIconImage),
  iconRetinaUrl: assetUrl(markerIcon2x),
  shadowUrl: assetUrl(markerShadow),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

// Default for every marker without its own `icon`.
Marker.prototype.options.icon = markerIcon;
