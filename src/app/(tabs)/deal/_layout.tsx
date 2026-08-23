import { Stack } from 'expo-router';

export default function DealLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="documents" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
