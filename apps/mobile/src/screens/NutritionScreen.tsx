import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import React, { useState } from "react"
import { FlatList, Pressable, Text, View } from "react-native"
import { api } from "../api/client"
import { Body, Button, Card, Header, Input, ProgressBar, Screen, Stat } from "../components/ui"
import { useTheme } from "../theme"

type Summary = {
  totals: { calories: number; proteinG: number; carbsG: number; fatG: number }
  goals: { calories: number; proteinG: number; waterMl: number }
  water: { consumedMl: number; goalMl: number }
  body: { weightKg: number | null; bmi: number | null }
}

type Food = { id: string; name: string; brand?: string; servingDesc: string; calories: number; proteinG: number }
type FoodSearch = { items: Food[] }

export function NutritionScreen() {
  const t = useTheme()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState("")
  const [meal, setMeal] = useState<"BREAKFAST" | "LUNCH" | "DINNER" | "SNACK">("LUNCH")

  const summary = useQuery({
    queryKey: ["nutrition-summary"],
    queryFn: () => api<Summary>("/nutrition/summary"),
  })

  const foods = useQuery({
    queryKey: ["foods", query],
    queryFn: () => api<FoodSearch>(`/nutrition/foods?q=${encodeURIComponent(query)}&limit=10`),
    enabled: query.length > 1,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["nutrition-summary"] })

  const logFood = useMutation({
    mutationFn: (foodItemId: string) =>
      api("/nutrition/log/food", { method: "POST", body: { foodItemId, meal, servings: 1 } }),
    onSuccess: invalidate,
  })

  const logWater = useMutation({
    mutationFn: () => api("/nutrition/log/water", { method: "POST", body: { amountMl: 250 } }),
    onSuccess: invalidate,
  })

  const s = summary.data

  return (
    <Screen>
      <Header title="Nutrition & Fuel" subtitle="DAILY ATHLETE ENERGY" />

      {s && (
        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", marginBottom: 14 }}>
            <Stat label={`OF ${s.goals.calories} KCAL`} value={`${s.totals.calories}`} />
            <View style={{ width: 1, backgroundColor: t.colors.border }} />
            <Stat label={`OF ${s.goals.proteinG}G PROTEIN`} value={`${s.totals.proteinG}g`} />
            <View style={{ width: 1, backgroundColor: t.colors.border }} />
            <Stat label="CARBS / FAT" value={`${s.totals.carbsG}/${s.totals.fatG}g`} />
          </View>

          {/* Calorie Progress */}
          <ProgressBar progress={s.totals.calories / Math.max(1, s.goals.calories)} />

          {/* Water Intake Tracker */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: t.colors.background,
              borderRadius: t.radius.md,
              padding: 12,
              marginTop: 16,
              borderWidth: 1,
              borderColor: t.colors.border,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 18 }}>💧</Text>
              <View>
                <Text style={{ color: t.colors.text, fontWeight: "800", fontSize: 14 }}>
                  {s.water.consumedMl} / {s.water.goalMl} ml
                </Text>
                <Text style={{ color: t.colors.textMuted, fontSize: 11 }}>Hydration Goal</Text>
              </View>
            </View>
            <Button title="+250 ML" variant="ghost" onPress={() => logWater.mutate()} style={{ paddingVertical: 8, paddingHorizontal: 12 }} />
          </View>
        </Card>
      )}

      {/* Meal Category Tabs */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: t.colors.surface,
          borderRadius: t.radius.pill,
          padding: 4,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: t.colors.border,
        }}
      >
        {(["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const).map((m) => {
          const active = meal === m
          return (
            <Pressable
              key={m}
              onPress={() => setMeal(m)}
              style={{
                flex: 1,
                paddingVertical: 8,
                alignItems: "center",
                borderRadius: t.radius.pill,
                backgroundColor: active ? t.colors.primary : "transparent",
              }}
            >
              <Text
                style={{
                  color: active ? "#FFFFFF" : t.colors.textMuted,
                  fontWeight: "800",
                  fontSize: 11,
                }}
              >
                {m}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <Input
        placeholder="Search foods (e.g. Oats, Chicken breast, Eggs)…"
        value={query}
        onChangeText={setQuery}
        style={{ marginBottom: 12 }}
      />

      <FlatList
        data={foods.data?.items ?? []}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          query.length > 1 ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <Body muted>Searching food items…</Body>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Card style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: t.colors.text, fontWeight: "800", fontSize: 15 }}>{item.name}</Text>
              <Text style={{ color: t.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                {item.servingDesc} · {item.calories} kcal · {item.proteinG}g protein
              </Text>
            </View>
            <Button title="LOG" variant="ghost" onPress={() => logFood.mutate(item.id)} style={{ paddingVertical: 8, paddingHorizontal: 12 }} />
          </Card>
        )}
      />
    </Screen>
  )
}
