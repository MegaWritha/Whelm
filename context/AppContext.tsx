import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CompanyProfile } from "@/data/workers";

export interface InboxItem {
  id: string;
  workerId: string;
  workerName: string;
  workerRole: string;
  title: string;
  content: string;
  platform?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  urgent?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface WorkerConversation {
  workerId: string;
  messages: ChatMessage[];
  lastMessageAt: string;
}

interface AppContextValue {
  company: CompanyProfile | null;
  setCompany: (profile: CompanyProfile) => void;
  onboardingComplete: boolean;
  setOnboardingComplete: (val: boolean) => void;
  hiredWorkers: string[];
  hireWorker: (workerId: string) => void;
  fireWorker: (workerId: string) => void;
  isHired: (workerId: string) => boolean;
  inboxItems: InboxItem[];
  addInboxItem: (item: InboxItem) => void;
  approveItem: (id: string) => void;
  rejectItem: (id: string) => void;
  pendingCount: number;
  conversations: Record<string, WorkerConversation>;
  addMessage: (workerId: string, message: ChatMessage) => void;
  getConversation: (workerId: string) => WorkerConversation | null;
  isLoaded: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEYS = {
  COMPANY: "whelm:company",
  ONBOARDING: "whelm:onboarding",
  HIRED: "whelm:hired_workers",
  INBOX: "whelm:inbox",
  CONVERSATIONS: "whelm:conversations",
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [company, setCompanyState] = useState<CompanyProfile | null>(null);
  const [onboardingComplete, setOnboardingCompleteState] = useState(false);
  const [hiredWorkers, setHiredWorkers] = useState<string[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [conversations, setConversations] = useState<Record<string, WorkerConversation>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadFromStorage();
  }, []);

  async function loadFromStorage() {
    try {
      const [companyData, onboarding, hired, inbox, convos] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.COMPANY),
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING),
        AsyncStorage.getItem(STORAGE_KEYS.HIRED),
        AsyncStorage.getItem(STORAGE_KEYS.INBOX),
        AsyncStorage.getItem(STORAGE_KEYS.CONVERSATIONS),
      ]);

      if (companyData) setCompanyState(JSON.parse(companyData));
      if (onboarding) setOnboardingCompleteState(JSON.parse(onboarding));
      if (hired) setHiredWorkers(JSON.parse(hired));
      if (inbox) setInboxItems(JSON.parse(inbox));
      if (convos) setConversations(JSON.parse(convos));
    } catch (e) {
      console.error("Failed to load from storage:", e);
    } finally {
      setIsLoaded(true);
    }
  }

  const setCompany = async (profile: CompanyProfile) => {
    setCompanyState(profile);
    await AsyncStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(profile));
  };

  const setOnboardingComplete = async (val: boolean) => {
    setOnboardingCompleteState(val);
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING, JSON.stringify(val));
  };

  const hireWorker = async (workerId: string) => {
    const updated = [...hiredWorkers, workerId];
    setHiredWorkers(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.HIRED, JSON.stringify(updated));
  };

  const fireWorker = async (workerId: string) => {
    const updated = hiredWorkers.filter((id) => id !== workerId);
    setHiredWorkers(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.HIRED, JSON.stringify(updated));
  };

  const isHired = (workerId: string) => hiredWorkers.includes(workerId);

  const addInboxItem = async (item: InboxItem) => {
    const updated = [item, ...inboxItems];
    setInboxItems(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.INBOX, JSON.stringify(updated));
  };

  const approveItem = async (id: string) => {
    const updated = inboxItems.map((item) =>
      item.id === id ? { ...item, status: "approved" as const } : item
    );
    setInboxItems(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.INBOX, JSON.stringify(updated));
  };

  const rejectItem = async (id: string) => {
    const updated = inboxItems.map((item) =>
      item.id === id ? { ...item, status: "rejected" as const } : item
    );
    setInboxItems(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.INBOX, JSON.stringify(updated));
  };

  const addMessage = async (workerId: string, message: ChatMessage) => {
    setConversations((prev) => {
      const existing = prev[workerId];
      const updated = {
        ...prev,
        [workerId]: {
          workerId,
          messages: [...(existing?.messages || []), message],
          lastMessageAt: message.timestamp,
        },
      };
      AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updated));
      return updated;
    });
  };

  const getConversation = (workerId: string) => conversations[workerId] || null;

  const pendingCount = useMemo(
    () => inboxItems.filter((i) => i.status === "pending").length,
    [inboxItems]
  );

  const value = useMemo(
    () => ({
      company,
      setCompany,
      onboardingComplete,
      setOnboardingComplete,
      hiredWorkers,
      hireWorker,
      fireWorker,
      isHired,
      inboxItems,
      addInboxItem,
      approveItem,
      rejectItem,
      pendingCount,
      conversations,
      addMessage,
      getConversation,
      isLoaded,
    }),
    [company, onboardingComplete, hiredWorkers, inboxItems, conversations, isLoaded]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
