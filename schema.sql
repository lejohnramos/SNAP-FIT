-- ============================================================
-- Snap-Fit Collectibles — Inventory & Procurement System
-- Supabase (PostgreSQL) schema
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================

-- ------------------------------------------------------------
-- 1. SUPPLIERS
--    Master list of vendors the business buys collectibles from.
-- ------------------------------------------------------------
create table if not exists suppliers (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  contact_info       text,                          -- email / phone / address, etc.
  performance_rating numeric(3, 2)                  -- 0.00 - 5.00 star rating
                     check (performance_rating >= 0 and performance_rating <= 5),
  created_at         timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. PRODUCTS
--    Collectible items in the inventory. Each product can be
--    linked to a supplier for restocking (nullable FK).
-- ------------------------------------------------------------
create table if not exists products (
  id              uuid primary key default gen_random_uuid(),
  sku             text not null unique,
  name            text not null,
  condition_grade text not null,                    -- e.g. 'Mint', 'Near Mint'
  edition         text,
  variation       text,
  stock_level     integer not null default 0
                  check (stock_level >= 0),
  reorder_point   integer not null default 0
                  check (reorder_point >= 0),
  cost            numeric(12, 2),                   -- buying price (PHP)
  price           numeric(12, 2),                   -- selling price (PHP)
  supplier_id     uuid references suppliers (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. ORDERS
--    Customer sales orders received through the platforms:
--    'Shopee', 'Lazada', or 'FB' (Facebook).
-- ------------------------------------------------------------
create table if not exists orders (
  id           uuid primary key default gen_random_uuid(),
  platform     text not null
               check (platform in ('Shopee', 'Lazada', 'FB')),
  status       text not null,                       -- e.g. 'Pending', 'Shipped', 'Completed'
  product_id   uuid references products (id) on delete set null,
  quantity     integer not null default 1
               check (quantity > 0),
  total_amount numeric(12, 2) not null default 0,
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3a. MIGRATION for existing databases: add product/quantity to orders
--     (CREATE TABLE IF NOT EXISTS above will NOT alter a table that
--     already exists, so run these idempotent statements once in the
--     Supabase SQL Editor if your orders table predates them).
-- ------------------------------------------------------------
alter table orders
  add column if not exists product_id uuid references products (id) on delete set null;
alter table orders
  add column if not exists quantity integer not null default 1 check (quantity > 0);
create index if not exists idx_orders_product on orders (product_id);

-- ------------------------------------------------------------
-- 3b. MIGRATION for existing databases: add customer_name to orders
--     (lets the Order History Ledger search and export customer names.
--     Idempotent - run once in the Supabase SQL Editor).
-- ------------------------------------------------------------
alter table orders
  add column if not exists customer_name text;

-- ------------------------------------------------------------
-- 4. PURCHASE ORDERS
--    Restock orders placed with suppliers.
-- ------------------------------------------------------------
create table if not exists purchase_orders (
  id          uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers (id) on delete cascade,
  status      text not null default 'pending',      -- e.g. 'pending', 'shipped', 'received'
  total_cost  numeric(12, 2) not null default 0,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. STOCK MOVEMENTS
--    Audit log of every stock in/out event for a product.
--    quantity_changed is positive for stock-in, negative for stock-out.
--    user_id references Supabase Auth users (auth.users).
-- ------------------------------------------------------------
create table if not exists stock_movements (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references products (id) on delete cascade,
  user_id          uuid references auth.users (id) on delete set null,
  quantity_changed integer not null
                   check (quantity_changed <> 0),
  reason           text,                            -- e.g. 'Sale', 'Restock', 'Damage'
  created_at       timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Indexes for the most common lookups / joins
-- ------------------------------------------------------------
create index if not exists idx_products_supplier on products (supplier_id);
create index if not exists idx_orders_platform on orders (platform);
create index if not exists idx_orders_created_at on orders (created_at desc);
create index if not exists idx_purchase_orders_supplier on purchase_orders (supplier_id);
create index if not exists idx_stock_movements_product on stock_movements (product_id);

-- ------------------------------------------------------------
-- Row Level Security (RLS)
--    RLS is enabled on every table. These starter policies allow
--    full access for authenticated users only; tighten them to
--    role-specific policies before going to production.
-- ------------------------------------------------------------
alter table suppliers enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table purchase_orders enable row level security;
alter table stock_movements enable row level security;

create policy "authenticated_users_full_access_suppliers"
  on suppliers for all to authenticated
  using (true) with check (true);

create policy "authenticated_users_full_access_products"
  on products for all to authenticated
  using (true) with check (true);

create policy "authenticated_users_full_access_orders"
  on orders for all to authenticated
  using (true) with check (true);

create policy "authenticated_users_full_access_purchase_orders"
  on purchase_orders for all to authenticated
  using (true) with check (true);

create policy "authenticated_users_full_access_stock_movements"
  on stock_movements for all to authenticated
  using (true) with check (true);

-- ------------------------------------------------------------
-- updated_at trigger for products
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_products_set_updated_at
  before update on products
  for each row
  execute function set_updated_at();
