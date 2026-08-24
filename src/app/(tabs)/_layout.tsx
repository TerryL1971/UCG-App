import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { GridIcon, HeartIcon, MessageIcon, ShieldIcon, UserIcon } from '@/components/icons';
import { Colors, Fonts } from '@/constants/theme';

function TabIcon({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  return <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>{children}</View>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Browse',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <GridIcon size={18} color="#fff" />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <HeartIcon size={18} color="#fff" strokeWidth={2.2} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="deal"
        options={{
          title: 'My Deal',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <MessageIcon size={18} color="#fff" />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="sell-back"
        options={{
          title: 'Sell Back',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <ShieldIcon size={18} color="#fff" strokeWidth={2} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <UserIcon size={18} color="#fff" />
            </TabIcon>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.navy,
    borderTopWidth: 0,
    height: 80,
    paddingTop: 10,
  },
  tabItem: {
    paddingTop: 2,
  },
  tabLabel: {
    fontFamily: Fonts.bodySemibold,
    fontSize: 11,
  },
  iconWrap: {
    width: 38,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: Colors.red,
  },
});
