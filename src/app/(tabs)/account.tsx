import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MessageIcon, UserIcon, WrenchIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { useChat } from '@/lib/chat-context';
import { resetDemoData } from '@/lib/deals-demo';
import { DEMO_MODE } from '@/lib/demo-mode';
import { useVinScan } from '@/lib/vin-scan-context';

export default function AccountScreen() {
  const { user, logOut } = useAuth();
  const { staffProfile } = useChat();
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
            <Text style={styles.name}>Not logged in</Text>
            <Text style={styles.email}>Log in to see your deal and documents</Text>
          </View>
        )}
      </View>

      {!user && (
        <View style={styles.guestActions}>
          <Button label="Create Account" onPress={() => router.push('/create-account')} />
          <Button label="Log In" variant="secondary" onPress={() => router.push('/log-in')} />
        </View>
      )}

      {/* Only for accounts an admin has added to staff_members — see the
          private_chat migration. Customers never see this row. */}
      {(staffProfile || DEMO_MODE) && (
        <Pressable style={styles.linkRow} onPress={() => router.push('/staff')}>
          <MessageIcon size={18} color={Colors.navy} />
          <View style={{ flex: 1 }}>
            <Text style={styles.linkRowTitle}>{staffProfile ? 'Staff' : 'Staff (demo)'}</Text>
            <Text style={styles.linkRowSub}>Deals, status marks, scans and customer chats</Text>
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

      {DEMO_MODE && (
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
