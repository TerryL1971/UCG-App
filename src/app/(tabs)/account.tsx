import { router } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UserIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { useDeal } from '@/lib/deal-context';
import { useDealIntake } from '@/lib/deal-intake-context';
import { useDealSteps } from '@/lib/deal-steps-context';
import { useSaved } from '@/lib/saved-context';
import { useVinScan } from '@/lib/vin-scan-context';

export default function AccountScreen() {
  const { user, logOut } = useAuth();
  const { clearCar } = useDeal();
  const { clearIntake } = useDealIntake();
  const { resetDealSteps } = useDealSteps();
  const { clearSaved } = useSaved();
  const { clearLastScannedVin } = useVinScan();

  // Wipes everything this app holds about you — account, chosen car,
  // deal-intake submission, My Deal timeline progress, saved cars, any
  // pending VIN scan — and starts over from onboarding. Meant for testing
  // (there's no real backend yet, so this IS the complete deletion, not a
  // partial one), but the same underlying idea (a real, complete,
  // self-service delete) is what Apple will require once real backend
  // accounts exist — see docs/backend-and-ai-agent-plan.md.
  const resetTestData = () => {
    Alert.alert('Reset Test Data', 'This clears your account, chosen car, saved cars, and everything you’ve entered. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          clearIntake();
          clearCar();
          resetDealSteps();
          clearSaved();
          clearLastScannedVin();
          logOut();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navbar}>
        <Text style={styles.title}>Account</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarPlaceholder}>
          <UserIcon size={22} color={Colors.navy} />
        </View>
        {user ? (
          <View>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Browsing as Guest</Text>
            <Text style={styles.email}>Create an account to save your progress</Text>
          </View>
        )}
      </View>

      {!user && (
        <View style={styles.guestActions}>
          <Button label="Create Account" onPress={() => router.push('/create-account')} />
          <Button label="Log In" variant="secondary" onPress={() => router.push('/log-in')} />
        </View>
      )}

      <View style={styles.spacer} />

      <View style={styles.footer}>
        {user && (
          <Text
            style={styles.logOut}
            onPress={() => {
              logOut();
              router.replace('/');
            }}>
            Log Out
          </Text>
        )}
        <Text style={styles.resetTestData} onPress={resetTestData}>
          Reset Test Data
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  navbar: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontFamily: Fonts.display, fontSize: 20, color: Colors.text },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: Spacing.xl,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.navyTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.text },
  email: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  guestActions: {
    paddingHorizontal: Spacing.xl,
    gap: 10,
  },
  spacer: { flex: 1 },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  logOut: {
    textAlign: 'center',
    fontFamily: Fonts.bodySemibold,
    fontSize: 14,
    color: Colors.red,
  },
  resetTestData: {
    textAlign: 'center',
    fontFamily: Fonts.bodySemibold,
    fontSize: 12.5,
    color: Colors.textMuted,
    marginTop: 12,
  },
});
