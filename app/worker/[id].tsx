import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Modal,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import { Colors } from "@/constants/colors";
import { useApp, ChatMessage, InboxItem } from "@/context/AppContext";
import {
  getWorkerById,
  buildWorkerSystemPrompt,
  Department,
} from "@/data/workers";
import { getApiUrl } from "@/lib/query-client";

const DEPT_COLORS: Record<Department, string> = {
  Creative: Colors.creative,
  Growth: Colors.growth,
  Operations: Colors.operations,
  Technical: Colors.technical,
  Strategy: Colors.strategy,
};

export default function WorkerChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { company, isHired, hireWorker, addMessage, getConversation, addInboxItem } = useApp();

  const worker = getWorkerById(id);
  const conversation = getConversation(id);
  const hired = isHired(id);

  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [workTitle, setWorkTitle] = useState("");
  const [customWork, setCustomWork] = useState("");
  const [isGeneratingWork, setIsGeneratingWork] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const messages: ChatMessage[] = conversation?.messages || [];

  if (!worker) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={{ color: Colors.text, textAlign: "center", marginTop: 40 }}>
          Worker not found
        </Text>
      </View>
    );
  }

  // After the early return above, worker is guaranteed to be defined
  const w = worker!;
  const deptColor = DEPT_COLORS[w.department];

  async function sendMessage(text: string) {
    if (!text.trim() || isSending) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      role: "user",
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    await addMessage(id, userMsg);
    setInputText("");
    setIsSending(true);
    setStreamingContent("");

    const systemPrompt = company
      ? buildWorkerSystemPrompt(w, company)
      : w.systemPromptTemplate;

    const currentMessages = messages;
    const allMessages = [...currentMessages, userMsg];
    const apiMessages = allMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}api/worker/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          messages: apiMessages,
          workerSystemPrompt: systemPrompt,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const raw = line.slice(6).trim();
            if (!raw) continue;
            try {
              const parsed = JSON.parse(raw);
              if (parsed.content) {
                fullContent += parsed.content;
                setStreamingContent(fullContent);
              }
              if (parsed.done) {
                const assistantMsg: ChatMessage = {
                  id: (Date.now() + 1).toString() + Math.random().toString(36).substr(2, 5),
                  role: "assistant",
                  content: fullContent,
                  timestamp: new Date().toISOString(),
                };
                await addMessage(id, assistantMsg);
                setStreamingContent("");
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm having trouble connecting right now. Please try again.",
        timestamp: new Date().toISOString(),
      };
      await addMessage(id, errMsg);
      setStreamingContent("");
    } finally {
      setIsSending(false);
    }
  }

  async function handleGenerateWork(taskLabel: string, taskPrompt: string) {
    setIsGeneratingWork(true);
    setShowWorkModal(false);

    const systemPrompt = company
      ? buildWorkerSystemPrompt(w, company)
      : w.systemPromptTemplate;

    // Show in chat that work is being created
    const requestMsg: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      role: "user",
      content: taskPrompt,
      timestamp: new Date().toISOString(),
    };
    await addMessage(id, requestMsg);
    setIsSending(true);

    try {
      const baseUrl = getApiUrl();

      // Use streaming chat for work generation so it appears in the conversation
      const response = await fetch(`${baseUrl}api/worker/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: taskPrompt }],
          workerSystemPrompt: systemPrompt,
        }),
      });

      if (!response.ok) throw new Error("Failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const raw = line.slice(6).trim();
            if (!raw) continue;
            try {
              const parsed = JSON.parse(raw);
              if (parsed.content) {
                fullContent += parsed.content;
                setStreamingContent(fullContent);
              }
              if (parsed.done) {
                // Add to chat
                const assistantMsg: ChatMessage = {
                  id: (Date.now() + 1).toString() + Math.random().toString(36).substr(2, 5),
                  role: "assistant",
                  content: fullContent,
                  timestamp: new Date().toISOString(),
                };
                await addMessage(id, assistantMsg);
                setStreamingContent("");

                // Also submit to inbox
                const inboxItem: InboxItem = {
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                  workerId: w.id,
                  workerName: w.name,
                  workerRole: w.role,
                  title: taskLabel,
                  content: fullContent,
                  status: "pending",
                  createdAt: new Date().toISOString(),
                };
                await addInboxItem(inboxItem);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error("Generate work error:", err);
      const errMsg: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: "I ran into an issue generating that work. Please try again.",
        timestamp: new Date().toISOString(),
      };
      await addMessage(id, errMsg);
      setStreamingContent("");
    } finally {
      setIsSending(false);
      setIsGeneratingWork(false);
      setWorkTitle("");
      setCustomWork("");
    }
  }

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.role === "user";
      return (
        <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
          {!isUser && (
            <View
              style={[
                styles.messageAvatar,
                { backgroundColor: deptColor + "20", borderColor: deptColor + "40" },
              ]}
            >
              <Text style={[styles.messageAvatarText, { color: deptColor }]}>
                {w.emoji}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.messageBubble,
              isUser ? styles.messageBubbleUser : styles.messageBubbleAssistant,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isUser ? styles.messageTextUser : styles.messageTextAssistant,
              ]}
              selectable
            >
              {item.content}
            </Text>
          </View>
        </View>
      );
    },
    [deptColor, w.emoji]
  );

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Platform.OS === "web" ? 67 : insets.top },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <View
          style={[
            styles.headerAvatar,
            { backgroundColor: deptColor + "20", borderColor: deptColor + "40" },
          ]}
        >
          <Text style={[styles.headerAvatarText, { color: deptColor }]}>
            {w.emoji}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.headerNameRow}>
            <Text style={styles.headerName}>{w.name}</Text>
            {hired && <View style={styles.activeDot} />}
          </View>
          <Text style={styles.headerRole}>{w.role}</Text>
        </View>
        {hired && (
          <Pressable
            style={styles.workBtn}
            onPress={() => setShowWorkModal(true)}
          >
            <Ionicons name="add-circle" size={18} color={Colors.primary} />
            <Text style={styles.workBtnText}>Request work</Text>
          </Pressable>
        )}
      </View>

      {/* Not hired banner */}
      {!hired && (
        <View style={styles.notHiredBanner}>
          <Ionicons name="information-circle" size={16} color={Colors.warning} />
          <Text style={styles.notHiredText}>
            Hire {w.name} to get real work delivered
          </Text>
          <Pressable
            style={styles.hireInlineBtn}
            onPress={async () => {
              await hireWorker(w.id);
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          >
            <Text style={styles.hireInlineBtnText}>Hire</Text>
          </Pressable>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Messages or intro screen */}
        {messages.length === 0 && !streamingContent ? (
          <ScrollView
            contentContainerStyle={styles.emptyContent}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.workerIntroAvatar,
                { backgroundColor: deptColor + "15", borderColor: deptColor + "30" },
              ]}
            >
              <Text style={[styles.workerIntroEmoji, { color: deptColor }]}>
                {w.emoji}
              </Text>
            </View>
            <Text style={styles.workerIntroName}>{w.name}</Text>
            <View style={[styles.deptPill, { backgroundColor: deptColor + "15" }]}>
              <Text style={[styles.deptPillText, { color: deptColor }]}>
                {w.department} · {w.role}
              </Text>
            </View>
            <Text style={styles.workerGreeting}>{w.greeting}</Text>

            {hired && (
              <>
                <View style={styles.tasksSection}>
                  <Text style={styles.tasksSectionLabel}>Request real work</Text>
                  <Text style={styles.tasksSectionSub}>
                    Tap any task — {w.name} will create the actual deliverable and submit it to your Inbox.
                  </Text>
                  <View style={styles.tasksList}>
                    {w.taskTemplates.map((task) => (
                      <Pressable
                        key={task.label}
                        style={[styles.taskItem, { borderColor: deptColor + "30" }]}
                        onPress={() => handleGenerateWork(task.label, task.prompt)}
                        disabled={isSending}
                      >
                        <View style={[styles.taskIcon, { backgroundColor: deptColor + "15" }]}>
                          <Ionicons name="document-text" size={14} color={deptColor} />
                        </View>
                        <Text style={styles.taskLabel}>{task.label}</Text>
                        <Ionicons name="arrow-forward" size={14} color={Colors.textMuted} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              </>
            )}

            {!hired && (
              <View style={styles.notHiredInfo}>
                <Text style={styles.notHiredInfoTitle}>What {w.name} creates</Text>
                <View style={styles.tasksList}>
                  {w.taskTemplates.slice(0, 3).map((task) => (
                    <View key={task.label} style={styles.taskItemDisabled}>
                      <View style={[styles.taskIcon, { backgroundColor: Colors.surface }]}>
                        <Ionicons name="lock-closed" size={12} color={Colors.textMuted} />
                      </View>
                      <Text style={[styles.taskLabel, { color: Colors.textMuted }]}>{task.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            ListHeaderComponent={
              messages.length > 0 ? (
                <View style={styles.inboxHint}>
                  <Ionicons name="information-circle-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.inboxHintText}>
                    Work is automatically submitted to your Inbox for approval
                  </Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              streamingContent || (isSending && !streamingContent) ? (
                <View style={styles.messageRow}>
                  <View
                    style={[
                      styles.messageAvatar,
                      { backgroundColor: deptColor + "20", borderColor: deptColor + "40" },
                    ]}
                  >
                    <Text style={[styles.messageAvatarText, { color: deptColor }]}>
                      {w.emoji}
                    </Text>
                  </View>
                  {streamingContent ? (
                    <View style={[styles.messageBubble, styles.messageBubbleAssistant]}>
                      <Text style={styles.messageTextAssistant} selectable>
                        {streamingContent}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.messageBubbleAssistant, styles.typingBubble]}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                      <Text style={styles.typingText}>Working on it...</Text>
                    </View>
                  )}
                </View>
              ) : null
            }
          />
        )}

        {/* Input */}
        <View
          style={[
            styles.inputRow,
            { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 8 },
          ]}
        >
          {hired && messages.length > 0 && (
            <Pressable
              style={styles.taskQuickBtn}
              onPress={() => setShowWorkModal(true)}
              disabled={isSending}
            >
              <Ionicons name="add" size={20} color={Colors.primary} />
            </Pressable>
          )}
          <TextInput
            style={styles.input}
            placeholder={
              hired
                ? `Ask ${w.name} anything or request specific work...`
                : `Hire ${w.name} to get started`
            }
            placeholderTextColor={Colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={hired && !isSending}
            maxLength={2000}
          />
          <Pressable
            style={[
              styles.sendBtn,
              (!inputText.trim() || !hired || isSending) && styles.sendBtnDisabled,
            ]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || !hired || isSending}
          >
            <Ionicons
              name="arrow-up"
              size={18}
              color={!inputText.trim() || !hired || isSending ? Colors.textMuted : Colors.background}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Request Work Modal */}
      <Modal
        visible={showWorkModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowWorkModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Request Work</Text>
              <Pressable onPress={() => setShowWorkModal(false)}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.modalSub}>
              {w.name} will create the actual deliverable and submit it to your Inbox.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <Text style={styles.modalSectionLabel}>Choose a task</Text>
              {w.taskTemplates.map((task) => (
                <Pressable
                  key={task.label}
                  style={[styles.modalTaskItem, { borderColor: deptColor + "30" }]}
                  onPress={() => handleGenerateWork(task.label, task.prompt)}
                  disabled={isGeneratingWork}
                >
                  <View style={[styles.taskIcon, { backgroundColor: deptColor + "15" }]}>
                    <Ionicons name="document-text" size={14} color={deptColor} />
                  </View>
                  <Text style={styles.modalTaskLabel}>{task.label}</Text>
                  <Ionicons name="arrow-forward" size={14} color={deptColor} />
                </Pressable>
              ))}

              <Text style={[styles.modalSectionLabel, { marginTop: 20 }]}>Or describe custom work</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Describe exactly what you need..."
                placeholderTextColor={Colors.textMuted}
                value={customWork}
                onChangeText={setCustomWork}
                multiline
                numberOfLines={3}
              />
              {customWork.trim().length > 0 && (
                <Pressable
                  style={[styles.customWorkBtn, isGeneratingWork && { opacity: 0.5 }]}
                  onPress={() => handleGenerateWork(customWork.trim(), customWork.trim())}
                  disabled={isGeneratingWork}
                >
                  {isGeneratingWork ? (
                    <ActivityIndicator size="small" color={Colors.background} />
                  ) : (
                    <>
                      <Ionicons name="flash" size={16} color={Colors.background} />
                      <Text style={styles.customWorkBtnText}>Create this work</Text>
                    </>
                  )}
                </Pressable>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  headerInfo: { flex: 1, gap: 1 },
  headerNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerName: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.text },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success },
  headerRole: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  workBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primaryDim,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
  },
  workBtnText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.primary },
  notHiredBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.warning + "15",
    borderBottomWidth: 1,
    borderBottomColor: Colors.warning + "30",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  notHiredText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.warning },
  hireInlineBtn: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
  },
  hireInlineBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.background },
  emptyContent: {
    padding: 24,
    paddingTop: 32,
    alignItems: "center",
  },
  workerIntroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginBottom: 12,
  },
  workerIntroEmoji: { fontSize: 28, fontFamily: "Inter_700Bold" },
  workerIntroName: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.text,
    marginBottom: 8,
  },
  deptPill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 100,
    marginBottom: 14,
  },
  deptPillText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  workerGreeting: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 28,
    maxWidth: 300,
    fontStyle: "italic",
  },
  tasksSection: { width: "100%", gap: 12 },
  tasksSectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  tasksSectionSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  tasksList: { gap: 8 },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  taskItemDisabled: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    opacity: 0.5,
  },
  taskIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  taskLabel: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.text,
  },
  notHiredInfo: { width: "100%", gap: 12 },
  notHiredInfoTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.textSecondary,
  },
  inboxHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  inboxHintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    flex: 1,
  },
  messageList: { padding: 16, paddingBottom: 8 },
  messageRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    alignItems: "flex-end",
  },
  messageRowUser: { flexDirection: "row-reverse" },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  messageAvatarText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  messageBubble: {
    maxWidth: "82%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageBubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleAssistant: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  typingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: "italic",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Inter_400Regular",
  },
  messageTextUser: { color: Colors.background },
  messageTextAssistant: { color: Colors.text },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  taskQuickBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryDim,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "90%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text },
  modalSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    marginBottom: 20,
  },
  modalScroll: { maxHeight: 480 },
  modalSectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  modalTaskItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    marginBottom: 8,
  },
  modalTaskLabel: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.text,
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 90,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  customWorkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 100,
    marginBottom: 8,
  },
  customWorkBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.background,
  },
});
