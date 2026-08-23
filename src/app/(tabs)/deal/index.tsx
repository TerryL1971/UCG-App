import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MessageIcon } from '@/components/icons';
import { SalespersonAvatarMini } from '@/components/salesperson-avatar';
import { DashedLine, FlowLine, SolidLine, TimelineDot } from '@/components/timeline-dot';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { dealSteps, salesperson } from '@/constants/mock-data';
import { useDeal } from '@/lib/deal-context';

const ROW_HEIGHT = 80;
const CURRENT_ROW_HEIGHT = 132;
const LAST_ROW_HEIGHT = 50;

export default function TimelineScreen() {
  const { car } = useDeal();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navbar}>
        <Text style={styles.title}>Your Journey</Text>
      </View>

      <View style={[styles.pinnedBar, Shadow.card]}>
        <SalespersonAvatarMini size={34} />
        <View style={{ flex: 1 }}>
          <Text style={styles.pinnedName}>{salesperson.name.split(' ')[0]} is helping you</Text>
          <Text style={styles.pinnedMeta}>
            {car ? `${car.year} ${car.title} · $${car.price.toLocaleString()}` : 'No car selected yet'}
          </Text>
        </View>
        <Pressable hitSlop={8} onPress={() => Linking.openURL(salesperson.phone.replace('tel:', 'sms:'))}>
          <MessageIcon />
        </Pressable>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {dealSteps.map((step, i) => {
          const isLast = i === dealSteps.length - 1;
          const rowHeight = step.status === 'current' ? CURRENT_ROW_HEIGHT : isLast ? LAST_ROW_HEIGHT : ROW_HEIGHT;
          const lineHeight = rowHeight - 34;

          return (
            <View key={step.id} style={{ flexDirection: 'row', gap: 16, minHeight: rowHeight }}>
              <View style={{ width: 34, alignItems: 'center' }}>
                <TimelineDot status={step.status} isLast={isLast} />
                {!isLast && step.status === 'done' && <SolidLine height={lineHeight} />}
                {!isLast && step.status === 'current' && <FlowLine height={lineHeight} />}
                {!isLast && step.status === 'upcoming' && <DashedLine height={lineHeight} />}
              </View>

              <View style={{ flex: 1, paddingTop: 2 }}>
                <Text style={[styles.stepTitle, step.status === 'current' && styles.stepTitleCurrent, step.status === 'upcoming' && styles.stepTitleUpcoming]}>
                  {step.title}
                </Text>
                {step.detail ? <Text style={styles.stepDetail}>{step.detail}</Text> : null}

                {step.status === 'current' && (
                  <Pressable style={styles.miniChip} onPress={() => router.push('/(tabs)/deal/documents')}>
                    <SalespersonAvatarMini size={24} />
                    <Text style={styles.miniChipText}>
                      {salesperson.name.split(' ')[0]} is reviewing your documents
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
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
  pinnedBar: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pinnedName: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.text },
  pinnedMeta: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textMuted, marginTop: 1 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxl },
  stepTitle: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.text },
  stepTitleCurrent: { color: Colors.red },
  stepTitleUpcoming: { color: Colors.textFaint },
  stepDetail: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, marginTop: 2 },
  miniChip: {
    marginTop: 10,
    backgroundColor: Colors.redTint,
    borderRadius: Radius.md,
    paddingVertical: 9,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    maxWidth: 220,
  },
  miniChipText: { flex: 1, fontFamily: Fonts.bodySemibold, fontSize: 11.5, color: Colors.navy, lineHeight: 15 },
});
