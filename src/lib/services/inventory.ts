import { query } from "@/lib/db";
import {
  InventoryItem,
  InventoryItemImage,
  InventoryLocation,
  ItemWithImages,
  LocationBreadcrumb,
} from "@/lib/types/inventory";

// ---------------- Locations ---------------- //

export async function createLocation(data: {
  userId: string;
  parentId?: string | null;
  name: string;
  type: string;
}): Promise<InventoryLocation> {
  const result = await query(
    `INSERT INTO inventory_locations (user_id, parent_id, name, type) 
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.userId, data.parentId || null, data.name, data.type]
  );
  return result.rows[0];
}

export async function getLocations(
  userId: string,
  parentId?: string | null
): Promise<InventoryLocation[]> {
  let result;
  if (parentId === undefined) {
    // Get all locations for user
    result = await query(
      `SELECT * FROM inventory_locations WHERE user_id = $1 ORDER BY name ASC`,
      [userId]
    );
  } else if (parentId === null) {
    // Get top-level locations
    result = await query(
      `SELECT * FROM inventory_locations WHERE user_id = $1 AND parent_id IS NULL ORDER BY name ASC`,
      [userId]
    );
  } else {
    // Get children of a location
    result = await query(
      `SELECT * FROM inventory_locations WHERE user_id = $1 AND parent_id = $2 ORDER BY name ASC`,
      [userId, parentId]
    );
  }
  return result.rows;
}

export async function getLocationPath(
  locationId: string
): Promise<LocationBreadcrumb[]> {
  // Uses a recursive CTE to traverse up the tree to build breadcrumbs
  const result = await query(
    `WITH RECURSIVE path AS (
       SELECT id, parent_id, name, type, 1 as depth
       FROM inventory_locations
       WHERE id = $1
       
       UNION ALL
       
       SELECT l.id, l.parent_id, l.name, l.type, p.depth + 1
       FROM inventory_locations l
       JOIN path p ON l.id = p.parent_id
     )
     SELECT id, name, type FROM path ORDER BY depth DESC`,
    [locationId]
  );
  return result.rows;
}

// ---------------- Items ---------------- //

export async function createItem(data: {
  userId: string;
  locationId: string;
  name: string;
  description: string | null;
  tags: string[];
  purchaseDate: string | null;
  warrantyExpiryDate: string | null;
}): Promise<InventoryItem> {
  const result = await query(
    `INSERT INTO inventory_items 
     (user_id, location_id, name, description, tags, purchase_date, warranty_expiry_date) 
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      data.userId,
      data.locationId,
      data.name,
      data.description || null,
      data.tags || [],
      data.purchaseDate || null,
      data.warrantyExpiryDate || null,
    ]
  );
  return result.rows[0];
}

export async function getItems(
  userId: string,
  filters: { locationId?: string; search?: string; tag?: string }
): Promise<ItemWithImages[]> {
  const params: string[] = [userId];
  const conditions = ["user_id = $1"];
  
  if (filters.locationId) {
    params.push(filters.locationId);
    conditions.push(`location_id = $${params.length}`);
  }
  
  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`name ILIKE $${params.length}`);
  }

  if (filters.tag) {
    params.push(filters.tag);
    conditions.push(`$${params.length} = ANY(tags)`);
  }

  const result = await query(
    `SELECT * FROM inventory_items 
     WHERE ${conditions.join(" AND ")} 
     ORDER BY created_at DESC`,
    params
  );
  
  // We attach images via a lightweight left join grouping or subsequent queries. 
  // Let's do subsequent queries or json_agg for simplicity.
  // We didn't do json_agg here to keep query simple, let's fetch IDs to get images.
  const items: ItemWithImages[] = result.rows;
  
  if (items.length > 0) {
    const itemIds = items.map(i => i.id);
    // Use ANY array syntax which is fast in Postgres
    const imagesResult = await query(
      `SELECT * FROM inventory_item_images WHERE item_id = ANY($1)`,
      [itemIds]
    );
    const imagesByItem = new Map<string, InventoryItemImage[]>();
    for (const img of imagesResult.rows) {
      if (!imagesByItem.has(img.item_id)) imagesByItem.set(img.item_id, []);
      imagesByItem.get(img.item_id)!.push(img);
    }
    
    for (const item of items) {
      item.images = imagesByItem.get(item.id) || [];
    }
  }

  return items;
}

export async function getItem(id: string, userId: string): Promise<ItemWithImages | null> {
  const result = await query(
    `SELECT * FROM inventory_items WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  if (result.rows.length === 0) return null;
  const item: ItemWithImages = result.rows[0];

  const imagesResult = await query(
    `SELECT * FROM inventory_item_images WHERE item_id = $1 ORDER BY created_at ASC`,
    [id]
  );
  item.images = imagesResult.rows;

  if (item.location_id) {
     item.location_path = await getLocationPath(item.location_id);
  }

  return item;
}

export async function addItemImage(itemId: string, blobUrl: string): Promise<InventoryItemImage> {
  const result = await query(
    `INSERT INTO inventory_item_images (item_id, blob_url) VALUES ($1, $2) RETURNING *`,
    [itemId, blobUrl]
  );
  return result.rows[0];
}

export async function deleteLocation(id: string, userId: string): Promise<void> {
  await query(
    `DELETE FROM inventory_locations WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}

export async function deleteItem(id: string, userId: string): Promise<void> {
  await query(
    `DELETE FROM inventory_items WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}

export async function deleteItemImage(id: string, userId: string): Promise<void> {
  // We check that the image belongs to an item owned by the user
  await query(
    `DELETE FROM inventory_item_images 
     WHERE id = $1 AND item_id IN (SELECT id FROM inventory_items WHERE user_id = $2)`,
    [id, userId]
  );
}
