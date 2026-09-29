import { Map as LeafletMap } from "leaflet";

// Leaflet 1.9 ends a zoom animation from a 250 ms timer that `map.remove()`
// does not cancel. A map removed while zooming (e.g. the feed's filter form
// remounting when it navigates) then throws "Cannot read properties of
// undefined (reading '_leaflet_pos')" from that timer (F-27). A removed map
// has no map pane, so the late call is skipped.
type ZoomTransitionEnd = {
  _mapPane?: HTMLElement;
  _onZoomTransitionEnd(): void;
};

const proto = LeafletMap.prototype as unknown as ZoomTransitionEnd;
const onZoomTransitionEnd = proto._onZoomTransitionEnd;
proto._onZoomTransitionEnd = function (this: ZoomTransitionEnd) {
  if (!this._mapPane) return;
  onZoomTransitionEnd.call(this);
};
