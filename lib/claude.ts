const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
console.log("API KEY:", process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY);

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

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        { role: "user", content: userMessage },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to get response from Claude");
  }

  return data.content[0].text;
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

Create a complete, professional, ready-to-use deliverable for the task given. Return ONLY a JSON object with two fields: "title" (short descriptive title of the work) and "content" (the complete finished work). No explanation. No preamble. Just the JSON.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: taskDescription }],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to generate work");
  }

  const text = data.content[0].text;
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