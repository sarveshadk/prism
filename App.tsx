import { type BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bootloader } from './src/Bootloader';
import { Icon, type IconName } from './src/icon';
import Bench from './src/screens/Bench';
import Docs from './src/screens/Docs';
import Home from './src/screens/Home';
import Receive from './src/screens/Receive';
import Send from './src/screens/Send';
import Settings from './src/screens/Settings';
import { TAB_BAR_HEIGHT, useTheme } from './src/theme';

const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="HomeScreen" component={Home} />
      <Stack.Screen name="Send" component={Send} />
      <Stack.Screen name="Receive" component={Receive} />
      <Stack.Screen name="Bench" component={Bench} />
      <Stack.Screen name="Docs" component={Docs} />
      <Stack.Screen name="Settings" component={Settings} />
    </Stack.Navigator>
  );
}

const TABS: { name: string; label: string; icon: IconName; component: React.ComponentType<any> }[] = [
  { name: 'HomeTab', label: 'Home', icon: 'home', component: HomeStack },
  { name: 'DocsTab', label: 'Docs', icon: 'docs', component: Docs },
  { name: 'BenchTab', label: 'Bench', icon: 'bench', component: Bench },
  { name: 'SettingsTab', label: 'Settings', icon: 'settings', component: Settings },
];

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);
  const barHeight = 60 + bottomInset;

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: barHeight,
        paddingBottom: bottomInset,
        paddingTop: 8,
        backgroundColor: c.bg,
        borderTopWidth: 1,
        borderTopColor: c.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        elevation: 0,
      }}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const tab = TABS[index];
        const color = isFocused ? c.coral : c.textMuted;

        const onPress = () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={tab.label}
            onPress={onPress}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 2,
            }}
          >
            <View style={{ alignItems: 'center', justifyContent: 'center', gap: 3 }}>
              <Icon name={tab.icon} size={20} color={color} />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: isFocused ? '600' : '400',
                  color,
                  letterSpacing: 0.1,
                }}
              >
                {tab.label}
              </Text>
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: isFocused ? c.coral : 'transparent',
                  marginTop: 1,
                }}
              />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function App() {
  const c = useTheme();
  const base = c.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const [booted, setBooted] = useState(false);

  return (
    <SafeAreaProvider>
      <StatusBar style={c.scheme === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer
        theme={{
          ...base,
          colors: {
            ...base.colors,
            background: c.bg,
            card: c.surface,
            border: c.border,
            text: c.text,
            primary: c.coral,
          },
        }}
      >
        <Tabs.Navigator
          tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            animation: 'fade',
          }}
        >
          {TABS.map(({ name, component }) => (
            <Tabs.Screen key={name} name={name} component={component} />
          ))}
        </Tabs.Navigator>
      </NavigationContainer>

      {/* Bootloader overlay — renders on top of everything, dismisses after animation */}
      {!booted && <Bootloader onFinish={() => setBooted(true)} />}
    </SafeAreaProvider>
  );
}
