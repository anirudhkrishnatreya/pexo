import * as Haptics from "expo-haptics"
import React from "react"
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTheme } from "../theme"

export function Screen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: t.colors.background,
          paddingHorizontal: 16,
          paddingTop: Math.max(insets.top, 16) + 8,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme()
  return (
    <View
      style={[
        {
          backgroundColor: t.colors.surface,
          borderRadius: t.radius.lg,
          borderWidth: 1,
          borderColor: t.colors.cardBorder,
          padding: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 3,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

export function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const t = useTheme()
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <View>
        <Text style={{ color: t.colors.text, fontSize: 26, fontWeight: "900", letterSpacing: -0.5 }}>{title}</Text>
        {subtitle && <Text style={{ color: t.colors.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  )
}

export function Title({ children }: { children: React.ReactNode }) {
  const t = useTheme()
  return <Text style={{ color: t.colors.text, fontSize: 24, fontWeight: "900", letterSpacing: -0.3 }}>{children}</Text>
}

export function Body({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  const t = useTheme()
  return (
    <Text style={{ color: muted ? t.colors.textMuted : t.colors.text, fontSize: 14, lineHeight: 20 }}>
      {children}
    </Text>
  )
}

export function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  const t = useTheme()
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline" }}>
        <Text style={{ color: t.colors.text, fontSize: 20, fontWeight: "900", letterSpacing: -0.3 }}>{value}</Text>
        {unit && <Text style={{ color: t.colors.textMuted, fontSize: 11, fontWeight: "700", marginLeft: 2 }}>{unit}</Text>}
      </View>
      <Text style={{ color: t.colors.textMuted, fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 3 }}>
        {label}
      </Text>
    </View>
  )
}

export function Avatar({ name, size = 44, level }: { name: string; size?: number; level?: number }) {
  const t = useTheme()
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .substring(0, 2)
    .toUpperCase()

  return (
    <View style={{ position: "relative" }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: t.colors.primary,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2,
          borderColor: t.colors.surface,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: size * 0.4 }}>{initials}</Text>
      </View>
      {level !== undefined && (
        <View
          style={{
            position: "absolute",
            bottom: -2,
            right: -4,
            backgroundColor: t.colors.accent,
            borderRadius: 8,
            paddingHorizontal: 4,
            paddingVertical: 1,
            borderWidth: 1.5,
            borderColor: t.colors.surface,
          }}
        >
          <Text style={{ color: "#000000", fontWeight: "900", fontSize: 9 }}>L{level}</Text>
        </View>
      )}
    </View>
  )
}

export function Badge({ label, variant = "primary" }: { label: string; variant?: "primary" | "accent" | "muted" | "danger" }) {
  const t = useTheme()
  const bg =
    variant === "primary"
      ? t.colors.badgeBg
      : variant === "accent"
      ? "rgba(0, 229, 160, 0.15)"
      : variant === "danger"
      ? "rgba(255, 77, 77, 0.15)"
      : t.colors.border
  const fg =
    variant === "primary"
      ? t.colors.primary
      : variant === "accent"
      ? t.colors.accent
      : variant === "danger"
      ? t.colors.danger
      : t.colors.textMuted

  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: t.radius.pill,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color: fg, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>
        {label}
      </Text>
    </View>
  )
}

export function ProgressBar({ progress }: { progress: number }) {
  const t = useTheme()
  const p = Math.min(1, Math.max(0, progress))
  return (
    <View style={{ height: 6, width: "100%", backgroundColor: t.colors.border, borderRadius: 3, overflow: "hidden" }}>
      <View style={{ height: "100%", width: `${p * 100}%`, backgroundColor: t.colors.primary, borderRadius: 3 }} />
    </View>
  )
}

export function Button({
  title,
  onPress,
  loading,
  variant = "primary",
  disabled,
  style,
}: {
  title: string
  onPress: () => void
  loading?: boolean
  variant?: "primary" | "danger" | "ghost" | "accent"
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const t = useTheme()
  const bg =
    variant === "primary"
      ? t.colors.primary
      : variant === "accent"
      ? t.colors.accent
      : variant === "danger"
      ? t.colors.danger
      : "transparent"
  const fg =
    variant === "ghost"
      ? t.colors.primary
      : variant === "accent"
      ? "#000000"
      : t.colors.primaryText

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress()
      }}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
          paddingVertical: 14,
          paddingHorizontal: 20,
          borderRadius: t.radius.md,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: variant === "ghost" ? 1.5 : 0,
          borderColor: t.colors.border,
          shadowColor: variant === "primary" ? t.colors.primary : "transparent",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: variant === "primary" ? 3 : 0,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={{ color: fg, fontWeight: "900", fontSize: 14, letterSpacing: 0.5, textTransform: "uppercase" }}>{title}</Text>
      )}
    </Pressable>
  )
}

export function Input(props: TextInputProps) {
  const t = useTheme()
  return (
    <TextInput
      placeholderTextColor={t.colors.textSubtle}
      {...props}
      style={[
        {
          backgroundColor: t.colors.surface,
          borderWidth: 1.5,
          borderColor: t.colors.cardBorder,
          borderRadius: t.radius.md,
          color: t.colors.text,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 15,
          fontWeight: "600",
        },
        props.style,
      ]}
    />
  )
}
