import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import {
  ALL_WORKERS,
  DEPARTMENTS,
  Department,
  Worker,
} from "@/data/workers";

const DEPT_COLORS: Record<Department, string> = {
  Creative: Colors.creative,
  Growth: Colors.growth,
  Operations: Colors.operations,
  Technical: Colors.technical,
  Strategy: Colors.strategy,
};

export default function WorkersScreen() {
  const insets = useSafeAreaInsets();
  const { hireWorker, fireWorker, isHired } = useApp();
  const [selectedDept, setSelectedDept] = useState<Department | "All">("All");
  const [search, setSearch] = useState("");

  const filtered = ALL_WORKERS.filter((w) => {
    const matchDept = selectedDept === "All" || w.department === selectedDept;
    const matchSearch =
      search.length === 0 ||
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.role.toLowerCase().includes(search.toLowerCase());
    return matchDept && matchSearch;
  });

  async function handleToggleHire(worker: Worker) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isHired(worker.id)) {
      await fireWorker(worker.id);
    } else {
      await hireWorker(worker.id);
    }
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Platform.OS === "web" ? 67 : insets.top },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Worker Roster</Text>
          <Text style={styles.subtitle}>18 AI workers ready to hire</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={16}
          color={Colors.textMuted}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search workers..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Department Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {(["All", ...DEPARTMENTS] as (Department | "All")[]).map((dept) => {
          const active = selectedDept === dept;
          const color =
            dept === "All" ? Colors.primary : DEPT_COLORS[dept as Department];
          return (
            <Pressable
              key={dept}
              style={[
                styles.filterPill,
                active && {
                  backgroundColor: color + "20",
                  borderColor: color + "60",
                },
              ]}
              onPress={() => setSelectedDept(dept)}
            >
              {dept !== "All" && (
                <View
                  style={[
                    styles.filterDot,
                    { backgroundColor: active ? color : Colors.textMuted },
                  ]}
                />
              )}
              <Text
                style={[
                  styles.filterText,
                  { color: active ? color : Colors.textMuted },
                ]}
              >
                {dept}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Workers List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Platform.OS === "web" ? 34 : 100 },
        ]}
      >
        {DEPARTMENTS.filter(
          (d) => selectedDept === "All" || selectedDept === d
        ).map((dept) => {
          const workers = filtered.filter((w) => w.department === dept);
          if (workers.length === 0) return null;
          return (
            <View key={dept} style={styles.deptSection}>
              <View style={styles.deptHeader}>
                <View
                  style={[
                    styles.deptDot,
                    { backgroundColor: DEPT_COLORS[dept] },
                  ]}
                />
                <Text style={styles.deptName}>{dept}</Text>
                <View
                  style={[
                    styles.deptCount,
                    { backgroundColor: DEPT_COLORS[dept] + "15" },
                  ]}
                >
                  <Text
                    style={[styles.deptCountText, { color: DEPT_COLORS[dept] }]}
                  >
                    {workers.length}
                  </Text>
                </View>
              </View>
              {workers.map((worker) => {
                const hired = isHired(worker.id);
                const deptColor = DEPT_COLORS[worker.department];
                return (
                  <View key={worker.id} style={styles.workerCard}>
                    <Pressable
                      style={styles.workerCardLeft}
                      onPress={() =>
                        router.push({
                          pathname: "/worker/[id]",
                          params: { id: worker.id },
                        })
                      }
                    >
                      <View
                        style={[
                          styles.workerAvatar,
                          {
                            backgroundColor: deptColor + "20",
                            borderColor: deptColor + "40",
                          },
                        ]}
                      >
                        <Text
                          style={[styles.workerEmoji, { color: deptColor }]}
                        >
                          {worker.emoji}
                        </Text>
                      </View>
                      <View style={styles.workerInfo}>
                        <View style={styles.workerNameRow}>
                          <Text style={styles.workerName}>{worker.name}</Text>
                          {hired && (
                            <View style={styles.hiredBadge}>
                              <View style={styles.hiredDot} />
                              <Text style={styles.hiredText}>Active</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.workerRole}>{worker.role}</Text>
                        <Text style={styles.workerPersonality} numberOfLines={2}>
                          {worker.personality}
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.hireBtn,
                        hired && styles.fireBtn,
                      ]}
                      onPress={() => handleToggleHire(worker)}
                    >
                      <Ionicons
                        name={hired ? "remove" : "add"}
                        size={18}
                        color={hired ? Colors.danger : Colors.primary}
                      />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No workers found</Text>
            <Text style={styles.emptySub}>Try a different search or filter</Text>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  filterRow: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 24,
  },
  deptSection: {
    gap: 10,
  },
  deptHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  deptDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deptName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  deptCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  deptCountText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  workerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  workerCardLeft: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  workerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  workerEmoji: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  workerInfo: {
    flex: 1,
    gap: 2,
  },
  workerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  workerName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.text,
  },
  hiredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.success + "15",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 100,
  },
  hiredDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  hiredText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.success,
  },
  workerRole: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  workerPersonality: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
    marginTop: 2,
  },
  hireBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryDim,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  fireBtn: {
    backgroundColor: Colors.danger + "15",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: Colors.textSecondary,
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
  },
});
