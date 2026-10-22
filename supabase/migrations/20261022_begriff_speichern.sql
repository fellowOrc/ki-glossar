-- Speichert einen Glossarbegriff samt Quellen und verwandten Begriffen in
-- EINER Transaktion: Entweder gelingt alles, oder nichts wird geändert.
-- Vorher schrieb das Formular die Tabellen einzeln; scheiterte ein Teil,
-- blieb ein halber Eintrag zurück (z. B. Quellen gelöscht, aber nicht neu
-- gespeichert).
--
-- SECURITY INVOKER: Die Funktion läuft mit den Rechten der angemeldeten
-- Person. Es gelten also exakt dieselben RLS-Policies wie bei direkten
-- Schreibzugriffen – die Funktion gewährt keine zusätzlichen Rechte.
--
-- p_term_id     null = neu anlegen, sonst diesen Begriff aktualisieren
-- p_daten       {name, slug, category_id, short_explanation, definition, business_relevance}
-- p_status      'draft' | 'published'; beim Bearbeiten null = unverändert
-- p_quellen     [{title, authors, publisher, year, url}] – ersetzt alle Quellen
-- p_verwandte   IDs verwandter Begriffe – ersetzt alle Verknüpfungen (beidseitig)
-- p_vorschlag_id  optional: Besuchervorschlag, der als übernommen markiert wird
--
-- Rückgabe: {"id": ..., "slug": ...}
create or replace function public.begriff_speichern(
  p_term_id uuid,
  p_daten jsonb,
  p_status text,
  p_quellen jsonb,
  p_verwandte uuid[],
  p_vorschlag_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_slug text;
begin
  if p_term_id is null then
    insert into public.terms (
      name, slug, category_id, short_explanation, definition,
      business_relevance, status, created_by
    )
    values (
      p_daten->>'name',
      p_daten->>'slug',
      nullif(p_daten->>'category_id', '')::uuid,
      p_daten->>'short_explanation',
      p_daten->>'definition',
      p_daten->>'business_relevance',
      coalesce(p_status, 'draft'),
      auth.uid()
    )
    returning id, slug into v_id, v_slug;
  else
    update public.terms set
      name = p_daten->>'name',
      slug = p_daten->>'slug',
      category_id = nullif(p_daten->>'category_id', '')::uuid,
      short_explanation = p_daten->>'short_explanation',
      definition = p_daten->>'definition',
      business_relevance = p_daten->>'business_relevance',
      status = coalesce(p_status, status)
    where id = p_term_id
    returning id, slug into v_id, v_slug;

    -- Ohne Treffer (nicht vorhanden oder keine Berechtigung laut RLS)
    -- nicht stillschweigend weitermachen.
    if v_id is null then
      raise exception 'Der Begriff wurde nicht gefunden oder du darfst ihn nicht bearbeiten.'
        using errcode = 'insufficient_privilege';
    end if;

    delete from public.sources where term_id = v_id;
    delete from public.term_relations
     where term_id = v_id or related_term_id = v_id;
  end if;

  insert into public.sources (term_id, title, authors, publisher, year, url)
  select v_id, q.title, q.authors, q.publisher, q.year, q.url
    from jsonb_to_recordset(coalesce(p_quellen, '[]'::jsonb))
      as q(title text, authors text, publisher text, year int, url text);

  insert into public.term_relations (term_id, related_term_id)
  select paar.a, paar.b
    from (select distinct r from unnest(coalesce(p_verwandte, '{}'::uuid[])) as r
           where r <> v_id) as v
    cross join lateral (values (v_id, v.r), (v.r, v_id)) as paar(a, b);

  if p_vorschlag_id is not null then
    update public.suggestions
       set status = 'uebernommen', handled_at = now(), handled_by = auth.uid()
     where id = p_vorschlag_id;
  end if;

  return jsonb_build_object('id', v_id, 'slug', v_slug);
end;
$$;

revoke all on function public.begriff_speichern(uuid, jsonb, text, jsonb, uuid[], uuid) from public, anon;
grant execute on function public.begriff_speichern(uuid, jsonb, text, jsonb, uuid[], uuid) to authenticated;
