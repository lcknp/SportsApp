// Supabase Edge Function: holt die letzten Strava-Aktivitäten und legt neue
// Läufe in der runs-Tabelle an (Duplikat-Schutz über strava_id). Spiegelt
// das Verhalten der manuellen Eingabe inkl. 'Lauf'-Eintrag im Kalender.
//
// Benötigte Secrets: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return json({ error: 'Nicht angemeldet' }, 401);
    }

    const { data: account } = await supabase
      .from('strava_accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!account) {
      return json({ error: 'Strava ist nicht verbunden.' }, 400);
    }

    // Access-Token erneuern, falls (fast) abgelaufen
    let accessToken = account.access_token;
    if (account.expires_at * 1000 < Date.now() + 60_000) {
      const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: Deno.env.get('STRAVA_CLIENT_ID'),
          client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
          refresh_token: account.refresh_token,
          grant_type: 'refresh_token',
        }),
      });
      const refreshed = await refreshResponse.json();
      if (!refreshed.access_token) {
        return json({ error: 'Strava-Token konnte nicht erneuert werden. Bitte neu verbinden.' }, 400);
      }
      accessToken = refreshed.access_token;
      await supabase
        .from('strava_accounts')
        .update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          expires_at: refreshed.expires_at,
        })
        .eq('user_id', user.id);
    }

    // Letzte 100 Aktivitäten holen, Läufe herausfiltern
    const activitiesResponse = await fetch(
      'https://www.strava.com/api/v3/athlete/activities?per_page=100',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!activitiesResponse.ok) {
      return json({ error: 'Strava-Abruf fehlgeschlagen (HTTP ' + activitiesResponse.status + ')' }, 502);
    }
    const activities = await activitiesResponse.json();
    const stravaRuns = (activities as any[]).filter((activity) =>
      String(activity.sport_type ?? activity.type ?? '').includes('Run'),
    );

    if (stravaRuns.length === 0) {
      await supabase.from('strava_accounts').update({ last_sync_at: new Date().toISOString() }).eq('user_id', user.id);
      return json({ imported: 0 });
    }

    // Welche Läufe gibt es schon? (für die Anzahl neuer Importe + Kalender-Einträge)
    const { data: existing } = await supabase
      .from('runs')
      .select('strava_id')
      .eq('user_id', user.id)
      .in('strava_id', stravaRuns.map((run) => run.id));
    const existingIds = new Set((existing ?? []).map((row) => Number(row.strava_id)));

    // Zusatzdaten aus der Übersicht mitnehmen — kostet keinen extra Request.
    function buildStats(run: any) {
      return {
        name: run.name ?? null,
        started_at: run.start_date_local ?? run.start_date ?? null,
        elapsed_minutes: run.elapsed_time != null ? Math.round((run.elapsed_time / 60) * 10) / 10 : null,
        elevation_gain: run.total_elevation_gain ?? null,
        avg_heartrate: run.average_heartrate ?? null,
        max_heartrate: run.max_heartrate ?? null,
        avg_cadence: run.average_cadence ?? null,
        max_speed: run.max_speed ?? null,
        suffer_score: run.suffer_score ?? null,
        kudos_count: run.kudos_count ?? null,
        achievement_count: run.achievement_count ?? null,
        polyline: run.map?.summary_polyline ?? null,
      };
    }

    // Upsert über strava_id: legt neue Läufe an und befüllt bei bereits
    // importierten die Zusatzdaten nach (Backfill). strava_detail bleibt unberührt.
    const rows = stravaRuns.map((run) => ({
      user_id: user.id,
      date: String(run.start_date_local ?? run.start_date).slice(0, 10),
      distance_km: Math.round((run.distance / 1000) * 100) / 100,
      duration_minutes: Math.round((run.moving_time / 60) * 10) / 10,
      strava_id: run.id,
      strava_stats: buildStats(run),
    }));

    const { error: upsertError } = await supabase
      .from('runs')
      .upsert(rows, { onConflict: 'strava_id' });
    if (upsertError) {
      return json({ error: upsertError.message }, 500);
    }

    // Kalender-Einträge nur für wirklich neue Läufe (wie bei der manuellen Eingabe)
    const newRuns = rows.filter((row) => !existingIds.has(Number(row.strava_id)));
    if (newRuns.length > 0) {
      await supabase.from('workout_sessions').insert(
        newRuns.map((run) => ({ user_id: user.id, date: run.date, name: 'Lauf', completed: true })),
      );
    }

    await supabase.from('strava_accounts').update({ last_sync_at: new Date().toISOString() }).eq('user_id', user.id);
    return json({ imported: newRuns.length });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
