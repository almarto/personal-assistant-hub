import { useCallback, useEffect, useState } from "react";

import { InventoryItem, InventoryLocation, LocationBreadcrumb } from "@/lib/types/inventory";

export function useLocationData(id: string) {
  const [subLocations, setSubLocations] = useState<InventoryLocation[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [path, setPath] = useState<LocationBreadcrumb[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch sub-locations
      const locRes = await fetch(`/api/inventory/locations?parentId=${id}`);
      if (locRes.ok) setSubLocations(await locRes.json());

      // 2. Fetch items
      const itemRes = await fetch(`/api/inventory/items?locationId=${id}`);
      if (itemRes.ok) setItems(await itemRes.json());

      // 3. Fetch path for breadcrumbs
      const pathRes = await fetch(`/api/inventory/locations/${id}/path`);
      if (pathRes.ok) setPath(await pathRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Loading data on mount: the state it sets is what shows the spinner.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  return {
    subLocations,
    items,
    path,
    loading,
    fetchData,
  };
}
