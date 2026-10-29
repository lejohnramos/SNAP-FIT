-- ============================================================
-- Snap-Fit Collectibles — B2B Platform Sync System
-- Supabase (PostgreSQL) schema
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================

-- ------------------------------------------------------------
-- 1. CUSTOMERS
--    B2B customer master list. Orders link to customers by id
--    via the orders.customer_id foreign key.
-- ------------------------------------------------------------
create table if not exists customers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  contact_info text,                            -- email / phone / address, etc.
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. PRODUCTS
--    Collectible items in the inventory.
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
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. ORDERS
--    Customer sales orders received through the platforms:
--    'Shopee', 'Lazada', or 'FB' (Facebook). Each order links to a
--    customer from the customers table via customer_id (nullable FK).
-- ------------------------------------------------------------
create table if not exists orders (
  id           uuid primary key default gen_random_uuid(),
  platform     text not null
               check (platform in ('Shopee', 'Lazada', 'FB')),
  order_type   text not null default 'Standard'
               check (order_type in ('Standard', 'Pre-order')),
  status       text not null,                       -- e.g. 'Pending', 'Shipped', 'Completed'
  customer_id  uuid references customers (id) on delete set null,
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
-- 3b. MIGRATION for existing databases: add customer_id to orders
--     (links each order to a customer from the customers table,
--     replacing the old free-text customer_name field. Idempotent -
--     run once in the Supabase SQL Editor.)
-- ------------------------------------------------------------
alter table orders
  add column if not exists customer_id uuid references customers (id) on delete set null;

-- ------------------------------------------------------------
-- 3c. MIGRATION for existing databases: add order_type to orders
--     (Distinguishes 'Standard' stock sales from 'Pre-order' sales.
--     Idempotent - run once in the Supabase SQL Editor. Existing
--     rows are backfilled with 'Standard'.)
-- ------------------------------------------------------------
alter table orders
  add column if not exists order_type text not null default 'Standard';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_order_type_check'
  ) then
    alter table orders
      add constraint orders_order_type_check
      check (order_type in ('Standard', 'Pre-order'));
  end if;
end $$;

-- ------------------------------------------------------------
-- 4. TRANSACTIONS (formerly stock_movements)
--    Audit log of every sales event for a product. Renamed from
--    `stock_movements` to `transactions` in the B2B Platform Sync
--    architecture.
--    sales is positive for stock-in, negative for stock-out.
--    user_id references Supabase Auth users (auth.users).
-- ------------------------------------------------------------
create table if not exists transactions (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null,
  sales       integer not null
              check (sales <> 0),
  reason      text,                            -- e.g. 'Sale', 'Restock', 'Damage'
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4a. MIGRATION for existing databases: rename the legacy
--     `stock_movements` table to `transactions` and its
--     `quantity_changed` column to `sales`. Idempotent - run once
--     in the Supabase SQL Editor. (Skipped automatically if the
--     transactions table already exists.)
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_tables where tablename = 'transactions'
  ) then
    alter table stock_movements rename to transactions;
    alter table transactions
      rename column quantity_changed to sales;
  end if;
end $$;

-- ------------------------------------------------------------
-- 4b. MIGRATION for existing databases: drop the removed
--     `purchase_orders` and `suppliers` tables (and the legacy
--     products.supplier_id column) since the Procurement module
--     has been removed. Idempotent - run once in the Supabase
--     SQL Editor.
-- ------------------------------------------------------------
drop table if exists purchase_orders;
drop table if exists suppliers cascade;
alter table products drop column if exists supplier_id;

-- ------------------------------------------------------------
-- Indexes for the most common lookups / joins
-- ------------------------------------------------------------
create index if not exists idx_orders_platform on orders (platform);
create index if not exists idx_orders_created_at on orders (created_at desc);
create index if not exists idx_orders_customer on orders (customer_id);
create index if not exists idx_transactions_product on transactions (product_id);

-- ------------------------------------------------------------
-- Row Level Security (RLS)
--    RLS is enabled on every table. These starter policies allow
--    full access for authenticated users only; tighten them to
--    role-specific policies before going to production.
-- ------------------------------------------------------------
alter table customers enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table transactions enable row level security;

create policy "authenticated_users_full_access_customers"
  on customers for all to authenticated
  using (true) with check (true);

create policy "authenticated_users_full_access_products"
  on products for all to authenticated
  using (true) with check (true);

create policy "authenticated_users_full_access_orders"
  on orders for all to authenticated
  using (true) with check (true);

create policy "authenticated_users_full_access_transactions"
  on transactions for all to authenticated
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
