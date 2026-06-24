import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { FddbImport } from '@/components/fddb-import';
import { WeightImport } from '@/components/weight-import';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useThemePreference, type ThemePreference } from '@/contexts/theme-context';
import { useProfile } from '@/hooks/use-profile';
import { parseDecimal } from '@/lib/numbers';

type Tab = 'settings' | 'goals';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: '☀️ Hell' },
  { value: 'dark', label: '🌙 Dunkel' },
  { value: 'system', label: '⚙️ System' },
];

export default function ProfileScreen() {
  const { session, signOut, updateEmail, updatePassword } = useAuth();
  const { profile, updateGoals, updateName } = useProfile();
  const { preference, setPreference } = useThemePreference();

  const [tab, setTab] = useState<Tab>('settings');

  const [name, setName] = useState('');
  const [nameMessage, setNameMessage] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);

  const [email, setEmail] = useState('');
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  const [password, setPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [goalsMessage, setGoalsMessage] = useState<string | null>(null);
  const [isSavingGoals, setIsSavingGoals] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? '');
      setCalories(String(profile.daily_calories));
      setProtein(String(profile.daily_protein_g));
      setCarbs(String(profile.daily_carbs_g));
      setFat(String(profile.daily_fat_g));
    }
  }, [profile]);

  useEffect(() => {
    setEmail(session?.user.email ?? '');
  }, [session]);

  async function handleSaveName() {
    setNameMessage(null);
    setIsSavingName(true);
    const error = await updateName(name.trim());
    setIsSavingName(false);
    setNameMessage(error ?? 'Gespeichert.');
  }

  async function handleSaveEmail() {
    setEmailMessage(null);
    setIsSavingEmail(true);
    const error = await updateEmail(email.trim());
    setIsSavingEmail(false);
    setEmailMessage(error ?? 'Bestätigungs-E-Mail wurde verschickt.');
  }

  async function handleSavePassword() {
    if (password.length < 6) {
      setPasswordMessage('Mindestens 6 Zeichen.');
      return;
    }
    setPasswordMessage(null);
    setIsSavingPassword(true);
    const error = await updatePassword(password);
    setIsSavingPassword(false);
    if (!error) {
      setPassword('');
    }
    setPasswordMessage(error ?? 'Passwort geändert.');
  }

  async function handleSaveGoals() {
    setGoalsMessage(null);
    setIsSavingGoals(true);
    const error = await updateGoals({
      daily_calories: parseDecimal(calories),
      daily_protein_g: parseDecimal(protein),
      daily_carbs_g: parseDecimal(carbs),
      daily_fat_g: parseDecimal(fat),
    });
    setIsSavingGoals(false);
    setGoalsMessage(error ?? 'Ziele gespeichert.');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Profil
      </ThemedText>

      <View style={styles.tabRow}>
        <Pressable style={({ pressed }) => pressed && styles.pressed} onPress={() => setTab('settings')}>
          <ThemedView type={tab === 'settings' ? 'backgroundSelected' : 'backgroundElement'} style={styles.tab}>
            <ThemedText type="smallBold">Einstellungen</ThemedText>
          </ThemedView>
        </Pressable>
        <Pressable style={({ pressed }) => pressed && styles.pressed} onPress={() => setTab('goals')}>
          <ThemedView type={tab === 'goals' ? 'backgroundSelected' : 'backgroundElement'} style={styles.tab}>
            <ThemedText type="smallBold">Tagesziele</ThemedText>
          </ThemedView>
        </Pressable>
      </View>

      {tab === 'settings' && (
        <>
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Darstellung</ThemedText>
            <View style={styles.themeRow}>
              {THEME_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={({ pressed }) => [styles.themeOption, pressed && styles.pressed]}
                  onPress={() => setPreference(option.value)}>
                  <ThemedView
                    type={preference === option.value ? 'backgroundSelected' : 'backgroundElement'}
                    style={styles.themeOptionInner}>
                    <ThemedText type="smallBold">{option.label}</ThemedText>
                  </ThemedView>
                </Pressable>
              ))}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              „System" folgt automatisch der Einstellung deines Geräts.
            </ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Name</ThemedText>
            <View style={styles.field}>
              <ThemedTextInput placeholder="Dein Name" value={name} onChangeText={setName} />
            </View>
            {nameMessage && <ThemedText type="small">{nameMessage}</ThemedText>}
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}
              disabled={isSavingName}
              onPress={handleSaveName}>
              <ThemedView type="backgroundSelected" style={styles.buttonInner}>
                <ThemedText type="smallBold">Name speichern</ThemedText>
              </ThemedView>
            </Pressable>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">E-Mail-Adresse</ThemedText>
            <View style={styles.field}>
              <ThemedTextInput
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            {emailMessage && <ThemedText type="small">{emailMessage}</ThemedText>}
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}
              disabled={isSavingEmail}
              onPress={handleSaveEmail}>
              <ThemedView type="backgroundSelected" style={styles.buttonInner}>
                <ThemedText type="smallBold">E-Mail ändern</ThemedText>
              </ThemedView>
            </Pressable>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Passwort</ThemedText>
            <View style={styles.field}>
              <ThemedTextInput
                placeholder="Neues Passwort"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
            {passwordMessage && <ThemedText type="small">{passwordMessage}</ThemedText>}
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}
              disabled={isSavingPassword}
              onPress={handleSavePassword}>
              <ThemedView type="backgroundSelected" style={styles.buttonInner}>
                <ThemedText type="smallBold">Passwort ändern</ThemedText>
              </ThemedView>
            </Pressable>
          </ThemedView>

          <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={signOut}>
            <ThemedView type="backgroundElement" style={styles.buttonInner}>
              <ThemedText type="smallBold">Abmelden</ThemedText>
            </ThemedView>
          </Pressable>
        </>
      )}

      {tab === 'goals' && (
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Tagesziele</ThemedText>

          <View style={styles.field}>
            <ThemedText type="small">Kalorien (kcal)</ThemedText>
            <ThemedTextInput keyboardType="decimal-pad" value={calories} onChangeText={setCalories} />
          </View>

          <View style={styles.field}>
            <ThemedText type="small">Protein (g)</ThemedText>
            <ThemedTextInput keyboardType="decimal-pad" value={protein} onChangeText={setProtein} />
          </View>

          <View style={styles.field}>
            <ThemedText type="small">Kohlenhydrate (g)</ThemedText>
            <ThemedTextInput keyboardType="decimal-pad" value={carbs} onChangeText={setCarbs} />
          </View>

          <View style={styles.field}>
            <ThemedText type="small">Fett (g)</ThemedText>
            <ThemedTextInput keyboardType="decimal-pad" value={fat} onChangeText={setFat} />
          </View>

          {goalsMessage && <ThemedText type="small">{goalsMessage}</ThemedText>}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            disabled={isSavingGoals}
            onPress={handleSaveGoals}>
            <ThemedView type="backgroundSelected" style={styles.buttonInner}>
              <ThemedText type="smallBold">Ziele speichern</ThemedText>
            </ThemedView>
          </Pressable>
        </ThemedView>
      )}

      {tab === 'goals' && <FddbImport />}

      {tab === 'goals' && <WeightImport />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  title: {
    marginBottom: Spacing.one,
  },
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tab: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  themeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  themeOption: {
    flex: 1,
    borderRadius: Spacing.two,
  },
  themeOptionInner: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  field: {
    gap: Spacing.one,
  },
  button: {
    borderRadius: Spacing.two,
  },
  buttonInner: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
