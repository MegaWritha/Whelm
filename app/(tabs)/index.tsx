import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { ALL_WORKERS, DEPARTMENTS, Department } from "@/data/workers";

const DEPT_COLORS: Record<Department, string> = {
  Creative: Colors.creative,
  Growth: Colors.growth,
  Operations: Colors.operations,
  Technical: Colors.technical,
  Strategy: Colors.strategy,
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { company, onboardingComplete, isLoaded, hiredWorkers, pendingCount, inboxItems } = useApp();

  useEffect(() => {
    if (isLoaded && !onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [isLoaded, onboardingComplete]);

  if (!isLoaded || !company) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <View style={styles.loadingDot} />
      </View>
    );
  }

  const hiredWorkerData = ALL_WORKERS.filter((w) => hiredWorkers.includes(w.id));
  const approvedCount = inboxItems.filter((i) => i.status === "approved").length;
  const today = new Date();
  const hour = today.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const deptBreakdown = DEPARTMENTS.map((dept) => ({
    dept,
    count: hiredWorkerData.filter((w) => w.department === dept).length,
    color: DEPT_COLORS[dept],
  })).filter((d) => d.count > 0);

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 34 : 100 },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.companyName}>{company.name}</Text>
          </View>
          <Pressable
            style={styles.settingsBtn}
            onPress={() => router.push("/(tabs)/settings")}
          >
            <Ionicons name="settings-outline" size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: Colors.primary + "30" }]}>
            <Text style={[styles.statNum, { color: Colors.primary }]}>{hiredWorkers.length}</Text>
            <Text style={styles.statLabel}>Active Workers</Text>
          </View>
          <Pressable
            style={[styles.statCard, pendingCount > 0 && { borderColor: Colors.warning + "40" }]}
            onPress={() => router.push("/(tabs)/inbox")}
          >
            <Text style={[styles.statNum, { color: pendingCount > 0 ? Colors.warning : Colors.text }]}>
              {pendingCount}
            </Text>
            <Text style={styles.statLabel}>Pending Review</Text>
          </Pressable>
          <View style={[styles.statCard, { borderColor: Colors.success + "30" }]}>
            <Text style={[styles.statNum, { color: Colors.success }]}>{approvedCount}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
        </View>

        {/* Morning Briefing */}
        <View style={styles.briefingCard}>
          <View style={styles.briefingHeader}>
            <View style={styles.briefingBadge}>
              <Ionicons name="sunny" size={12} color={Colors.background} />
              <Text style={styles.briefingBadgeText}>Morning Briefing</Text>
            </View>
            <Text style={styles.briefingDate}>
              {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </Text>
          </View>
          {hiredWorkers.length === 0 ? (
            <View style={styles.emptyBriefing}>
              <Text style={styles.briefingBody}>
                You have no workers hired yet. Head to the Team tab to build your AI workforce.
              </Text>
            </View>
          ) : (
            <View style={styles.briefingBody2}>
              <Text style={styles.briefingBodyText}>
                Your team of {hiredWorkers.length} {hiredWorkers.length === 1 ? "worker" : "workers"} is standing by.
                {pendingCount > 0
                  ? ` You have ${pendingCount} item${pendingCount === 1 ? "" : "s"} waiting for your review in the Inbox.`
                  : " No items pending review."}
              </Text>
              {deptBreakdown.length > 0 && (
                <View style={styles.deptRow}>
                  {deptBreakdown.map((d) => (
                    <View key={d.dept} style={[styles.deptBadge, { borderColor: d.color + "40", backgroundColor: d.color + "10" }]}>
                      <View style={[styles.deptDot, { backgroundColor: d.color }]} />
                      <Text style={[styles.deptText, { color: d.color }]}>
                        {d.count} {d.dept}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* My Team */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Team</Text>
            <Pressable onPress={() => router.push("/(tabs)/workers")}>
              <Text style={styles.sectionLink}>
                {hiredWorkers.length === 0 ? "Hire workers" : "Manage team"}
              </Text>
            </Pressable>
          </View>

          {hiredWorkerData.length === 0 ? (
            <Pressable
              style={styles.emptyTeamCard}
              onPress={() => router.push("/(tabs)/workers")}
            >
              <View style={styles.emptyTeamIcon}>
                <Ionicons name="people" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTeamTitle}>Build your team</Text>
              <Text style={styles.emptyTeamSub}>
                Browse 18 AI workers across Creative, Growth, Operations, Technical, and Strategy.
              </Text>
              <View style={styles.emptyTeamBtn}>
                <Text style={styles.emptyTeamBtnText}>Browse Workers</Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
              </View>
            </Pressable>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.teamRow}
            >
              {hiredWorkerData.map((worker) => (
                <Pressable
                  key={worker.id}
                  style={styles.workerCard}
                  onPress={() => router.push({ pathname: "/worker/[id]", params: { id: worker.id } })}
                >
                  <View
                    style={[
                      styles.workerAvatar,
                      { backgroundColor: DEPT_COLORS[worker.department] + "20", borderColor: DEPT_COLORS[worker.department] + "40" },
                    ]}
                  >
                    <Text style={[styles.workerEmoji, { color: DEPT_COLORS[worker.department] }]}>
                      {worker.emoji}
                    </Text>
                  </View>
                  <Text style={styles.workerCardName}>{worker.name}</Text>
                  <Text style={styles.workerCardRole} numberOfLines={2}>{worker.role}</Text>
                  <View style={[styles.workerDeptPill, { backgroundColor: DEPT_COLORS[worker.department] + "15" }]}>
                    <Text style={[styles.workerDeptPillText, { color: DEPT_COLORS[worker.department] }]}>
                      {worker.department}
                    </Text>
                  </View>
                </Pressable>
              ))}
              <Pressable
                style={[styles.workerCard, styles.addWorkerCard]}
                onPress={() => router.push("/(tabs)/workers")}
              >
                <View style={styles.addWorkerIcon}>
                  <Ionicons name="add" size={24} color={Colors.primary} />
                </View>
                <Text style={styles.addWorkerText}>Add worker</Text>
              </Pressable>
            </ScrollView>
          )}
        </View>

        {/* Recent Inbox */}
        {inboxItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Work</Text>
              <Pressable onPress={() => router.push("/(tabs)/inbox")}>
                <Text style={styles.sectionLink}>View all</Text>
              </Pressable>
            </View>
            {inboxItems.slice(0, 3).map((item) => (
              <Pressable
                key={item.id}
                style={styles.inboxPreviewCard}
                onPress={() => router.push("/(tabs)/inbox")}
              >
                <View style={styles.inboxPreviewLeft}>
                  <View style={styles.inboxPreviewAvatar}>
                    <Text style={styles.inboxPreviewInitial}>
                      {item.workerName.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.inboxPreviewInfo}>
                    <Text style={styles.inboxPreviewTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.inboxPreviewMeta}>{item.workerName} · {item.workerRole}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.inboxStatusPill,
                    item.status === "pending" && styles.statusPending,
                    item.status === "approved" && styles.statusApproved,
                    item.status === "rejected" && styles.statusRejected,
                  ]}
                >
                  <Text
                    style={[
                      styles.inboxStatusText,
                      item.status === "pending" && { color: Colors.warning },
                      item.status === "approved" && { color: Colors.success },
                      item.status === "rejected" && { color: Colors.danger },
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 20,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  greeting: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  companyName: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.text,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: Colors.text,
    lineHeight: 32,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 2,
  },
  briefingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 28,
    overflow: "hidden",
  },
  briefingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  briefingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  briefingBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: Colors.background,
  },
  briefingDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
  emptyBriefing: {
    padding: 16,
  },
  briefingBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  briefingBody2: {
    padding: 16,
    gap: 14,
  },
  briefingBodyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  deptRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  deptBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  deptDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  deptText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: Colors.text,
  },
  sectionLink: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.primary,
  },
  teamRow: {
    gap: 12,
    paddingRight: 20,
  },
  workerCard: {
    width: 130,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  workerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  workerEmoji: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  workerCardName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  workerCardRole: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  workerDeptPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    alignSelf: "flex-start",
  },
  workerDeptPillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
  },
  addWorkerCard: {
    alignItems: "center",
    justifyContent: "center",
    borderStyle: "dashed",
    gap: 8,
  },
  addWorkerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryDim,
    alignItems: "center",
    justifyContent: "center",
  },
  addWorkerText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.primary,
  },
  emptyTeamCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  emptyTeamIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTeamTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: Colors.text,
  },
  emptyTeamSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 240,
  },
  emptyTeamBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  emptyTeamBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.primary,
  },
  inboxPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inboxPreviewLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  inboxPreviewAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primaryDim,
    alignItems: "center",
    justifyContent: "center",
  },
  inboxPreviewInitial: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.primary,
  },
  inboxPreviewInfo: {
    flex: 1,
    gap: 2,
  },
  inboxPreviewTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.text,
  },
  inboxPreviewMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
  inboxStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  statusPending: {
    backgroundColor: Colors.warning + "15",
    borderColor: Colors.warning + "40",
  },
  statusApproved: {
    backgroundColor: Colors.success + "15",
    borderColor: Colors.success + "40",
  },
  statusRejected: {
    backgroundColor: Colors.danger + "15",
    borderColor: Colors.danger + "40",
  },
  inboxStatusText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textTransform: "capitalize",
  },
});
