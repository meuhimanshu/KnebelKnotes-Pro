drop policy if exists "anon can read antidepressant master" on public.antidepressant_master;
create policy "anon can read antidepressant master"
on public.antidepressant_master
for select
to anon
using (true);
