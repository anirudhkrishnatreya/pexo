import { useNavigation } from "@react-navigation/native"
import { NativeStackNavigationProp } from "@react-navigation/native-stack"
import React, { useState } from "react"
import { Alert, KeyboardAvoidingView, Platform, Text, View } from "react-native"
import { RootStackParamList } from "../navigation"
import { useAuth } from "../store/auth"
import { useTheme } from "../theme"
import { Button, Card, Input, Screen } from "../components/ui"

export function LoginScreen() {
  const t = useTheme()
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const login = useAuth((s) => s.login)
  const [email, setEmail] = useState("demo@pexo.app")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      await login(email.trim(), password)
    } catch (e) {
      Alert.alert("Login failed", e instanceof Error ? e.message : "Please try again")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen style={{ justifyContent: "center", paddingHorizontal: 24 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Brand Header */}
        <View style={{ alignItems: "center", marginBottom: 36 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: t.colors.primary,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              shadowColor: t.colors.primary,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Text style={{ fontSize: 32 }}>🔥</Text>
          </View>
          <Text style={{ color: t.colors.text, fontSize: 36, fontWeight: "900", letterSpacing: -1 }}>PEXO</Text>
          <Text style={{ color: t.colors.textMuted, fontSize: 14, fontWeight: "700", letterSpacing: 1.5, marginTop: 4, textTransform: "uppercase" }}>
            MOVE · CONQUER · LEVEL UP
          </Text>
        </View>

        <Card style={{ padding: 20 }}>
          <View style={{ gap: 14 }}>
            <Input
              placeholder="Athlete Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Input placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
            <Button title="LOG IN" onPress={() => void submit()} loading={loading} style={{ marginTop: 6 }} />
            <Button title="CREATE ACCOUNT" variant="ghost" onPress={() => nav.navigate("Signup")} />
          </View>
        </Card>

        <Text style={{ color: t.colors.textSubtle, fontSize: 12, marginTop: 24, textAlign: "center" }}>
          Seeded demo athlete: demo@pexo.app / Password123!
        </Text>
      </KeyboardAvoidingView>
    </Screen>
  )
}
