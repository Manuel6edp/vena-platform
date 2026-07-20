-- =====================================================================
-- VENA · Reinicio limpio del esquema
-- Úsalo cuando existan tablas previas con columnas que no calzan.
-- Elimina y recrea institutions / inventory / thresholds desde cero.
-- (Las tablas VENA estaban vacías, no se pierden datos de la app.)
-- Pégalo COMPLETO en el SQL Editor de Supabase y pulsa Run.
-- =====================================================================

-- 1. Borrar tablas previas (cascade elimina políticas, índices y triggers)
drop table if exists public.inventory  cascade;
drop table if exists public.thresholds cascade;
drop table if exists public.institutions cascade;

-- 2. Instituciones
create table public.institutions (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null,
  city       text,
  phone      text,
  created_at timestamptz not null default now()
);

-- 3. Inventario
create table public.inventory (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions (id) on delete cascade,
  component_type  text not null,
  blood_type      text not null,
  units           integer not null default 0 check (units >= 0),
  expiration_date date,
  status          text not null default 'disponible',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index inventory_institution_idx on public.inventory (institution_id);
create index inventory_lookup_idx on public.inventory (component_type, blood_type);

-- 4. Umbrales
create table public.thresholds (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions (id) on delete cascade,
  component_type  text not null,
  blood_type      text not null,
  min_units       integer not null default 0 check (min_units >= 0),
  unique (institution_id, component_type, blood_type)
);

-- 5. updated_at automático
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger inventory_set_updated_at
  before update on public.inventory
  for each row execute function public.set_updated_at();

-- 6. Crear institución al registrarse un usuario
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

-- 7. Backfill: crear institución para usuarios ya registrados sin perfil
insert into public.institutions (id, name)
select u.id,
       coalesce(u.raw_user_meta_data ->> 'institution_name', 'Institución sin nombre')
from auth.users u
left join public.institutions i on i.id = u.id
where i.id is null;

-- 8. Row Level Security
alter table public.institutions enable row level security;
alter table public.inventory    enable row level security;
alter table public.thresholds   enable row level security;

create policy institutions_select on public.institutions
  for select to authenticated using (true);
create policy institutions_update on public.institutions
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy institutions_insert on public.institutions
  for insert to authenticated with check (id = auth.uid());

create policy inventory_select on public.inventory
  for select to authenticated using (true);
create policy inventory_write on public.inventory
  for all to authenticated
  using (institution_id = auth.uid()) with check (institution_id = auth.uid());

create policy thresholds_all on public.thresholds
  for all to authenticated
  using (institution_id = auth.uid()) with check (institution_id = auth.uid());

-- 9. Forzar recarga del caché de esquema de PostgREST
notify pgrst, 'reload schema';
