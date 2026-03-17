import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
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
  setCompany: (profile: CompanyProfile) => Promise<void>;
  onboardingComplete: boolean;
  setOnboardingComplete: (val: boolean) => Promise<void>;
  hiredWorkers: string[];
  hireWorker: (workerId: string) => Promise<void>;
  fireWorker: (workerId: string) => Promise<void>;
  isHired: (workerId: string) => boolean;
  inboxItems: InboxItem[];
  addInboxItem: (item: InboxItem) => Promise<void>;
  approveItem: (id: string) => Promise<void>;
  rejectItem: (id: string) => Promise<void>;
  pendingCount: number;
  conversations: Record<string, WorkerConversation>;
  addMessage: (workerId: string, message: ChatMessage) => Promise<void>;
  getConversation: (workerId: string) => WorkerConversation | null;
  isLoaded: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [company, setCompanyState] = useState<CompanyProfile | null>(null);
  const [onboardingComplete, setOnboardingCompleteState] = useState(false);
  const [hiredWorkers, setHiredWorkers] = useState<string[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [conversations, setConversations] = useState<Record<string, WorkerConversation>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Load user data from Firestore when user logs in
  useEffect(() => {
    if (!user) {
      setCompanyState(null);
      setOnboardingCompleteState(false);
      setHiredWorkers([]);
      setInboxItems([]);
      setConversations({});
      setIsLoaded(false);
      return;
    }
    loadFromFirestore();
  }, [user]);

  // Listen to inbox in real time
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "inbox"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: InboxItem[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as InboxItem[];
      setInboxItems(items);
    });
    return unsubscribe;
  }, [user]);

  async function loadFromFirestore() {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.company) setCompanyState(data.company);
        if (data.onboardingComplete) setOnboardingCompleteState(data.onboardingComplete);
        if (data.hiredWorkers) setHiredWorkers(data.hiredWorkers);
        if (data.conversations) setConversations(data.conversations);
      }
    } catch (e) {
      console.error("Failed to load from Firestore:", e);
    } finally {
      setIsLoaded(true);
    }
  }

  const setCompany = async (profile: CompanyProfile) => {
    if (!user) return;
    setCompanyState(profile);
    await setDoc(doc(db, "users", user.uid), { company: profile }, { merge: true });
  };

  const setOnboardingComplete = async (val: boolean) => {
    if (!user) return;
    setOnboardingCompleteState(val);
    await setDoc(doc(db, "users", user.uid), { onboardingComplete: val }, { merge: true });
  };

  const hireWorker = async (workerId: string) => {
    if (!user) return;
    const updated = [...hiredWorkers, workerId];
    setHiredWorkers(updated);
    await setDoc(doc(db, "users", user.uid), { hiredWorkers: updated }, { merge: true });
  };

  const fireWorker = async (workerId: string) => {
    if (!user) return;
    const updated = hiredWorkers.filter((id) => id !== workerId);
    setHiredWorkers(updated);
    await setDoc(doc(db, "users", user.uid), { hiredWorkers: updated }, { merge: true });
  };

  const isHired = (workerId: string) => hiredWorkers.includes(workerId);

  const addInboxItem = async (item: InboxItem) => {
    if (!user) return;
    await addDoc(collection(db, "users", user.uid, "inbox"), {
      ...item,
      createdAt: new Date().toISOString(),
    });
  };

  const approveItem = async (id: string) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid, "inbox", id), {
      status: "approved",
    });
  };

  const rejectItem = async (id: string) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid, "inbox", id), {
      status: "rejected",
    });
  };

  const addMessage = async (workerId: string, message: ChatMessage) => {
    if (!user) return;
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
      setDoc(
        doc(db, "users", user.uid),
        { conversations: updated },
        { merge: true }
      );
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