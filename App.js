import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { ActivityIndicator, View, Alert } from 'react-native';
import * as Updates from 'expo-updates';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import AdminPanelScreen from './src/screens/AdminPanelScreen';
import HomeScreen from './src/screens/HomeScreen';
import ChatScreen from './src/screens/ChatScreen';
import GroupChatScreen from './src/screens/GroupChatScreen';
import NewChatScreen from './src/screens/NewChatScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import AddFriendScreen from './src/screens/AddFriendScreen';
import FriendRequestsScreen from './src/screens/FriendRequestsScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, loading, isAdmin } = useAuth();
  const { theme } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const sharedScreens = (
    <>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="GroupChat" component={GroupChatScreen} />
      <Stack.Screen name="NewChat" component={NewChatScreen} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
      <Stack.Screen name="AddFriend" component={AddFriendScreen} />
      <Stack.Screen name="FriendRequests" component={FriendRequestsScreen} />
      {isAdmin && <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />}
    </>
  );

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          sharedScreens
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

async function checkForUpdates() {
  try {
    // In Expo Go there are no updates — skip
    if (__DEV__) return;

    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      Alert.alert(
        '🚀 Update Available',
        'A new version of PrivateChats is ready. Install it now for the latest features and fixes.',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Update Now',
            onPress: async () => {
              await Updates.fetchUpdateAsync();
              await Updates.reloadAsync();
            },
          },
        ]
      );
    }
  } catch (e) {
    // Silently ignore — update check failing should never crash the app
    console.log('Update check skipped:', e.message);
  }
}

export default function App() {
  useEffect(() => {
    checkForUpdates();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
