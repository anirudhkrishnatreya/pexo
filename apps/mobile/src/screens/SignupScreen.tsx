import { useNavigation } from "@react-navigation/native"
import React, { useState } from "react"
import { Alert, KeyboardAvoidingView, Platform, View } from "react-native"
import { useAuth } from "../store/auth"
import { Button, Input, Screen, Title, Body } from "../components/ui"

export function SignupScreen() {
  const nav = useNavigation()
  const signup = useAuth((s) => s.signup)
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      await signup({
        email: email.trim(),
        username: username.trim().toLowerCase(),
        displayName: displayName.trim(),
        password,
      })
    } catch (e) {
      Alert.alert("Signup failed", e instanceof Error ? e.message : "Please try again")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen style={{ justifyContent: "center" }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Title>Join Pexo</Title>
        <View style={{ height: 8 }} />
        <Body muted>Start conquering territories today.</Body>

        <View style={{ gap: 12, marginTop: 24 }}>
          <Input placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Input placeholder="Username" autoCapitalize="none" value={username} onChangeText={setUsername} />
          <Input placeholder="Display name" value={displayName} onChangeText={setDisplayName} />
          <Input placeholder="Password (min 8 chars)" secureTextEntry value={password} onChangeText={setPassword} />
          <Button title="Sign Up" onPress={() => void submit()} loading={loading} />
          <Button title="Back to login" variant="ghost" onPress={() => nav.goBack()} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}
