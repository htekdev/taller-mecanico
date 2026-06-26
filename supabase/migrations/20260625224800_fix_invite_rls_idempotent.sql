drop policy if exists "miembros_gestionar_invitaciones" on public.taller_invites;
create policy "miembros_gestionar_invitaciones"
on public.taller_invites
for all
to public
using (is_taller_member(taller_id))
with check (is_taller_member(taller_id));
