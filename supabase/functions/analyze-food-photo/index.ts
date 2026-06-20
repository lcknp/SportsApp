// Supabase Edge Function: schätzt Makros aus einem Essens-Foto via Google
// Gemini Vision. Das Foto wird nicht gespeichert, nur zur Schätzung verwendet.
//
// Benötigtes Secret (Dashboard → Edge Functions → Secrets): GEMINI_API_KEY
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_MODEL = 'gemini-2.5-flash';

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

    const { image, mimeType } = await req.json();
    if (!image || !mimeType) {
      return json({ error: 'Foto fehlt' }, 400);
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return json({ error: 'GEMINI_API_KEY ist nicht konfiguriert' }, 500);
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    'Schätze die Nährwerte der abgebildeten Mahlzeit oder des Lebensmittels anhand der ' +
                    'geschätzten Portionsgröße. Antworte ausschließlich mit den angeforderten Werten, ' +
                    'ohne zusätzlichen Text.',
                },
                { inline_data: { mime_type: mimeType, data: image } },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                calories_kcal: { type: 'number' },
                protein_g: { type: 'number' },
                carbs_g: { type: 'number' },
                fat_g: { type: 'number' },
                confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
              },
              required: ['description', 'calories_kcal', 'protein_g', 'carbs_g', 'fat_g', 'confidence'],
            },
          },
        }),
      },
    );

    const result = await geminiResponse.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return json({ error: 'Schätzung fehlgeschlagen: ' + JSON.stringify(result) }, 502);
    }

    return json(JSON.parse(text));
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
