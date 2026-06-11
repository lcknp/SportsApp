# SportsApp

Persönliche Fitness-App für Krafttraining, Laufen, Gewicht und Ernährung (Makros) — gebaut mit [Expo](https://expo.dev) (React Native + Expo Router) und [Supabase](https://supabase.com) (Auth + Postgres).

Läuft als iOS-App (via Expo Go) **und** als Web-App im Browser — beide nutzen dieselbe Codebase und dieselbe Supabase-Datenbank.

## Lokal starten

1. Abhängigkeiten installieren:

   ```bash
   npm install
   ```

2. `.env.example` nach `.env` kopieren und die Supabase-Werte eintragen.

3. App starten:

   ```bash
   npx expo start        # iOS via Expo Go (QR-Code scannen)
   npx expo start --web  # im Browser
   ```

## Web-Build & Deployment

Statischen Web-Build erzeugen (Ergebnis liegt in `dist/`):

```bash
npx expo export --platform web
```

Das Deployment läuft über Vercel (Konfiguration in `vercel.json`): Jeder Push auf `main` löst automatisch einen neuen Build und ein Deployment aus. In Vercel müssen die Environment-Variablen `EXPO_PUBLIC_SUPABASE_URL` und `EXPO_PUBLIC_SUPABASE_ANON_KEY` gesetzt sein.

## Projektstruktur

- `src/app/` — Screens (Expo Router, file-based Routing)
- `src/components/` — UI-Komponenten (`.web.tsx`-Varianten für den Browser)
- `src/hooks/` — Daten-Hooks (Supabase-Queries)
- `src/lib/supabase.ts` — Supabase-Client (plattformabhängiger Session-Speicher)
- `supabase/` — SQL-Schema der Datenbank
