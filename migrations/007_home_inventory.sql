CREATE TABLE IF NOT EXISTS inventory_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    parent_id UUID REFERENCES inventory_locations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_locations_user_id ON inventory_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_locations_parent_id ON inventory_locations(parent_id);

CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    location_id UUID REFERENCES inventory_locations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    purchase_date DATE,
    warranty_expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id ON inventory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_location_id ON inventory_items(location_id);
-- GIN index for faster tag searches
CREATE INDEX IF NOT EXISTS idx_inventory_items_tags ON inventory_items USING GIN(tags);

CREATE TABLE IF NOT EXISTS inventory_item_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    blob_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_item_images_item_id ON inventory_item_images(item_id);
