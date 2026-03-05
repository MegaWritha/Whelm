import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { CompanyProfile } from "@/data/workers";

const BRAND_VOICES = ["Formal", "Casual", "Bold", "Warm", "Playful", "Expert"];
const GOALS = [
  "Grow audience",
  "Generate leads",
  "Improve customer service",
  "Build content",
  "Increase sales",
  "Build brand awareness",
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { setCompany, setOnboardingComplete } = useApp();
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [brandVoice, setBrandVoice] = useState("");
  const [brandColors, setBrandColors] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const totalSteps = 5;

  function animateStep(nextStep: number) {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    setTimeout(() => setStep(nextStep), 150);
  }

  function handleNext() {
    if (step < totalSteps - 1) {
      animateStep(step + 1);
    } else {
      handleFinish();
    }
  }

  function handleBack() {
    if (step > 0) animateStep(step - 1);
  }

  function toggleGoal(goal: string) {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  }

  async function handleFinish() {
    const profile: CompanyProfile = {
      name,
      industry,
      productDescription,
      targetAudience,
      brandVoice,
      brandColors,
      goals: selectedGoals,
    };
    await setCompany(profile);
    await setOnboardingComplete(true);
    router.replace("/(tabs)");
  }

  function isStepValid() {
    if (step === 0) return name.trim().length > 0 && industry.trim().length > 0;
    if (step === 1) return productDescription.trim().length > 0;
    if (step === 2) return targetAudience.trim().length > 0;
    if (step === 3) return brandVoice.length > 0;
    if (step === 4) return selectedGoals.length > 0;
    return true;
  }

  const steps = [
    {
      title: "Your Company",
      subtitle: "Let's start with the basics",
      content: (
        <View style={styles.fieldGroup}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Company Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Bloom Studio"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Industry</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. E-commerce, SaaS, Agency"
              placeholderTextColor={Colors.textMuted}
              value={industry}
              onChangeText={setIndustry}
            />
          </View>
        </View>
      ),
    },
    {
      title: "What You Do",
      subtitle: "Your AI workers need to understand your offer",
      content: (
        <View style={styles.fieldGroup}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Product or Service</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Describe what you sell or provide..."
              placeholderTextColor={Colors.textMuted}
              value={productDescription}
              onChangeText={setProductDescription}
              multiline
              numberOfLines={4}
              autoFocus
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Target Audience</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Solo founders, small business owners"
              placeholderTextColor={Colors.textMuted}
              value={targetAudience}
              onChangeText={setTargetAudience}
            />
          </View>
        </View>
      ),
    },
    {
      title: "Your Brand Voice",
      subtitle: "How your company communicates",
      content: (
        <View style={styles.fieldGroup}>
          <View style={styles.chipGrid}>
            {BRAND_VOICES.map((voice) => (
              <Pressable
                key={voice}
                style={[
                  styles.chip,
                  brandVoice === voice && styles.chipSelected,
                ]}
                onPress={() => setBrandVoice(voice)}
              >
                <Text
                  style={[
                    styles.chipText,
                    brandVoice === voice && styles.chipTextSelected,
                  ]}
                >
                  {voice}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Brand Colours (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Deep green, warm cream, gold"
              placeholderTextColor={Colors.textMuted}
              value={brandColors}
              onChangeText={setBrandColors}
            />
          </View>
        </View>
      ),
    },
    {
      title: "Your Goals",
      subtitle: "What do you want to achieve?",
      content: (
        <View style={styles.chipGrid}>
          {GOALS.map((goal) => (
            <Pressable
              key={goal}
              style={[
                styles.chip,
                selectedGoals.includes(goal) && styles.chipSelected,
              ]}
              onPress={() => toggleGoal(goal)}
            >
              {selectedGoals.includes(goal) && (
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={Colors.background}
                  style={{ marginRight: 4 }}
                />
              )}
              <Text
                style={[
                  styles.chipText,
                  selectedGoals.includes(goal) && styles.chipTextSelected,
                ]}
              >
                {goal}
              </Text>
            </Pressable>
          ))}
        </View>
      ),
    },
    {
      title: "You're Ready",
      subtitle: "Your AI workforce is about to be briefed",
      content: (
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Company</Text>
            <Text style={styles.summaryValue}>{name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Industry</Text>
            <Text style={styles.summaryValue}>{industry}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Brand Voice</Text>
            <Text style={styles.summaryValue}>{brandVoice}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Goals</Text>
            <Text style={styles.summaryValue}>{selectedGoals.join(", ")}</Text>
          </View>
          <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.summaryValue, { color: Colors.textSecondary, fontSize: 13 }]}>
              Every AI worker will be briefed with this information automatically.
            </Text>
          </View>
        </View>
      ),
    },
  ];

  const current = steps[step];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={styles.logoDot} />
              <Text style={styles.logoText}>Whelm</Text>
            </View>
            <Text style={styles.headerSub}>Your company. Fully staffed. Powered by AI.</Text>
          </View>

          <View style={styles.progressRow}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i <= step && styles.progressDotActive,
                  i < step && styles.progressDotDone,
                ]}
              />
            ))}
          </View>

          <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
            <Text style={styles.stepTitle}>{current.title}</Text>
            <Text style={styles.stepSubtitle}>{current.subtitle}</Text>
            <View style={styles.stepContent}>{current.content}</View>
          </Animated.View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={[styles.backBtn, step === 0 && { opacity: 0 }]}
            onPress={handleBack}
            disabled={step === 0}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
          </Pressable>

          <Pressable
            style={[styles.nextBtn, !isStepValid() && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!isStepValid()}
          >
            <Text style={styles.nextBtnText}>
              {step === totalSteps - 1 ? "Launch Whelm" : "Continue"}
            </Text>
            <Ionicons
              name={step === totalSteps - 1 ? "rocket" : "arrow-forward"}
              size={18}
              color={Colors.background}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1,
  },
  header: {
    marginBottom: 32,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  logoText: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  headerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 36,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
    width: 20,
  },
  progressDotDone: {
    backgroundColor: Colors.primary,
    width: 6,
    opacity: 0.4,
  },
  stepTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.text,
    marginBottom: 8,
    lineHeight: 36,
  },
  stepSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 32,
    lineHeight: 22,
  },
  stepContent: {
    flex: 1,
  },
  fieldGroup: {
    gap: 20,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.background,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  summaryRow: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 4,
  },
  summaryLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  summaryValue: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 100,
  },
  nextBtnDisabled: {
    opacity: 0.4,
  },
  nextBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.background,
  },
});
