import React from 'react';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { useShortlist } from '../context/ShortlistContext';
import { colors } from '../theme';

import SplashScreen from '../screens/SplashScreen';
import WizardScreen from '../screens/WizardScreen';
import CardSwipeScreen from '../screens/CardSwipeScreen';
import MapScreen from '../screens/MapScreen';
import CafeDetailScreen from '../screens/CafeDetailScreen';
import ShortlistModal from '../screens/ShortlistModal';
import AuthModal from '../screens/AuthModal';
import ProfileScreen from '../screens/ProfileScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import BookmarksScreen from '../screens/BookmarksScreen';
import TrendingScreen from '../screens/TrendingScreen';
import OwnerDashboardScreen from '../screens/owner/OwnerDashboardScreen';
import OwnerLoginScreen from '../screens/owner/OwnerLoginScreen';
import OwnerRegisterScreen from '../screens/owner/OwnerRegisterScreen';
import PromotionDetailScreen from '../screens/owner/PromotionDetailScreen';
import ReviewsScreen from '../screens/ReviewsScreen';
import WriteReviewScreen from '../screens/WriteReviewScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import FriendsScreen from '../screens/FriendsScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import RecapScreen from '../screens/RecapScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const OwnerStack = createStackNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Discover: '🗺️',
    Explore: '🔥',
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

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Discover" component={MapScreen} />
      <Tab.Screen name="Explore" component={TrendingScreen} />
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

// Owner navigation — single screen hosts its own tab bar
function OwnerNavigator() {
  return (
    <OwnerStack.Navigator screenOptions={{ headerShown: false }}>
      <OwnerStack.Screen name="OwnerHome" component={OwnerDashboardScreen} />
    </OwnerStack.Navigator>
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
      {/* Owner auth */}
      <Stack.Screen name="OwnerLogin" component={OwnerLoginScreen} />
      <Stack.Screen name="OwnerRegister" component={OwnerRegisterScreen} />
      {/* Owner portal */}
      <Stack.Screen
        name="OwnerDashboard"
        component={OwnerNavigator}
        options={{ ...TransitionPresets.SlideFromRightIOS }}
      />
      <Stack.Screen
        name="PromotionDetail"
        component={PromotionDetailScreen}
        options={{ ...TransitionPresets.SlideFromRightIOS }}
      />
      {/* Social feature screens */}
      <Stack.Screen name="Reviews" component={ReviewsScreen} />
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Stack.Screen name="Friends" component={FriendsScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen
        name="Recap"
        component={RecapScreen}
        options={{ ...TransitionPresets.ModalPresentationIOS }}
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
