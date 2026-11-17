import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MapPinIcon, UserIcon, WhatsAppIcon, WrenchIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { baseName } from '@/constants/bases';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { resetDemoData } from '@/lib/deals-demo';
import { DEMO_SWITCH_AVAILABLE, setDemoMode, useDemoMode } from '@/lib/demo-mode';
import { useVinScan } from '@/lib/vin-scan-context';

export default function AccountScreen() {
  const { user, logOut, base, deleteAccount } = useAuth();
  const demo = useDemoMode();
  const { clearLastScannedVin } = useVinScan();

  // Clears what this phone holds (drafts, the remembered deal, a pending
  // VIN scan) and logs out. The deal and its documents live in the UCG
  // account (Supabase), so they're untouched — a real "delete my
  // account" (an App Store requirement) is a separate, server-side job.
  const clearThisPhone = () => {
    Alert.alert(
      'Clear This Phone & Log Out',
      'This logs you out and clears drafts saved on this phone. Your deal and documents stay safe in your UCG account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            AsyncStorage.multiRemove(['ucg.sellBackDraft', 'ucg.selectedDealId']).catch(() => {});
            clearLastScannedVin();
            logOut();
            router.replace('/');
          },
        },
      ],
    );
  };

  // Apple requires in-app account deletion. Asked twice: it can't be undone.
  const confirmDelete = () => {
    Alert.alert(
      'Delete Your Account?',
      'This permanently deletes your UCG app account, your car plans and the documents you added, and logs you out. Your real deal with UCG is not affected. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Are you sure?', 'Your account will be deleted now.', [
              { text: 'Keep My Account', style: 'cancel' },
              {
                text: 'Delete Account',
                style: 'destructive',
                onPress: async () => {
                  const result = await deleteAccount();
                  if (result.error === 'not_deployed') {
                    Alert.alert(
                      'Account deletion isn’t set up yet',
                      'The delete-account function hasn’t been deployed to Supabase yet (see docs/companion-app.md). Nothing was deleted.',
                    );
                    return;
                  }
                  if (result.error === 'staff_account') {
                    Alert.alert('Staff account', 'Staff accounts are removed by an admin, not from the app. Nothing was deleted.');
                    return;
                  }
                  if (result.error) {
                    Alert.alert("Couldn't delete your account", 'Check your connection and try again. Nothing was deleted.');
                    return;
                  }
                  AsyncStorage.multiRemove(['ucg.sellBackDraft', 'ucg.selectedDealId']).catch(() => {});
                  Alert.alert('Account deleted', 'Your account has been deleted.');
                  router.replace('/');
                },
              },
            ]),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navbar}>
        <Text style={styles.title}>Account</Text>
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: Spacing.xl }}>

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
            <Text style={styles.name}>Not logged in</Text>
            <Text style={styles.email}>Log in to see your deal and documents</Text>
          </View>
        )}
      </View>

      <Pressable style={styles.linkRow} onPress={() => router.push('/choose-base')}>
        <MapPinIcon size={18} color={Colors.navy} />
        <View style={{ flex: 1 }}>
          <Text style={styles.linkRowTitle}>{base ? `Stationed at ${baseName(base)}` : 'Where are you stationed?'}</Text>
          <Text style={styles.linkRowSub}>Moved? Change your base so your roadmap follows its rules</Text>
        </View>
        <Text style={styles.linkRowChevron}>›</Text>
      </Pressable>

      {!user && (
        <View style={styles.guestActions}>
          <Button label="Create Account" onPress={() => router.push('/create-account')} />
          <Button label="Log In" variant="secondary" onPress={() => router.push('/log-in')} />
        </View>
      )}

      {user && (
        <Pressable style={styles.linkRow} onPress={() => router.push('/edit-whatsapp')}>
          <WhatsAppIcon size={18} color={Colors.green} />
          <View style={{ flex: 1 }}>
            <Text style={styles.linkRowTitle}>{user.whatsapp ? `WhatsApp +${user.whatsapp}` : 'Add your WhatsApp number'}</Text>
            <Text style={styles.linkRowSub}>How UCG reaches you about your car</Text>
          </View>
          <Text style={styles.linkRowChevron}>›</Text>
        </Pressable>
      )}

      <Pressable style={styles.linkRow} onPress={() => router.push('/service')}>
        <WrenchIcon size={18} color={Colors.navy} />
        <View style={{ flex: 1 }}>
          <Text style={styles.linkRowTitle}>Service Center</Text>
          <Text style={styles.linkRowSub}>Oil changes, repairs, tires — no purchase required</Text>
        </View>
        <Text style={styles.linkRowChevron}>›</Text>
      </Pressable>

      {DEMO_SWITCH_AVAILABLE && (
        <View style={styles.linkRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkRowTitle}>Demo Mode</Text>
            <Text style={styles.linkRowSub}>
              {demo
                ? 'On: sample deals on this phone, for showing the app'
                : 'Off: real deals from UCG, like a real customer'}
            </Text>
          </View>
          <Switch value={demo} onValueChange={setDemoMode} trackColor={{ true: Colors.navy }} />
        </View>
      )}

      {demo && (
        <Pressable
          style={styles.linkRow}
          onPress={() =>
            Alert.alert('Reset Demo Data?', 'Puts the three demo deals back to how they started.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Reset', style: 'destructive', onPress: () => resetDemoData() },
            ])
          }>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkRowTitle}>Reset Demo Data</Text>
            <Text style={styles.linkRowSub}>Demo mode is on: deals are sample data on this phone</Text>
          </View>
          <Text style={styles.linkRowChevron}>›</Text>
        </Pressable>
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
        <Pressable style={styles.resetTestDataButton} onPress={clearThisPhone}>
          <Text style={styles.resetTestData}>Clear This Phone & Log Out</Text>
        </Pressable>
        {user && (
          <Text style={styles.deleteAccount} onPress={confirmDelete}>
            Delete My Account
          </Text>
        )}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  deleteAccount: {
    fontFamily: Fonts.bodySemibold,
    fontSize: 13,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
    textAlign: 'center',
    marginTop: 14,
  },
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
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: Spacing.xl,
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  linkRowTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text },
  linkRowSub: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textMuted, marginTop: 1 },
  linkRowChevron: { fontFamily: Fonts.bodyBold, fontSize: 20, color: Colors.textFaint },
  spacer: { flex: 1 },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  logOut: {
    textAlign: 'center',
    fontFamily: Fonts.bodySemibold,
    fontSize: 14,
    color: Colors.navy,
  },
  resetTestDataButton: {
    marginTop: 14,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetTestData: {
    textAlign: 'center',
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.red,
  },
});
