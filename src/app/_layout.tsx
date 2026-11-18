import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppStateProvider } from '../lib/store';

export default function RootLayout() {
  return (
    <AppStateProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerTintColor: '#6b3fd4', contentStyle: { backgroundColor: '#f6f1ff' } }}>
        <Stack.Screen name="index" options={{ title: 'I wish' }} />
        <Stack.Screen name="wishlist" options={{ title: 'Önskelista' }} />
        <Stack.Screen name="parent" options={{ title: 'För föräldrar' }} />
      </Stack>
    </AppStateProvider>
  );
}
