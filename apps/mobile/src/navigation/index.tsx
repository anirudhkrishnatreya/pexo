import { Ionicons } from "@expo/vector-icons"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import React, { useEffect } from "react"
import { useAuth } from "../store/auth"
import { useTheme } from "../theme"
import { ActivityDetailScreen } from "../screens/ActivityDetailScreen"
import { FeedScreen } from "../screens/FeedScreen"
import { LeaderboardScreen } from "../screens/LeaderboardScreen"
import { LoginScreen } from "../screens/LoginScreen"
import { MapScreen } from "../screens/MapScreen"
import { NutritionScreen } from "../screens/NutritionScreen"
import { ProfileScreen } from "../screens/ProfileScreen"
import { RecordScreen } from "../screens/RecordScreen"
import { SignupScreen } from "../screens/SignupScreen"

export type RootStackParamList = {
  Tabs: undefined
  Login: undefined
  Signup: undefined
  ActivityDetail: { activityId: string }
}

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tabs = createBottomTabNavigator()

function MainTabs() {
  const t = useTheme()
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: t.colors.surface,
          borderTopColor: t.colors.cardBorder,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: t.colors.primary,
        tabBarInactiveTintColor: t.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "800",
          letterSpacing: 0.3,
          textTransform: "uppercase",
        },
      }}
    >
      <Tabs.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "flame" : "flame-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "map" : "map-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Record"
        component={RecordScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "radio-button-on" : "radio-button-off-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Fuel"
        component={NutritionScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "restaurant" : "restaurant-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Ranks"
        component={LeaderboardScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "trophy" : "trophy-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          ),
        }}
      />
    </Tabs.Navigator>
  )
}

export function RootNavigator() {
  const { user, booted, boot } = useAuth()

  useEffect(() => {
    void boot()
  }, [boot])

  if (!booted) return null

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Tabs" component={MainTabs} />
          <Stack.Screen
            name="ActivityDetail"
            component={ActivityDetailScreen}
            options={{
              headerShown: true,
              title: "Activity Detail",
              headerStyle: { backgroundColor: "#131822" },
              headerTintColor: "#FFFFFF",
            }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      )}
    </Stack.Navigator>
  )
}
