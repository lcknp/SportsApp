# Anweisung an Claude Code: Bestehende Expo-App zusätzlich als Web-App lauffähig machen

## Kontext

Wir haben eine funktionierende React-Native-App mit Expo (Expo Router) und Supabase als Backend (Auth + Postgres). Screens existieren bereits: Dashboard, Krafttraining, Laufen, Gewicht, Ernährung/Makros. Alles funktioniert auf dem iPhone via Expo Go.

Ziel: Dieselbe Codebase soll **zusätzlich im Browser als Web-App** laufen, damit ich sie ohne Apple Developer Account per Link teilen kann. Es soll **kein Neuaufbau in React.js** werden — nutze Expos eingebaute Web-Unterstützung (react-native-web), damit der bestehende Code wiederverwendet wird.

Wichtig: Arbeite **Phase für Phase**. Mach nicht alles auf einmal. Nach jeder Phase kurz zusammenfassen, was geändert wurde, und auf mein OK warten, bevor es weitergeht.

---

## Phase A — Web-Support aktivieren

1. Installiere die nötigen Web-Pakete über Expo (damit die Versionen zur Expo-SDK passen):
   ```
   npx expo install react-dom react-native-web @expo/metro-runtime
   ```
2. Stelle sicher, dass in `app.json` / `app.config.js` unter `web` der Bundler `"metro"` gesetzt ist.
3. Starte die App im Browser:
   ```
   npx expo start --web
   ```
4. Prüfe, ob die App im Browser startet und der Login-Screen erscheint. Liste mir auf, welche Fehler oder Warnungen in der Browser-Konsole auftauchen.

**Stopp nach Phase A. Zusammenfassung + Fehlerliste an mich.**

---

## Phase B — Supabase-Session auf Web fixen (kritisch)

Auf dem iPhone speichert der Supabase-Client die Login-Session über AsyncStorage. Im Browser gibt es das nicht — dort muss localStorage genutzt werden, sonst bin ich nach jedem Reload ausgeloggt.

1. Finde die Datei, in der der Supabase-Client erstellt wird (vermutlich `lib/supabase.ts` o.ä.).
2. Mache den Storage-Adapter plattform-abhängig: Auf `Platform.OS === 'web'` soll der Client den Standard-Browser-Storage (localStorage) verwenden, auf nativen Plattformen weiterhin AsyncStorage.
3. Achte darauf, dass `detectSessionInUrl` auf Web korrekt gesetzt ist (für E-Mail-/Magic-Link-Flows).
4. Teste: Im Browser einloggen, Seite neu laden — ich soll eingeloggt bleiben.

**Stopp nach Phase B. Zusammenfassung an mich.**

---

## Phase C — Web-inkompatible Komponenten abfangen

Manche nativen Funktionen laufen im Browser nicht oder anders. Geh die App durch und sichere alles ab, das auf Web crasht:

1. **Kamera / Barcode-Scanner (expo-camera):** Auf Web entweder deaktivieren oder durch eine einfache Alternative ersetzen (z.B. manuelle Eingabe des Lebensmittels). Nutze `Platform.OS`-Abfragen, damit der native Code nur auf iOS/Android läuft und im Browser ein Fallback erscheint statt eines Absturzes.
2. **Haptics, native Gesten, sonstige native-only Module:** Mit `Platform.OS`-Guards umschließen, damit sie auf Web stillschweigend übersprungen werden.
3. Gib mir am Ende eine Liste, welche Features auf Web eingeschränkt sind und wie du sie abgefangen hast.

**Stopp nach Phase C. Feature-Liste an mich.**

---

## Phase D — Responsives Layout für den Browser

Die App ist für Handy-Bildschirme gebaut. Im Browser auf dem Desktop wird sonst alles in die Breite gezogen.

1. Lege einen zentrierten Container mit max. Breite (ca. 480–600px) um den App-Inhalt, sodass es im Browser wie eine Handy-breite App in der Bildschirmmitte aussieht.
2. Prüfe die wichtigsten Screens (Dashboard, Training, Laufen, Ernährung) im Browser auf Layout-Fehler und korrigiere offensichtliche Brüche.
3. Stelle sicher, dass Scrollen und die Tab-Navigation im Browser funktionieren.

**Stopp nach Phase D. Zusammenfassung an mich.**

---

## Phase E — Web-Build erzeugen

1. Erzeuge den statischen Web-Build:
   ```
   npx expo export --platform web
   ```
2. Das Ergebnis liegt im Ordner `dist/`. Prüfe, dass der Build ohne Fehler durchläuft.
3. Teste den Build lokal (z.B. mit `npx serve dist`) und bestätige, dass Login + Datenladen funktionieren.

**Stopp nach Phase E. Zusammenfassung an mich.**

---

## Phase F — Deployment auf Vercel (kostenlos)

1. Erkläre mir die Schritte, um das GitHub-Repo mit Vercel zu verbinden (ich mache die Klicks auf vercel.com selbst).
2. Lege die nötige Vercel-Konfiguration im Projekt an, damit Expo-Router-Routing als Single-Page-App korrekt funktioniert (Rewrites auf `index.html`).
3. Sag mir genau, welche Environment-Variablen ich in Vercel eintragen muss:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
4. Erkläre, wie ich nach jedem Git-Push automatisch ein neues Deployment bekomme.

**Stopp nach Phase F. Zusammenfassung an mich.**

---

## Wichtige Hinweise / Constraints

- **Den bestehenden iOS-Code nicht kaputt machen.** Die App muss weiterhin parallel auf dem iPhone via Expo Go laufen. Alle Web-Anpassungen über `Platform.OS`-Abfragen lösen, nichts hart ersetzen.
- **Keine Secrets in den Code.** Der Anon-Key bleibt in der `.env` / in den Vercel-Env-Variablen. Der Anthropic-API-Key bleibt ausschließlich serverseitig in der Supabase Edge Function.
- **Datenbank bleibt dieselbe.** Web-App und iOS-App nutzen dasselbe Supabase-Projekt, dieselben Accounts, dieselben Tabellen.
- Halte die Änderungen kompakt und nachvollziehbar. Nach jeder Phase will ich kurz wissen, welche Dateien du angefasst hast.
```
