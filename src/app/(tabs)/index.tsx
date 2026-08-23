import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CarCard } from '@/components/car-card';
import { FilterIcon, SearchIcon } from '@/components/icons';
import { FilterChip } from '@/components/ui/chip';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { cars } from '@/constants/mock-data';

const icon = require('@/assets/brand/ucg-icon.png');
const filters = ['All', 'SUV', 'Sedan', 'Under $20k'];

export default function BrowseScreen() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [query, setQuery] = useState('');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navbar}>
        <View style={styles.navbarLeft}>
          <Image source={icon} style={styles.icon} contentFit="contain" />
          <Text style={styles.title}>Browse Inventory</Text>
        </View>
        <Pressable style={styles.iconButton} hitSlop={4}>
          <FilterIcon />
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <SearchIcon />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search make, model, or type"
          placeholderTextColor={Colors.textFaint}
          style={styles.searchInput}
        />
      </View>

      <FlatList
        horizontal
        data={filters}
        keyExtractor={(f) => f}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <FilterChip label={item} active={item === activeFilter} onPress={() => setActiveFilter(item)} />
        )}
      />

      <FlatList
        data={cars}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.lg }} />}
        renderItem={({ item }) => <CarCard car={item} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  navbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    width: 26,
    height: 22,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.text,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.navyTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    height: 48,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14.5,
    color: Colors.text,
  },
  filterRow: {
    gap: 10,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  list: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
});
