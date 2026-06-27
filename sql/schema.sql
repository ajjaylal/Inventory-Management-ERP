-- Database Schema for Inventory Management System

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    full_name text not null,
    email text not null,
    role text not null check (role in ('Admin', 'Staff')) default 'Staff',
    status text not null check (status in ('Active', 'Inactive')) default 'Active',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- 2. UNITS OF MEASURE
create table if not exists public.units_of_measure (
    id uuid default gen_random_uuid() primary key,
    name text not null unique,
    abbreviation text not null unique,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.units_of_measure enable row level security;

-- Insert default units of measure
insert into public.units_of_measure (name, abbreviation) values
('Gram', 'g'),
('Kilogram', 'kg'),
('Piece', 'pc'),
('Packet', 'pkt'),
('Box', 'box'),
('Bottle', 'btl'),
('Tray', 'tray'),
('Carton', 'ctn')
on conflict do nothing;

-- 3. STOCK ITEMS
create table if not exists public.stock_items (
    id uuid default gen_random_uuid() primary key,
    item_name text not null unique,
    category text not null,
    description text,
    uom_id uuid references public.units_of_measure(id) on delete restrict not null,
    cached_quantity numeric(12, 2) default 0.00 not null check (cached_quantity >= 0.00),
    low_stock_level numeric(12, 2) default 0.00 not null check (low_stock_level >= 0.00),
    status text not null check (status in ('Active', 'Inactive')) default 'Active',
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.stock_items enable row level security;

-- 4. PRODUCTS
create table if not exists public.products (
    id uuid default gen_random_uuid() primary key,
    product_name text not null,
    product_code text not null unique,
    description text,
    selling_price numeric(12, 2) not null check (selling_price >= 0.00),
    status text not null check (status in ('Active', 'Inactive', 'Archived')) default 'Active',
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.products enable row level security;

-- 5. PRODUCT INGREDIENTS (Bill of Materials)
create table if not exists public.product_ingredients (
    id uuid default gen_random_uuid() primary key,
    product_id uuid references public.products(id) on delete cascade not null,
    stock_item_id uuid references public.stock_items(id) on delete restrict not null,
    quantity numeric(12, 2) not null check (quantity > 0.00),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(product_id, stock_item_id)
);

alter table public.product_ingredients enable row level security;

-- 6. SALES
create table if not exists public.sales (
    id uuid default gen_random_uuid() primary key,
    invoice_number text not null unique,
    customer_name text,
    sale_date timestamp with time zone default timezone('utc'::text, now()) not null,
    remarks text,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.sales enable row level security;

-- 7. SALE ITEMS
create table if not exists public.sale_items (
    id uuid default gen_random_uuid() primary key,
    sale_id uuid references public.sales(id) on delete cascade not null,
    product_id uuid references public.products(id) on delete restrict not null,
    quantity integer not null check (quantity > 0),
    selling_price numeric(12, 2) not null check (selling_price >= 0.00),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.sale_items enable row level security;

-- 8. STOCK TRANSACTIONS (Audit Ledger)
create table if not exists public.stock_transactions (
    id uuid default gen_random_uuid() primary key,
    stock_item_id uuid references public.stock_items(id) on delete restrict not null,
    transaction_type text not null check (transaction_type in (
        'Initial Stock', 'Stock In', 'Stock Out', 'Manual Adjustment', 
        'Damaged Stock', 'Expired Stock', 'Returned Stock', 'System Adjustment'
    )),
    quantity numeric(12, 2) not null,
    remarks text,
    created_by uuid references public.profiles(id) on delete set null,
    reference_type text check (reference_type in ('Sale', 'Manual Adjustment', 'Initial Stock', 'Purchase', 'Return', 'Damage', 'Expired', 'System Adjustment')),
    reference_id uuid, -- Reference to sale_items or others
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.stock_transactions enable row level security;

-- 9. AUDIT LOGS
create table if not exists public.audit_logs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete set null,
    action text not null,
    table_name text not null,
    record_id uuid,
    old_values jsonb,
    new_values jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.audit_logs enable row level security;


-- INDEXES FOR PERFORMANCE
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_stock_items_name on public.stock_items(item_name);
create index if not exists idx_stock_items_category on public.stock_items(category);
create index if not exists idx_products_code on public.products(product_code);
create index if not exists idx_products_name on public.products(product_name);
create index if not exists idx_sales_invoice on public.sales(invoice_number);
create index if not exists idx_sales_date on public.sales(sale_date);
create index if not exists idx_stock_transactions_item on public.stock_transactions(stock_item_id);


-- TRIGGERS & FUNCTIONS

-- Trigger to update profiles on auth user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, full_name, email, role, status)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', 'System User'),
        new.email,
        coalesce(new.raw_user_meta_data->>'role', 'Staff'),
        'Active'
    );
    return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();


-- Trigger to sync updated_at timestamps
create or replace function public.trigger_set_timestamp()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger set_timestamp_profiles
    before update on public.profiles
    for each row execute procedure public.trigger_set_timestamp();

create trigger set_timestamp_stock_items
    before update on public.stock_items
    for each row execute procedure public.trigger_set_timestamp();

create trigger set_timestamp_products
    before update on public.products
    for each row execute procedure public.trigger_set_timestamp();


-- Trigger to maintain cached_quantity on stock_items from stock_transactions
create or replace function public.update_stock_cache()
returns trigger as $$
declare
    qty_diff numeric(12, 2);
begin
    if (TG_OP = 'INSERT') then
        qty_diff := new.quantity;
        update public.stock_items
        set cached_quantity = cached_quantity + qty_diff
        where id = new.stock_item_id;
    elsif (TG_OP = 'DELETE') then
        qty_diff := -old.quantity;
        update public.stock_items
        set cached_quantity = cached_quantity + qty_diff
        where id = old.stock_item_id;
    elsif (TG_OP = 'UPDATE') then
        qty_diff := new.quantity - old.quantity;
        update public.stock_items
        set cached_quantity = cached_quantity + qty_diff
        where id = new.stock_item_id;
    end if;
    return new;
end;
$$ language plpgsql;

create trigger on_stock_transaction_mutation
    after insert or update or delete on public.stock_transactions
    for each row execute procedure public.update_stock_cache();


-- ROW LEVEL SECURITY POLICIES

-- profiles
create policy "Allow all users to read profiles" on public.profiles
    for select using (true);

create policy "Allow admin full access to profiles" on public.profiles
    for all using (
        exists (
            select 1 from public.profiles 
            where id = auth.uid() and role = 'Admin'
        )
    );

create policy "Allow users to update own profile" on public.profiles
    for update using (auth.uid() = id);

-- units_of_measure
create policy "Allow all users to read UOM" on public.units_of_measure
    for select using (true);

create policy "Allow admins to edit UOM" on public.units_of_measure
    for all using (
        exists (
            select 1 from public.profiles 
            where id = auth.uid() and role = 'Admin'
        )
    );

-- stock_items
create policy "Allow all users to read stock" on public.stock_items
    for select using (true);

create policy "Allow authenticated to write stock" on public.stock_items
    for all using (
        exists (
            select 1 from public.profiles 
            where id = auth.uid()
        )
    );

-- products
create policy "Allow all users to read products" on public.products
    for select using (true);

create policy "Allow authenticated to write products" on public.products
    for all using (
        exists (
            select 1 from public.profiles 
            where id = auth.uid()
        )
    );

-- product_ingredients
create policy "Allow all users to read recipe" on public.product_ingredients
    for select using (true);

create policy "Allow authenticated to write recipe" on public.product_ingredients
    for all using (
        exists (
            select 1 from public.profiles 
            where id = auth.uid()
        )
    );

-- sales
create policy "Allow all users to read sales" on public.sales
    for select using (true);

create policy "Allow authenticated to create sales" on public.sales
    for insert with check (
        exists (
            select 1 from public.profiles 
            where id = auth.uid()
        )
    );

create policy "Allow admin and staff to modify sales" on public.sales
    for all using (
        exists (
            select 1 from public.profiles 
            where id = auth.uid()
        )
    );

-- sale_items
create policy "Allow all users to read sale items" on public.sale_items
    for select using (true);

create policy "Allow authenticated to write sale items" on public.sale_items
    for all using (
        exists (
            select 1 from public.profiles 
            where id = auth.uid()
        )
    );

-- stock_transactions
create policy "Allow all users to read stock transactions" on public.stock_transactions
    for select using (true);

create policy "Allow authenticated to write transactions" on public.stock_transactions
    for all using (
        exists (
            select 1 from public.profiles 
            where id = auth.uid()
        )
    );

-- audit_logs
create policy "Allow authenticated to read audit logs" on public.audit_logs
    for select using (
        exists (
            select 1 from public.profiles 
            where id = auth.uid()
        )
    );

create policy "Allow authenticated to write audit logs" on public.audit_logs
    for insert with check (
        exists (
            select 1 from public.profiles 
            where id = auth.uid()
        )
    );
