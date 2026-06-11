import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';

type Tab = 'settings' | 'goals';

export default function ProfileScreen() {
  const theme = useTheme();
  const { session, signOut, updateEmail, updatePassword } = useAuth();
  const { profile, updateGoals, updateName } = useProfile();

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
      daily_calories: Number(calories) || 0,
      daily_protein_g: Number(protein) || 0,
      daily_carbs_g: Number(carbs) || 0,
      daily_fat_g: Number(fat) || 0,
    });
    setIsSavingGoals(false);
    setGoalsMessage(error ?? 'Ziele gespeichert.');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Profil
      </ThemedText>

      <ThemedView style={styles.tabRow}>
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
      </ThemedView>

      {tab === 'settings' && (
        <>
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Name</ThemedText>
            <ThemedView style={styles.field}>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder="Dein Name"
                placeholderTextColor={theme.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </ThemedView>
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
            <ThemedView style={styles.field}>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </ThemedView>
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
            <ThemedView style={styles.field}>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder="Neues Passwort"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </ThemedView>
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

          <ThemedView style={styles.field}>
            <ThemedText type="small">Kalorien (kcal)</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
              keyboardType="numeric"
              value={calories}
              onChangeText={setCalories}
            />
          </ThemedView>

          <ThemedView style={styles.field}>
            <ThemedText type="small">Protein (g)</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
              keyboardType="numeric"
              value={protein}
              onChangeText={setProtein}
            />
          </ThemedView>

          <ThemedView style={styles.field}>
            <ThemedText type="small">Kohlenhydrate (g)</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
              keyboardType="numeric"
              value={carbs}
              onChangeText={setCarbs}
            />
          </ThemedView>

          <ThemedView style={styles.field}>
            <ThemedText type="small">Fett (g)</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
              keyboardType="numeric"
              value={fat}
              onChangeText={setFat}
            />
          </ThemedView>

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
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
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
