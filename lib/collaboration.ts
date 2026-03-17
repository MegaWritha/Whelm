import { generateImage } from "./imageGen";
import { askGroq } from "./groq";

export interface CollaborationRequest {
  fromWorker: string;
  toWorker: string;
  task: string;
  context: string;
}

export interface CollaborationResult {
  fromWorker: string;
  toWorker: string;
  deliverable: string;
  imageUrl?: string;
}

// Worker collaboration map — who can call who
export const COLLABORATION_MAP: Record<string, string[]> = {
  zara: ["marcus", "leo"],        // Social Media → Graphic Designer, Video Writer
  tunde: ["zara", "kemi"],        // Marketing → Social Media, Copywriter
  kemi: ["marcus"],               // Copywriter → Graphic Designer
  jade: ["victor", "tunde"],      // Business Analyst → Investor Relations, Marketing
  alex: ["zara", "kemi", "tunde", "omar"], // Project Manager → coordinates many
  felix: ["kemi", "marcus"],      // Email Marketing → Copywriter, Graphic Designer
};

// Worker system prompts for collaboration
const WORKER_PROMPTS: Record<string, string> = {
  marcus: "You are Marcus, Graphic Designer. You produce detailed AI image generation prompts, Canva briefs, and visual concepts. Output ready-to-use visual briefs only.",
  leo: "You are Leo, Video Script Writer. You write complete video scripts with hooks, timing notes, and CTAs. Output ready-to-film scripts only.",
  kemi: "You are Kemi, Copywriter. You write polished copy for any channel. Output finished copy only.",
  zara: "You are Zara, Social Media Manager. You write complete social media posts with captions, hashtags and CTAs. Output finished posts only.",
  tunde: "You are Tunde, Marketing Strategist. You build detailed marketing strategies and campaign briefs. Output actionable plans only.",
  victor: "You are Victor, Investor Relations. You produce pitch documents and investor materials. Output professional documents only.",
  omar: "You are Omar, Finance Assistant. You produce financial documents and reports. Output ready-to-use documents only.",
};

// One worker calls another
export const collaborate = async (
  request: CollaborationRequest
): Promise<CollaborationResult> => {
  const workerPrompt = WORKER_PROMPTS[request.toWorker] ||
    `You are a professional ${request.toWorker}. Produce ready-to-use work only.`;

  const fullPrompt = `${workerPrompt}

You have been called by ${request.fromWorker} to help with this task:

CONTEXT: ${request.context}

YOUR SPECIFIC TASK: ${request.task}

Produce the complete deliverable now. No explanation. Just the work.

At the very end of your response, write one line starting with:
IMAGE PROMPT: [a detailed image generation prompt for this deliverable]`;

  const deliverable = await askGroq(fullPrompt, []);

  // Extract image prompt if Marcus is responding
  let imageUrl: string | null = null;
  if (request.toWorker === "marcus") {
    const imagePromptMatch = deliverable.match(/IMAGE PROMPT:\s*(.+)/i);
    if (imagePromptMatch) {
      const imagePrompt = imagePromptMatch[1].trim();
      imageUrl = await generateImage(imagePrompt);
    }
  }

  return {
    fromWorker: request.fromWorker,
    toWorker: request.toWorker,
    deliverable,
    imageUrl: imageUrl || undefined,
  };
};

// Check if a message needs collaboration
export const needsCollaboration = (
  workerName: string,
  message: string
): string | null => {
  const lower = message.toLowerCase();
  const workerId = workerName.toLowerCase();

  if (workerId === "zara") {
    if (lower.includes("graphic") || lower.includes("image") || 
        lower.includes("visual") || lower.includes("design")) {
      return "marcus";
    }
    if (lower.includes("video") || lower.includes("reel") || 
        lower.includes("tiktok") || lower.includes("script")) {
      return "leo";
    }
  }

  if (workerId === "tunde") {
    if (lower.includes("copy") || lower.includes("write") || 
        lower.includes("email") || lower.includes("newsletter")) {
      return "kemi";
    }
  }

  if (workerId === "kemi") {
    if (lower.includes("graphic") || lower.includes("image") || 
        lower.includes("visual")) {
      return "marcus";
    }
  }

  return null;
};