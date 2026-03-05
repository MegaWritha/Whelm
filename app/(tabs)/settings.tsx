import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/colors";
import { useApp } from "@/context/AppContext";

const BRAND_VOICES = ["Formal", "Casual", "Bold", "Warm", "Playful", "Expert"];
const GOALS = [
  "Grow audience",
  "Generate leads",
  "Improve customer service",
  "Build content",
  "Increase sales",
  "Build brand awareness",
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { company, setCompany, hiredWorkers, inboxItems, setOnboardingComplete } = useApp();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(company?.name || "");
  const [industry, setIndustry] = useState(company?.industry || "");
  const [productDescription, setProductDescription] = useState(company?.productDescription || "");
  const [targetAudience, setTargetAudience] = useState(company?.targetAudience || "");
  const [brandVoice, setBrandVoice] = useState(company?.brandVoice || "");
  const [brandColors, setBrandColors] = useState(company?.brandColors || "");
  const [selectedGoals, setSelectedGoals] = useState<string[]>(company?.goals || []);

  function startEdit() {
    setName(company?.name || "");
    setIndustry(company?.industry || "");
    setProductDescription(company?.productDescription || "");
    setTargetAudience(company?.targetAudience || "");
    setBrandVoice(company?.brandVoice || "");
    setBrandColors(company?.brandColors || "");
    setSelectedGoals(company?.goals || []);
    setEditing(true);
  }

  async function saveEdit() {
    await setCompany({
      name,
      industry,
      productDescription,
      targetAudience,
      brandVoice,
      brandColors,
      goals: selectedGoals,
    });
    setEditing(false);
  }

  function toggleGoal(goal: string) {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  }

  async function handleReset() {
    if (Platform.OS === "web") {
      const ok = window.confirm("This will clear all your data and restart onboarding. Are you sure?");
      if (!ok) return;
    } else {
      Alert.alert(
        "Reset Whelm",
        "This will clear all your data and restart onboarding. Are you sure?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reset",
            style: "destructive",
            onPress: () => doReset(),
          },
        ]
      );
      return;
    }
    doReset();
  }

  async function doReset() {
    await AsyncStorage.clear();
    await setOnboardingComplete(false);
    router.replace("/onboarding");
  }

  if (!company) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: Colors.textMuted }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Platform.OS === "web" ? 67 : insets.top },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        {!editing ? (
          <Pressable style={styles.editBtn} onPress={startEdit}>
            <Ionicons name="pencil" size={16} color={Colors.primary} />
            <Text style={styles.editBtnText}>Edit</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.saveBtn} onPress={saveEdit}>
            <Text style={styles.saveBtnText}>Save</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 34 : 100 },
        ]}
      >
        {/* Stats Overview */}
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{hiredWorkers.length}</Text>
            <Text style={styles.statLabel}>Workers hired</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{inboxItems.length}</Text>
            <Text style={styles.statLabel}>Total tasks</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>
              {inboxItems.filter((i) => i.status === "approved").length}
            </Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
        </View>

        {/* Company Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Profile</Text>
          <View style={styles.card}>
            <FieldRow
              label="Company Name"
              value={name}
              editing={editing}
              onChange={setName}
            />
            <FieldRow
              label="Industry"
              value={industry}
              editing={editing}
              onChange={setIndustry}
            />
            <FieldRow
              label="Product / Service"
              value={productDescription}
              editing={editing}
              onChange={setProductDescription}
              multiline
              last
            />
          </View>
        </View>

        {/* Audience & Voice */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audience & Voice</Text>
          <View style={styles.card}>
            <FieldRow
              label="Target Audience"
              value={targetAudience}
              editing={editing}
              onChange={setTargetAudience}
            />
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Brand Voice</Text>
              {editing ? (
                <View style={styles.chipGrid}>
                  {BRAND_VOICES.map((v) => (
                    <Pressable
                      key={v}
                      style={[styles.chip, brandVoice === v && styles.chipActive]}
                      onPress={() => setBrandVoice(v)}
                    >
                      <Text style={[styles.chipText, brandVoice === v && styles.chipTextActive]}>
                        {v}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.fieldValue}>{brandVoice}</Text>
              )}
            </View>
            <FieldRow
              label="Brand Colours"
              value={brandColors}
              editing={editing}
              onChange={setBrandColors}
              last
            />
          </View>
        </View>

        {/* Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Goals</Text>
          <View style={styles.card}>
            <View style={[styles.fieldRow, { borderBottomWidth: 0 }]}>
              {editing ? (
                <View style={styles.chipGrid}>
                  {GOALS.map((goal) => (
                    <Pressable
                      key={goal}
                      style={[
                        styles.chip,
                        selectedGoals.includes(goal) && styles.chipActive,
                      ]}
                      onPress={() => toggleGoal(goal)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selectedGoals.includes(goal) && styles.chipTextActive,
                        ]}
                      >
                        {goal}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={styles.goalsRow}>
                  {selectedGoals.map((goal) => (
                    <View key={goal} style={styles.goalPill}>
                      <Text style={styles.goalPillText}>{goal}</Text>
                    </View>
                  ))}
                  {selectedGoals.length === 0 && (
                    <Text style={styles.fieldValue}>No goals set</Text>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: Colors.danger }]}>Danger Zone</Text>
          <Pressable style={styles.dangerCard} onPress={handleReset}>
            <View style={styles.dangerLeft}>
              <Ionicons name="refresh" size={18} color={Colors.danger} />
              <View>
                <Text style={styles.dangerTitle}>Reset Whelm</Text>
                <Text style={styles.dangerSub}>Clear all data and restart onboarding</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.danger} />
          </Pressable>
        </View>

        <Text style={styles.footerText}>
          Whelm · Your company. Fully staffed. Powered by AI.
        </Text>
      </ScrollView>
    </View>
  );
}

function FieldRow({
  label,
  value,
  editing,
  onChange,
  multiline,
  last,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  multiline?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.fieldRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {editing ? (
        <TextInput
          style={[styles.fieldInput, multiline && styles.fieldInputMulti]}
          value={value}
          onChangeText={onChange}
          multiline={multiline}
          placeholderTextColor={Colors.textMuted}
        />
      ) : (
        <Text style={styles.fieldValue}>{value || "—"}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.text,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primaryDim,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
  },
  editBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.primary,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 100,
  },
  saveBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 24,
  },
  statsSection: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.text,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  fieldRow: {
    padding: 16,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  fieldLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  fieldValue: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  fieldInput: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fieldInputMulti: {
    minHeight: 80,
    textAlignVertical: "top",
    paddingTop: 8,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.background,
  },
  goalsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  goalPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primary + "40",
  },
  goalPillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.primary,
  },
  dangerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.danger + "10",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.danger + "40",
    padding: 16,
  },
  dangerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dangerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.danger,
  },
  dangerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.danger,
    opacity: 0.7,
    marginTop: 2,
  },
  footerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    paddingVertical: 8,
  },
});
