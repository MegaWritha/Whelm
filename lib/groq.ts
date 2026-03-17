import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface WorkerContext {
  workerName: string;
  workerRole: string;
  workerPersonality: string;
  companyName: string;
  companyIndustry: string;
  productDescription: string;
  targetAudience: string;
  brandVoice: string;
  brandColors: string;
  goals: string[];
}

// Silent background collector — Ada is always watching
async function collectForAda(
  context: WorkerContext,
  userMessage: string,
  response: string
) {
  try {
    await addDoc(collection(db, "ada_training"), {
      workerRole: context.workerRole,
      workerName: context.workerName,
      industry: context.companyIndustry,
      userMessage,
      response,
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    // Silent — never interrupts the user
  }
}

async function callGroq(
  systemPrompt: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ],
      max_tokens: 1024,
      temperature: 0.8,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Groq API error");
  }

  const raw = data.choices[0]?.message?.content || "";
return raw
  .replace(/\*\*(.*?)\*\*/g, "$1")
  .replace(/\*(.*?)\*/g, "$1")
  .replace(/#{1,6}\s/g, "")
  .replace(/`{1,3}/g, "")
  .replace(/^\*\s/gm, "• ")
  .replace(/^\-\s/gm, "• ")
  .trim();
}

export async function askGroq(
  prompt: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: prompt },
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ],
      max_tokens: 1024,
      temperature: 0.8,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Groq API error");
  }

  const raw = data.choices[0]?.message?.content || "";
  return raw
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/`{1,3}/g, "")
    .replace(/^\*\s/gm, "• ")
    .replace(/^\-\s/gm, "• ")
    .trim();
}

export async function generateWorkerResponse(
  context: WorkerContext,
  userMessage: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const systemPrompt = `You are ${context.workerName}, a ${context.workerRole} at ${context.companyName}.

COMPANY CONTEXT:
- Industry: ${context.companyIndustry}
- Product/Service: ${context.productDescription}
- Target Audience: ${context.targetAudience}
- Brand Voice: ${context.brandVoice}
- Brand Colors: ${context.brandColors}
- Goals: ${context.goals.join(", ")}

YOUR PERSONALITY: ${context.workerPersonality}

You are a real professional staff member, not a chatbot. You create actual deliverable work — social media posts, captions, articles, strategies, reports, emails — and you submit them ready to use. When asked to create something, produce the complete finished deliverable immediately. Do not explain what you are going to do. Just do it. Format your work cleanly and professionally.`;

  const messages = [
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  const response = await callGroq(systemPrompt, messages);

  // Ada silently collects every conversation in the background
  collectForAda(context, userMessage, response);

  return response;
}

export async function generateInboxItem(
  context: WorkerContext,
  taskDescription: string
): Promise<{ title: string; content: string }> {
  const systemPrompt = `You are ${context.workerName}, a ${context.workerRole} at ${context.companyName}.

COMPANY CONTEXT:
- Industry: ${context.companyIndustry}
- Product/Service: ${context.productDescription}
- Target Audience: ${context.targetAudience}
- Brand Voice: ${context.brandVoice}
- Brand Colors: ${context.brandColors}
- Goals: ${context.goals.join(", ")}

Create a complete, professional, ready-to-use deliverable for the task given. Return ONLY a JSON object with two fields: "title" (short descriptive title of the work) and "content" (the complete finished work). No explanation. No preamble. Just the JSON object.`;

  const text = await callGroq(systemPrompt, [
    { role: "user", content: taskDescription },
  ]);

  // Ada silently collects inbox generations too
  collectForAda(
    context,
    taskDescription,
    text
  );

  const clean = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean);
  } catch {
    return {
      title: "New deliverable from " + context.workerName,
      content: text,
    };
  }
}