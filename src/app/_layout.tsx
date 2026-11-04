import {
  Jost_300Light,
  Jost_400Regular,
  Jost_500Medium,
  Jost_600SemiBold,
  useFonts,
} from '@expo-google-fonts/jost';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { colors, fonts } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { DataProvider, useData } from '@/lib/periods';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Jost_300Light, Jost_400Regular, Jost_500Medium, Jost_600SemiBold });
  if (!fontsLoaded) return null;
  return (
    <AuthProvider>
      <DataProvider>
        <RootNavigator />
      </DataProvider>
    </AuthProvider>
  );
}

function RootNavigator() {
  const { session, loading: authLoading } = useAuth();
  const { couple, loading: dataLoading } = useData();

  const signedIn = session !== null;
  const ready = !authLoading && (!signedIn || !dataLoading);
  // While a signed-in user's couple is loading, stay on the current screen instead of flashing onboarding.
  const loaded = signedIn && !dataLoading;

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.rose },
          headerTintColor: colors.oxblood,
          headerTitleStyle: { fontFamily: fonts.medium, color: colors.oxblood, fontSize: 16 },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.rose },
        }}>
        <Stack.Protected guard={loaded && couple !== null}>
          <Stack.Screen name="index" options={{ headerShown: false, title: 'Home' }} />
          <Stack.Screen name="calendar" options={{ title: '' }} />
          <Stack.Screen name="history" options={{ title: '' }} />
          <Stack.Screen name="menu" options={{ title: '' }} />
          <Stack.Screen name="settings" options={{ title: '' }} />
          <Stack.Screen name="log" options={{ presentation: 'modal', title: 'Log period' }} />
        </Stack.Protected>
        <Stack.Protected guard={loaded && couple === null}>
          <Stack.Screen name="onboarding" options={{ title: '' }} />
        </Stack.Protected>
        <Stack.Protected guard={!loaded}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
