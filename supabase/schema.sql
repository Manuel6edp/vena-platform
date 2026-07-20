-- =====================================================================
-- VENA · Esquema de base de datos (Supabase / PostgreSQL)
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase.
-- Es idempotente: puede volver a ejecutarse sin errores.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Instituciones de salud (una por usuario de auth)
-- ---------------------------------------------------------------------
create table if not exists public.institutions (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null,
  city       text,
  phone      text,
  created_at timestamptz not null default now()
);

-- Reparación: agrega columnas si la tabla ya existía sin ellas.
alter table public.institutions add column if not exists city  text;
alter table public.institutions add column if not exists phone text;

-- ---------------------------------------------------------------------
-- 2. Inventario de hemocomponentes (por lote)
-- ---------------------------------------------------------------------
create table if not exists public.inventory (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions (id) on delete cascade,
  component_type  text not null,   -- globulos_rojos | plasma | plaquetas | crioprecipitado | sangre_total
  blood_type      text not null,   -- O-, O+, A-, A+, B-, B+, AB-, AB+
  units           integer not null default 0 check (units >= 0),
  expiration_date date,
  status          text not null default 'disponible', -- disponible | reservado | cuarentena
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Reparación: agrega columnas si la tabla ya existía sin ellas.
alter table public.inventory add column if not exists component_type  text;
alter table public.inventory add column if not exists blood_type      text;
alter table public.inventory add column if not exists units           integer not null default 0;
alter table public.inventory add column if not exists expiration_date date;
alter table public.inventory add column if not exists status          text not null default 'disponible';
alter table public.inventory add column if not exists notes           text;
alter table public.inventory add column if not exists created_at      timestamptz not null default now();
alter table public.inventory add column if not exists updated_at      timestamptz not null default now();

create index if not exists inventory_institution_idx on public.inventory (institution_id);
create index if not exists inventory_lookup_idx on public.inventory (component_type, blood_type);

-- ---------------------------------------------------------------------
-- 3. Umbrales de stock mínimo (por componente + tipo de sangre)
-- ---------------------------------------------------------------------
create table if not exists public.thresholds (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions (id) on delete cascade,
  component_type  text not null,
  blood_type      text not null,
  min_units       integer not null default 0 check (min_units >= 0),
  unique (institution_id, component_type, blood_type)
);

-- Reparación: agrega columnas si la tabla ya existía sin ellas.
alter table public.thresholds add column if not exists component_type text;
alter table public.thresholds add column if not exists blood_type     text;
alter table public.thresholds add column if not exists min_units      integer not null default 0;

-- ---------------------------------------------------------------------
-- 4. updated_at automático en inventory
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists inventory_set_updated_at on public.inventory;
create trigger inventory_set_updated_at
  before update on public.inventory
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 5. Crear institución automáticamente al registrarse un usuario
--    (usa el metadata institution_name enviado en signUp)
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.institutions (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'institution_name', 'Institución sin nombre')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 6. Row Level Security
--    - institutions e inventory: lectura para toda institución autenticada
--      (necesario para la Red VENA), escritura sólo del dueño.
--    - thresholds: privado de cada institución.
-- ---------------------------------------------------------------------
alter table public.institutions enable row level security;
alter table public.inventory    enable row level security;
alter table public.thresholds   enable row level security;

-- institutions
drop policy if exists institutions_select on public.institutions;
create policy institutions_select on public.institutions
  for select to authenticated using (true);

drop policy if exists institutions_update on public.institutions;
create policy institutions_update on public.institutions
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists institutions_insert on public.institutions;
create policy institutions_insert on public.institutions
  for insert to authenticated with check (id = auth.uid());

-- inventory
drop policy if exists inventory_select on public.inventory;
create policy inventory_select on public.inventory
  for select to authenticated using (true);

drop policy if exists inventory_write on public.inventory;
create policy inventory_write on public.inventory
  for all to authenticated
  using (institution_id = auth.uid())
  with check (institution_id = auth.uid());

-- thresholds
drop policy if exists thresholds_all on public.thresholds;
create policy thresholds_all on public.thresholds
  for all to authenticated
  using (institution_id = auth.uid())
  with check (institution_id = auth.uid());
