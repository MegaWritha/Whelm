import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { useApp, InboxItem } from "@/context/AppContext";
import { ALL_WORKERS } from "@/data/workers";

type FilterTab = "all" | "pending" | "approved" | "rejected";

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const { inboxItems, approveItem, rejectItem } = useApp();
  const [filter, setFilter] = useState<FilterTab>("pending");
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const filtered = inboxItems.filter((item) => {
    if (filter === "all") return true;
    return item.status === filter;
  });

  const pendingCount = inboxItems.filter((i) => i.status === "pending").length;

  async function handleApprove(id: string) {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await approveItem(id);
    setSelectedItem(null);
  }

  async function handleReject(id: string) {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await rejectItem(id);
    setShowFeedback(false);
    setSelectedItem(null);
    setFeedbackText("");
  }

  function getWorkerColor(workerId: string) {
    const worker = ALL_WORKERS.find((w) => w.id === workerId);
    if (!worker) return Colors.primary;
    const DEPT_COLORS: Record<string, string> = {
      Creative: Colors.creative,
      Growth: Colors.growth,
      Operations: Colors.operations,
      Technical: Colors.technical,
      Strategy: Colors.strategy,
    };
    return DEPT_COLORS[worker.department] || Colors.primary;
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "all", label: "All" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Platform.OS === "web" ? 67 : insets.top },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Inbox</Text>
          <Text style={styles.subtitle}>
            {pendingCount > 0
              ? `${pendingCount} item${pendingCount === 1 ? "" : "s"} awaiting review`
              : "All caught up"}
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {tabs.map((tab) => {
          const count = inboxItems.filter((i) =>
            tab.key === "all" ? true : i.status === tab.key
          ).length;
          return (
            <Pressable
              key={tab.key}
              style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
              onPress={() => setFilter(tab.key)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filter === tab.key && styles.filterTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.filterBadge,
                    filter === tab.key && { backgroundColor: Colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterBadgeText,
                      filter === tab.key && { color: Colors.background },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === "web" ? 34 : 100 },
        ]}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="mail-open-outline" size={32} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>
              {filter === "pending" ? "Nothing pending" : "No items here"}
            </Text>
            <Text style={styles.emptySub}>
              {filter === "pending"
                ? "Chat with a hired worker to generate work for review."
                : "Items will appear here once workers submit work."}
            </Text>
          </View>
        ) : (
          filtered.map((item) => {
            const color = getWorkerColor(item.workerId);
            return (
              <Pressable
                key={item.id}
                style={[
                  styles.itemCard,
                  item.urgent && styles.itemCardUrgent,
                ]}
                onPress={() => setSelectedItem(item)}
              >
                {item.urgent && (
                  <View style={styles.urgentBanner}>
                    <Ionicons name="alert-circle" size={12} color={Colors.danger} />
                    <Text style={styles.urgentText}>Urgent</Text>
                  </View>
                )}
                <View style={styles.itemTop}>
                  <View
                    style={[
                      styles.workerAvatar,
                      { backgroundColor: color + "20", borderColor: color + "40" },
                    ]}
                  >
                    <Text style={[styles.workerInitial, { color }]}>
                      {item.workerName.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemWorker}>
                      {item.workerName} · {item.workerRole}
                    </Text>
                    <Text style={styles.itemTime}>
                      {new Date(item.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      item.status === "pending" && styles.pillPending,
                      item.status === "approved" && styles.pillApproved,
                      item.status === "rejected" && styles.pillRejected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        item.status === "pending" && { color: Colors.warning },
                        item.status === "approved" && { color: Colors.success },
                        item.status === "rejected" && { color: Colors.danger },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemPreview} numberOfLines={3}>
                  {item.content}
                </Text>
                {item.status === "pending" && (
                  <View style={styles.itemActions}>
                    <Pressable
                      style={styles.rejectBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        setSelectedItem(item);
                        setShowFeedback(true);
                      }}
                    >
                      <Ionicons name="close" size={16} color={Colors.danger} />
                      <Text style={styles.rejectBtnText}>Send back</Text>
                    </Pressable>
                    <Pressable
                      style={styles.approveBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleApprove(item.id);
                      }}
                    >
                      <Ionicons name="checkmark" size={16} color={Colors.background} />
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </Pressable>
                  </View>
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={selectedItem !== null && !showFeedback}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { paddingBottom: insets.bottom + 20 },
            ]}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedItem?.title}</Text>
                <Text style={styles.modalMeta}>
                  {selectedItem?.workerName} · {selectedItem?.workerRole}
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedItem(null)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalContent}>{selectedItem?.content}</Text>
            </ScrollView>
            {selectedItem?.status === "pending" && (
              <View style={styles.modalActions}>
                <Pressable
                  style={styles.rejectBtn}
                  onPress={() => setShowFeedback(true)}
                >
                  <Ionicons name="close" size={16} color={Colors.danger} />
                  <Text style={styles.rejectBtnText}>Send back</Text>
                </Pressable>
                <Pressable
                  style={[styles.approveBtn, { flex: 1 }]}
                  onPress={() => selectedItem && handleApprove(selectedItem.id)}
                >
                  <Ionicons name="checkmark" size={16} color={Colors.background} />
                  <Text style={styles.approveBtnText}>Approve</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Feedback Modal */}
      <Modal
        visible={showFeedback}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFeedback(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalSheet,
                { paddingBottom: insets.bottom + 20 },
              ]}
            >
              <View style={styles.modalHandle} />
              <Text style={styles.feedbackTitle}>Send back with notes</Text>
              <Text style={styles.feedbackSub}>
                Your feedback will help the worker improve.
              </Text>
              <TextInput
                style={styles.feedbackInput}
                placeholder="What needs to change?"
                placeholderTextColor={Colors.textMuted}
                value={feedbackText}
                onChangeText={setFeedbackText}
                multiline
                numberOfLines={4}
                autoFocus
              />
              <View style={styles.modalActions}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => {
                    setShowFeedback(false);
                    setFeedbackText("");
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.approveBtn, { flex: 1 }]}
                  onPress={() => selectedItem && handleReject(selectedItem.id)}
                >
                  <Text style={styles.approveBtnText}>Send Back</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
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
  filterTabActive: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primary + "50",
  },
  filterTabText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textMuted,
  },
  filterTabTextActive: {
    color: Colors.primary,
  },
  filterBadge: {
    backgroundColor: Colors.border,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: Colors.textMuted,
  },
  list: {
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
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
    textAlign: "center",
    maxWidth: 250,
    lineHeight: 21,
  },
  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  itemCardUrgent: {
    borderColor: Colors.danger + "50",
  },
  urgentBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.danger + "15",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    alignSelf: "flex-start",
  },
  urgentText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: Colors.danger,
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  workerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  workerInitial: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  itemMeta: {
    flex: 1,
    gap: 2,
  },
  itemWorker: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  itemTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  pillPending: {
    backgroundColor: Colors.warning + "15",
    borderColor: Colors.warning + "40",
  },
  pillApproved: {
    backgroundColor: Colors.success + "15",
    borderColor: Colors.success + "40",
  },
  pillRejected: {
    backgroundColor: Colors.danger + "15",
    borderColor: Colors.danger + "40",
  },
  statusText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    textTransform: "capitalize",
  },
  itemTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  itemPreview: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  itemActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  rejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: Colors.danger + "15",
    borderWidth: 1,
    borderColor: Colors.danger + "40",
  },
  rejectBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.danger,
  },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: Colors.primary,
  },
  approveBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "85%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.text,
    flex: 1,
  },
  modalMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    maxHeight: 360,
    marginBottom: 16,
  },
  modalContent: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  feedbackTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.text,
    marginBottom: 6,
  },
  feedbackSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  feedbackInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    color: Colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 100,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
