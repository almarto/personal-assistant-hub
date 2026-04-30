export type LocationType = 'Space' | 'Furniture' | 'Container';

export interface InventoryLocation {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  type: LocationType;
  created_at: Date;
  updated_at: Date;
}

export interface InventoryItem {
  id: string;
  user_id: string;
  location_id: string | null;
  name: string;
  description: string | null;
  tags: string[]; // text array in DB
  purchase_date: Date | null;
  warranty_expiry_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface InventoryItemImage {
  id: string;
  item_id: string;
  blob_url: string;
  created_at: Date;
}

// Derived types for UI
export interface LocationHierarchyNode extends InventoryLocation {
  children?: LocationHierarchyNode[];
}

export interface LocationBreadcrumb {
  id: string;
  name: string;
  type: string;
}

export interface ItemWithImages extends InventoryItem {
  images?: InventoryItemImage[];
  location_path?: LocationBreadcrumb[];
}
