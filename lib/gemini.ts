const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

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

async function callGemini(
  systemPrompt: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: 1024, temperature: 0.8 },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Gemini API error");
  }

  return data.candidates[0].content.parts[0].text;
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

  return await callGemini(systemPrompt, messages);
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

  const text = await callGemini(systemPrompt, [
    { role: "user", content: taskDescription },
  ]);

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