create table if not exists public.favorite_places (
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

alter table public.favorite_places enable row level security;

drop policy if exists "Users can read their own favorites" on public.favorite_places;
drop policy if exists "Users can add their own favorites" on public.favorite_places;
drop policy if exists "Users can remove their own favorites" on public.favorite_places;

create policy "Users can read their own favorites"
on public.favorite_places for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add their own favorites"
on public.favorite_places for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can remove their own favorites"
on public.favorite_places for delete
to authenticated
using ((select auth.uid()) = user_id);
