import { Tabs, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { getRainbowGradient, getButtonGradientStops } from '../../constants/theme';
import { View, Platform } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';

// Visible tabs in order for swipe navigation
const VISIBLE_TABS = ['index', 'audiobooks', 'search', 'profile', 'settings'];

// Gradient tab icon component with rainbow effect for active state
function GradientTabIcon({ name, size, color, focused }: { name: any; size: number; color: string; focused: boolean }) {
  const { colors } = useTheme();
  
  // Use Ionicons on mobile
  if (Platform.OS !== 'web') {
    return <Ionicons name={name} size={size} color={color} />;
  }
  
  // Web: Use same SVG paths for both active and inactive, just different colors
  const gradientId = `tab-icon-gradient-${name}`;
  const iconPaths = getIconPaths(name);
  const gradientStops = getButtonGradientStops(colors);

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          {gradientStops.map((stop, i) => (
            <stop key={i} offset={stop.offset} stopColor={stop.color} />
          ))}
        </linearGradient>
      </defs>
      <g fill={focused ? `url(#${gradientId})` : color}>
        {iconPaths.map((d, i) => <path key={i} d={d} />)}
      </g>
    </svg>
  );
}

// SVG path data for Ionicons (matching actual Ionicons shapes)
function getIconPaths(name: string): string[] {
  const paths: Record<string, string[]> = {
    // Open book icon - symmetrical spread
    'book': ['M3 6c0-.83.67-1.5 1.5-1.5L12 7l7.5-2.5c.83 0 1.5.67 1.5 1.5v12c0 .83-.67 1.5-1.5 1.5L12 21l-7.5-2c-.83-.33-1.5-1-1.5-1.5V6zm2 0v10l6.5 1.5V8L5 6zm12 0l-6.5 2v8L19 16V6z'],
    'headset': ['M12 1a9 9 0 0 0-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7a9 9 0 0 0-9-9z'],
    'search': ['M21.71 20.29L18 16.61A9 9 0 1 0 16.61 18l3.68 3.68a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.39zM11 18a7 7 0 1 1 7-7 7 7 0 0 1-7 7z'],
    'person-circle': ['M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'],
    // Settings gear - cleaner cog design
    'settings': ['M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L3.16 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.04.64.09.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z'],
  };
  return paths[name] || [];
}

// Custom translucent tab bar background for web
function TranslucentTabBarBackground() {
  const { colors } = useTheme();
  if (Platform.OS === 'web') {
    return (
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.surface + 'E6',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      />
    );
  }
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.surface + 'DD',
      }}
    />
  );
}

function SwipeableTabs({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const translateX = useSharedValue(0);

  if (Platform.OS !== 'web') {
    // On mobile, use gesture handler
    const gesture = Gesture.Pan()
      .onBegin(() => {
        translateX.value = 0;
      })
      .onUpdate((e) => {
        translateX.value = e.translationX;
      })
      .onEnd((e) => {
        const SWIPE_THRESHOLD = 50;
        const velocity = e.velocityX;
        const translation = e.translationX;

        // Get current tab from pathname - only for visible tabs, ignore nested routes
        const pathParts = pathname?.split('/').filter(Boolean) || [];
        const currentTab = pathParts[1] || 'index';
        const currentIndex = VISIBLE_TABS.indexOf(currentTab);

        // Only handle swipe for visible tabs, ignore nested routes like series/[id]
        if (currentIndex === -1) return;

        // Swipe left (negative translation) -> go to next tab (right)
        if (translation < -SWIPE_THRESHOLD || velocity < -500) {
          const nextIndex = currentIndex + 1;
          if (nextIndex < VISIBLE_TABS.length) {
            router.push(`/(tabs)/${VISIBLE_TABS[nextIndex]}` as any);
          }
        }
        // Swipe right (positive translation) -> go to previous tab (left)
        else if (translation > SWIPE_THRESHOLD || velocity > 500) {
          const prevIndex = currentIndex - 1;
          if (prevIndex >= 0) {
            router.push(`/(tabs)/${VISIBLE_TABS[prevIndex]}` as any);
          }
        }
      });

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={gesture}>
          <View style={{ flex: 1 }}>{children}</View>
        </GestureDetector>
      </GestureHandlerRootView>
    );
  }

  // On web, return children directly (swipe not supported as well)
  return <>{children}</>;
}

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <SwipeableTabs>
      <Tabs
      screenOptions={{
        headerShown: false,
        sceneContainerStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: 58,
          paddingBottom: 8,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          elevation: 0,
        },
        tabBarBackground: () => <TranslucentTabBarBackground />,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        // Slide animation between tabs like turning pages
        animation: 'shift',
        animationDuration: 300,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'EBooks',
          tabBarIcon: ({ color, size, focused }) => (
            <GradientTabIcon name="book" size={size} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="audiobooks"
        options={{
          title: 'Audiobooks',
          tabBarIcon: ({ color, size, focused }) => (
            <GradientTabIcon name="headset" size={size} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size, focused }) => (
            <GradientTabIcon name="search" size={size} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <GradientTabIcon name="person-circle" size={size} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size, focused }) => (
            <GradientTabIcon name="settings" size={size} color={color} focused={focused} />
          ),
        }}
      />
      {/* Hidden tabs — group routes registered by folder name only */}
      <Tabs.Screen name="ebooks" options={{ href: null }} />
      <Tabs.Screen name="libraries" options={{ href: null }} />
      <Tabs.Screen name="collections" options={{ href: null }} />
      <Tabs.Screen name="browse" options={{ href: null }} />
      <Tabs.Screen name="audiobook" options={{ href: null }} />
      <Tabs.Screen name="series" options={{ href: null }} />
    </Tabs>
    </SwipeableTabs>
  );
}
