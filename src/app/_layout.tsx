import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { ProductFetcher } from '../components/ProductFetcher';
import { AppStateProvider } from '../lib/store';

export default function RootLayout() {
  return (
    <AppStateProvider>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
        <ProductFetcher />
        <Stack screenOptions={{ headerTintColor: '#6b3fd4', contentStyle: { backgroundColor: '#f6f1ff' } }}>
          <Stack.Screen name="index" options={{ title: 'I wish' }} />
          <Stack.Screen name="wishlist" options={{ title: 'Önskelista' }} />
          <Stack.Screen name="parent" options={{ title: 'För föräldrar' }} />
        </Stack>
      </View>
    </AppStateProvider>
  );
}
