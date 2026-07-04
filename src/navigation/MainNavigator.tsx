import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import { EventrixTabBar } from '../components/navigation/EventrixTabBar';
import HomeScreen from '../Pages/homescreen/HomeScreen';
import ExploreScreen from '../Pages/main/ExploreScreen';
import ShortsScreen from '../Pages/main/ShortsScreen';
import BookingsScreen from '../Pages/main/BookingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <EventrixTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Shorts" component={ShortsScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
    </Tab.Navigator>
  );
};

export default MainNavigator;
