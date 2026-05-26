import React, { useCallback } from 'react';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Alert, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShortlist } from '../context/ShortlistContext';
import { colors } from '../theme';

import SplashScreen from '../screens/SplashScreen';
import WizardScreen from '../screens/WizardScreen';
import CardSwipeScreen from '../screens/CardSwipeScreen';
import MapScreen from '../screens/map/MapScreen';
import CafeDetailScreen from '../screens/CafeDetailScreen';
import ShortlistModal from '../screens/ShortlistModal';
import AuthModal from '../screens/AuthModal';
import ProfileScreen from '../screens/ProfileScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import BookmarksScreen from '../screens/BookmarksScreen';
import TrendingScreen from '../screens/TrendingScreen';
import ReviewsScreen from '../screens/ReviewsScreen';
import WriteReviewScreen from '../screens/WriteReviewScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import GlobalLeaderboardScreen from '../screens/GlobalLeaderboardScreen';
import FriendsScreen from '../screens/FriendsScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import RecapScreen from '../screens/RecapScreen';
import EditProfileModal from '../screens/EditProfileModal';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  // Match web BottomTabBar — 5 tabs: Explore (map), Discover (swipe),
  // Trending (rank), Shortlist (★), Profile (avatar).
  const icons: Record<string, string> = {
    Explore: '🗺️',
    Discover: '🃏',
    Trending: '🔥',
    Shortlist: '★',
    Profile: '👤',
  };

  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>
        {icons[label] || '•'}
      </Text>
    </View>
  );
}

function MainTabs() {
  const { shortlist } = useShortlist();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert(
          'Keluar Aplikasi?',
          'Yakin mau keluar dari CafeMatch?',
          [
            { text: 'Batal', style: 'cancel' },
            { text: 'Keluar', style: 'destructive', onPress: () => BackHandler.exitApp() },
          ],
        );
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, []),
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
          },
        ],
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Explore" component={MapScreen} />
      <Tab.Screen name="Discover" component={CardSwipeScreen} />
      <Tab.Screen name="Trending" component={TrendingScreen} />
      <Tab.Screen
        name="Shortlist"
        component={ShortlistModal}
        options={{
          tabBarBadge: shortlist.length > 0 ? shortlist.length : undefined,
          tabBarBadgeStyle: styles.badge,
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Splash"
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Wizard" component={WizardScreen} />
      <Stack.Screen name="CardSwipe" component={CardSwipeScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="CafeDetail" component={CafeDetailScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="Bookmarks" component={BookmarksScreen} />
      <Stack.Screen
        name="ShortlistModal"
        component={ShortlistModal}
        options={{
          ...TransitionPresets.ModalPresentationIOS,
          cardOverlayEnabled: true,
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="AuthModal"
        component={AuthModal}
        options={{
          ...TransitionPresets.ModalPresentationIOS,
          cardOverlayEnabled: true,
          gestureEnabled: true,
          presentation: 'transparentModal',
        }}
      />
      {/* Social feature screens */}
      <Stack.Screen name="Reviews" component={ReviewsScreen} />
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Stack.Screen name="GlobalLeaderboard" component={GlobalLeaderboardScreen} />
      <Stack.Screen name="Friends" component={FriendsScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen
        name="Recap"
        component={RecapScreen}
        options={{ ...TransitionPresets.ModalPresentationIOS }}
      />
      <Stack.Screen
        name="EditProfileModal"
        component={EditProfileModal}
        options={{
          ...TransitionPresets.ModalPresentationIOS,
          cardOverlayEnabled: true,
          gestureEnabled: true,
          presentation: 'transparentModal',
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.surface,
    height: 80,
    paddingBottom: 20,
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  tabIcon: { alignItems: 'center' },
  tabEmoji: { fontSize: 22, opacity: 0.5 },
  tabEmojiActive: { opacity: 1 },
  badge: {
    backgroundColor: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
});
