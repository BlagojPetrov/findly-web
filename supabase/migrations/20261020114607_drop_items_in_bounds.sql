-- P11.S4: drop the old /map RPC and its planar index.
-- Since P11.S3 the map is a view of the feed (search_item_locations()); the
-- deployed app no longer calls items_in_bounds() (checked in git, the
-- production bundle and the catalog: no function, view, policy or dependency
-- uses it). items_location_geom_idx served only its geometry rectangle test;
-- the distance filters use the geography index items_location_idx.

drop function public.items_in_bounds(
  double precision,
  double precision,
  double precision,
  double precision,
  public.item_type,
  integer
);

drop index public.items_location_geom_idx;
