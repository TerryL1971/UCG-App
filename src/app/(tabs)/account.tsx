import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArrowLeftIcon, ShieldIcon, UserIcon } from '@/components/icons';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';

function Row({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowIcon}>{icon}</View>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowChevron}>
        <ArrowLeftIcon size={16} color={Colors.textFaint} strokeWidth={2.4} />
      </View>
    </Pressable>
  );
}

export default function AccountScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navbar}>
        <Text style={styles.title}>Account</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarPlaceholder}>
          <UserIcon size={22} color={Colors.navy} />
        </View>
        <View>
          <Text style={styles.name}>Jordan Rivera</Text>
          <Text style={styles.email}>jordan.rivera@example.com</Text>
        </View>
      </View>

      <View style={[styles.section, Shadow.card]}>
        <Row icon={<ShieldIcon size={18} color={Colors.navy} />} label="Sell your car back to us" onPress={() => router.push('/sell-back')} />
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
  section: {
    marginHorizontal: Spacing.xl,
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 16,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.navyTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontFamily: Fonts.bodySemibold,
    fontSize: 14.5,
    color: Colors.text,
  },
  rowChevron: {
    transform: [{ rotate: '180deg' }],
  },
});
