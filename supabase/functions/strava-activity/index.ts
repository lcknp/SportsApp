// Supabase Edge Function: lädt für EINEN Lauf die Detaildaten von Strava
// (Splits, Bestzeiten, Kalorien) und die Verlaufsdaten (Streams: Höhe, Puls,
// Tempo, GPS). Wird erst beim Aufklappen eines Laufs aufgerufen und das
// Ergebnis in runs.strava_detail gecacht, damit ein erneutes Öffnen keinen
// weiteren API-Call kostet.
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

    const { runId } = await req.json().catch(() => ({ runId: null }));
    if (!runId) {
      return json({ error: 'runId fehlt' }, 400);
    }

    // Lauf laden — gehört er dem User und stammt er von Strava?
    const { data: run } = await supabase
      .from('runs')
      .select('id, user_id, strava_id, strava_detail')
      .eq('id', runId)
      .maybeSingle();
    if (!run || run.user_id !== user.id) {
      return json({ error: 'Lauf nicht gefunden' }, 404);
    }
    if (!run.strava_id) {
      return json({ error: 'Dieser Lauf stammt nicht von Strava.' }, 400);
    }
    // Schon im Cache? Dann direkt zurückgeben, kein Strava-Request.
    if (run.strava_detail) {
      return json({ detail: run.strava_detail, cached: true });
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

    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Detail-Aktivität (Splits, Bestzeiten, Kalorien)
    const detailResponse = await fetch(
      `https://www.strava.com/api/v3/activities/${run.strava_id}?include_all_efforts=false`,
      { headers: authHeader },
    );
    if (!detailResponse.ok) {
      return json({ error: 'Strava-Detailabruf fehlgeschlagen (HTTP ' + detailResponse.status + ')' }, 502);
    }
    const activity = await detailResponse.json();

    // Streams (Verlaufsdaten). Schlägt das fehl, liefern wir trotzdem die Details.
    const streamKeys = 'distance,altitude,heartrate,velocity_smooth,latlng';
    const streamsResponse = await fetch(
      `https://www.strava.com/api/v3/activities/${run.strava_id}/streams?keys=${streamKeys}&key_by_type=true`,
      { headers: authHeader },
    );
    const rawStreams = streamsResponse.ok ? await streamsResponse.json() : {};

    // Streams ausdünnen, damit das gespeicherte JSON klein bleibt (~max 200 Punkte).
    function downsample(values: any[] | undefined, max = 200): any[] {
      if (!Array.isArray(values) || values.length === 0) return [];
      if (values.length <= max) return values;
      const step = Math.ceil(values.length / max);
      return values.filter((_, index) => index % step === 0);
    }

    const detail = {
      calories: activity.calories ?? null,
      splits: Array.isArray(activity.splits_metric)
        ? activity.splits_metric.map((split: any) => ({
            km: split.split,
            distance: split.distance,
            moving_time: split.moving_time,
            elevation_diff: split.elevation_difference ?? null,
            avg_speed: split.average_speed ?? null,
            avg_hr: split.average_heartrate ?? null,
          }))
        : [],
      best_efforts: Array.isArray(activity.best_efforts)
        ? activity.best_efforts.map((effort: any) => ({
            name: effort.name,
            seconds: effort.elapsed_time,
            distance: effort.distance,
          }))
        : [],
      streams: {
        distance: downsample(rawStreams.distance?.data),
        altitude: downsample(rawStreams.altitude?.data),
        heartrate: downsample(rawStreams.heartrate?.data),
        velocity: downsample(rawStreams.velocity_smooth?.data),
        latlng: downsample(rawStreams.latlng?.data),
      },
    };

    await supabase.from('runs').update({ strava_detail: detail }).eq('id', run.id);

    return json({ detail, cached: false });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
