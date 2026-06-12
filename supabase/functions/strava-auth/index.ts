// Supabase Edge Function: tauscht den Strava-OAuth-Code gegen Tokens und
// speichert sie in strava_accounts. Das Client-Secret bleibt serverseitig.
//
// Benötigte Secrets (Dashboard → Edge Functions → Secrets):
//   STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET
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

    const { code } = await req.json();
    if (!code) {
      return json({ error: 'OAuth-Code fehlt' }, 400);
    }

    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: Deno.env.get('STRAVA_CLIENT_ID'),
        client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
        code,
        grant_type: 'authorization_code',
      }),
    });
    const token = await tokenResponse.json();
    if (!token.access_token) {
      return json({ error: 'Strava-Login fehlgeschlagen: ' + JSON.stringify(token) }, 400);
    }

    const { error } = await supabase.from('strava_accounts').upsert({
      user_id: user.id,
      athlete_id: token.athlete?.id ?? null,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: token.expires_at,
    });
    if (error) {
      return json({ error: error.message }, 500);
    }

    return json({
      ok: true,
      athlete: token.athlete ? `${token.athlete.firstname ?? ''} ${token.athlete.lastname ?? ''}`.trim() : null,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
