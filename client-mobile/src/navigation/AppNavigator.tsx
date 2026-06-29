import React, { useCallback } from 'react';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Alert, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flame, Map, Sparkles, Star, User } from 'lucide-react-native';
import { useShortlist } from '../context/ShortlistContext';
import { colors } from '../theme';

import SplashScreen from '../screens/SplashScreen';
import WizardScreen from '../screens/WizardScreen';
import CardSwipeScreen from '../screens/CardSwipeScreen';
import MapScreen from '../screens/map/MapScreen';
import CafeDetailScreen from '../screens/CafeDetailScreen';
import SearchScreen from '../screens/SearchScreen';
import SearchResultsScreen from '../screens/SearchResultsScreen';
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

const TAB_ICONS: Record<string, typeof Map> = {
  Explore: Map,
  Discover: Sparkles,
  Trending: Flame,
  Shortlist: Star,
  Profile: User,
};

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const Icon = TAB_ICONS[label] ?? Star;
  return (
    <View style={styles.tabIcon}>
      <Icon
        size={22}
        strokeWidth={focused ? 2.25 : 2}
        color={focused ? colors.accent : colors.textSecondary}
      />
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
          'Yakin mau keluar dari Geser?',
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
            height: 64 + insets.bottom + 10,
            paddingBottom: insets.bottom + 10,
            paddingTop: 6,
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
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
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
  badge: {
    backgroundColor: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
});
