
-- Habilitar extensão para geração de UUID se necessário
create extension if not exists "pgcrypto";

-- 1. Tabela de Ajustes (Logo, Status da Loja)
create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default now()
);

-- Inserir valores padrão se não existirem
insert into settings (key, value) values ('is_open', 'true'::jsonb) on conflict do nothing;
insert into settings (key, value) values ('logo_url', '""'::jsonb) on conflict do nothing;

-- 2. Tabela de Categorias
create table if not exists categories (
  id text primary key,
  name text not null,
  created_at timestamp with time zone default now()
);

-- 3. Tabela de Subcategorias
create table if not exists sub_categories (
  id text primary key,
  category_id text references categories(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default now()
);

-- 4. Tabela de Produtos
create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  price numeric not null,
  category text,
  sub_category text,
  image text,
  rating numeric default 5,
  created_at timestamp with time zone default now()
);

-- 5. Tabela de Adicionais (Complements)
create table if not exists complements (
  id text primary key,
  name text not null,
  price numeric not null,
  active boolean default true,
  applicable_categories text[], -- Array de IDs de categorias
  created_at timestamp with time zone default now()
);

-- 6. Tabela de Clientes
create table if not exists customers (
  id text primary key,
  name text not null,
  email text unique,
  phone text unique not null,
  address text,
  neighborhood text,
  zip_code text,
  total_orders numeric default 0,
  points numeric default 0,
  last_order timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- 7. Tabela de Pedidos
create table if not exists nilo_orders (
  id text primary key,
  customer_name text,
  customer_phone text,
  customer_address text,
  items jsonb not null,
  total numeric not null,
  delivery_fee numeric default 0,
  delivery_type text default 'DELIVERY',
  status text default 'NOVO',
  payment_method text,
  order_change numeric default 0,
  created_at timestamp with time zone default now()
);

-- 8. Tabela de CEPs/Taxas
create table if not exists zip_ranges (
  id text primary key,
  start_zip text not null,
  end_zip text not null,
  fee numeric not null,
  created_at timestamp with time zone default now()
);

-- 9. Tabela de Métodos de Pagamento (ID como UUID obrigatório)
create table if not exists payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null, -- 'ONLINE' ou 'DELIVERY'
  enabled boolean default true,
  description text,
  email text,
  token text,
  created_at timestamp with time zone default now()
);

-- 10. Habilitar Realtime
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table 
    nilo_orders, 
    products, 
    categories, 
    sub_categories, 
    complements, 
    zip_ranges, 
    payment_methods, 
    settings, 
    customers;
commit;

-- 11. Desativar RLS para facilitar (Ambiente Controlado)
alter table settings disable row level security;
alter table categories disable row level security;
alter table sub_categories disable row level security;
alter table products disable row level security;
alter table complements disable row level security;
alter table customers disable row level security;
alter table nilo_orders disable row level security;
alter table zip_ranges disable row level security;
alter table payment_methods disable row level security;
