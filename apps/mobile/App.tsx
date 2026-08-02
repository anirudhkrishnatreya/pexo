import "./polyfill"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { NavigationContainer } from "@react-navigation/native"
import { StatusBar } from "expo-status-bar"
import React from "react"
import { useColorScheme } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { RootNavigator } from "./src/navigation"
import { navTheme, ThemeProvider } from "./src/theme"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

export default function App() {
  const scheme = useColorScheme()
  const dark = scheme !== "light"

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider dark={dark}>
          <NavigationContainer theme={navTheme(dark)}>
            <StatusBar style={dark ? "light" : "dark"} />
            <RootNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
