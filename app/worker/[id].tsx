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

const QUICK_TASKS = [
  "What work can you do for me this week?",
  "Show me what you've been working on",
  "Give me something ready to review",
  "What do you need from me to get started?",
];

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

  const deptColor = DEPT_COLORS[worker.department];

  async function sendMessage(text: string) {
    if (!text.trim() || isSending) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    await addMessage(id, userMsg);
    setInputText("");
    setIsSending(true);
    setStreamingContent("");

    const systemPrompt = company
      ? buildWorkerSystemPrompt(worker, company)
      : worker.systemPromptTemplate;

    const allMessages = [...messages, userMsg];
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
                  id: (Date.now() + 1).toString(),
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

  async function handleGenerateWork() {
    if (!workTitle.trim() || isGeneratingWork) return;
    setIsGeneratingWork(true);

    const systemPrompt = company
      ? buildWorkerSystemPrompt(worker, company)
      : worker.systemPromptTemplate;

    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}api/worker/generate-work`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerSystemPrompt: systemPrompt,
          taskPrompt: `Please create the following for me to review: ${workTitle.trim()}. 
Format it properly and make it ready for approval. This will be submitted to the approval inbox.`,
        }),
      });

      if (!response.ok) throw new Error("Failed");
      const data = await response.json();

      const inboxItem: InboxItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        workerId: worker.id,
        workerName: worker.name,
        workerRole: worker.role,
        title: workTitle.trim(),
        content: data.content,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      await addInboxItem(inboxItem);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setShowWorkModal(false);
      setWorkTitle("");

      const notifMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: `I've submitted "${workTitle}" to your Inbox for review. Head there to approve it when you're ready.`,
        timestamp: new Date().toISOString(),
      };
      await addMessage(id, notifMsg);
    } catch (err) {
      console.error("Generate work error:", err);
    } finally {
      setIsGeneratingWork(false);
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
                {worker.emoji}
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
            >
              {item.content}
            </Text>
          </View>
        </View>
      );
    },
    [deptColor, worker.emoji]
  );

  const allDisplayMessages = [...messages];

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
            {worker.emoji}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.headerNameRow}>
            <Text style={styles.headerName}>{worker.name}</Text>
            {hired && <View style={styles.activeDot} />}
          </View>
          <Text style={styles.headerRole}>{worker.role}</Text>
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
            Hire {worker.name} to start working together
          </Text>
          <Pressable
            style={styles.hireInlineBtn}
            onPress={async () => {
              await hireWorker(worker.id);
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
        {/* Messages */}
        {allDisplayMessages.length === 0 && !streamingContent ? (
          <ScrollView
            contentContainerStyle={styles.emptyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Worker intro */}
            <View
              style={[
                styles.workerIntroAvatar,
                { backgroundColor: deptColor + "15", borderColor: deptColor + "30" },
              ]}
            >
              <Text style={[styles.workerIntroEmoji, { color: deptColor }]}>
                {worker.emoji}
              </Text>
            </View>
            <Text style={styles.workerIntroName}>{worker.name}</Text>
            <View style={[styles.deptPill, { backgroundColor: deptColor + "15" }]}>
              <Text style={[styles.deptPillText, { color: deptColor }]}>
                {worker.department} · {worker.role}
              </Text>
            </View>
            <Text style={styles.workerGreeting}>{worker.greeting}</Text>
            <View style={styles.skillsRow}>
              {worker.skills.map((skill) => (
                <View key={skill} style={styles.skillPill}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
            {/* Quick prompts */}
            <View style={styles.quickPromptsSection}>
              <Text style={styles.quickPromptsLabel}>Quick start</Text>
              <View style={styles.quickPrompts}>
                {QUICK_TASKS.map((task) => (
                  <Pressable
                    key={task}
                    style={styles.quickPrompt}
                    onPress={() => sendMessage(task)}
                    disabled={!hired}
                  >
                    <Text style={styles.quickPromptText}>{task}</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={12}
                      color={Colors.primary}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>
        ) : (
          <FlatList
            ref={flatListRef}
            data={allDisplayMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            ListFooterComponent={
              streamingContent || isSending ? (
                <View style={styles.messageRow}>
                  <View
                    style={[
                      styles.messageAvatar,
                      {
                        backgroundColor: deptColor + "20",
                        borderColor: deptColor + "40",
                      },
                    ]}
                  >
                    <Text
                      style={[styles.messageAvatarText, { color: deptColor }]}
                    >
                      {worker.emoji}
                    </Text>
                  </View>
                  {streamingContent ? (
                    <View style={styles.messageBubbleAssistant}>
                      <Text style={styles.messageTextAssistant}>
                        {streamingContent}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.messageBubbleAssistant, styles.typingBubble]}>
                      <ActivityIndicator size="small" color={Colors.primary} />
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
            {
              paddingBottom:
                Platform.OS === "web" ? 34 : insets.bottom + 8,
            },
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder={
              hired
                ? `Message ${worker.name}...`
                : `Hire ${worker.name} to chat`
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
              color={
                !inputText.trim() || !hired || isSending
                  ? Colors.textMuted
                  : Colors.background
              }
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
              <Text style={styles.modalTitle}>Request Work</Text>
              <Text style={styles.modalSub}>
                {worker.name} will create this and submit it to your Inbox for review.
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder={`e.g. "3 Instagram posts for this week"`}
                placeholderTextColor={Colors.textMuted}
                value={workTitle}
                onChangeText={setWorkTitle}
                autoFocus
                returnKeyType="done"
              />
              <View style={styles.modalActions}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => {
                    setShowWorkModal(false);
                    setWorkTitle("");
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.generateBtn,
                    (!workTitle.trim() || isGeneratingWork) && { opacity: 0.5 },
                  ]}
                  onPress={handleGenerateWork}
                  disabled={!workTitle.trim() || isGeneratingWork}
                >
                  {isGeneratingWork ? (
                    <ActivityIndicator size="small" color={Colors.background} />
                  ) : (
                    <Text style={styles.generateBtnText}>Generate</Text>
                  )}
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
  headerAvatarText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  headerInfo: {
    flex: 1,
    gap: 1,
  },
  headerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.text,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  headerRole: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  workBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primaryDim,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
  },
  workBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.primary,
  },
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
  notHiredText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.warning,
  },
  hireInlineBtn: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
  },
  hireInlineBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.background,
  },
  emptyContent: {
    flex: 1,
    alignItems: "center",
    padding: 24,
    paddingTop: 40,
  },
  workerIntroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginBottom: 14,
  },
  workerIntroEmoji: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
  },
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
    marginBottom: 16,
  },
  deptPillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  workerGreeting: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 20,
    maxWidth: 300,
    fontStyle: "italic",
  },
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    justifyContent: "center",
    marginBottom: 32,
  },
  skillPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skillText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  quickPromptsSection: {
    width: "100%",
    gap: 10,
  },
  quickPromptsLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  quickPrompts: {
    gap: 8,
  },
  quickPrompt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickPromptText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  messageList: {
    padding: 16,
    gap: 12,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    alignItems: "flex-end",
  },
  messageRowUser: {
    flexDirection: "row-reverse",
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  messageAvatarText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  messageBubble: {
    maxWidth: "78%",
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
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  messageTextUser: {
    color: Colors.background,
  },
  messageTextAssistant: {
    color: Colors.text,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
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
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.text,
    marginBottom: 6,
  },
  modalSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    marginBottom: 20,
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
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  generateBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  generateBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.background,
  },
});
