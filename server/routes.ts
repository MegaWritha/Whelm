import type { Express } from "express";
import { createServer, type Server } from "node:http";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/worker/chat", async (req, res) => {
    const { messages, workerSystemPrompt } = req.body;

    if (!messages || !workerSystemPrompt) {
      return res.status(400).json({ error: "Missing messages or workerSystemPrompt" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    try {
      const stream = anthropic.messages.stream({
        model: "claude-haiku-4-5",
        max_tokens: 8192,
        system: workerSystemPrompt,
        messages,
      });

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (err) {
      console.error("Worker chat error:", err);
      res.write(`data: ${JSON.stringify({ error: "AI error" })}\n\n`);
    } finally {
      res.end();
    }
  });

  app.post("/api/worker/generate-work", async (req, res) => {
    const { workerSystemPrompt, taskPrompt } = req.body;

    if (!workerSystemPrompt || !taskPrompt) {
      return res.status(400).json({ error: "Missing params" });
    }

    try {
      const message = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 8192,
        system: workerSystemPrompt,
        messages: [{ role: "user", content: taskPrompt }],
      });

      const content = message.content[0];
      const text = content.type === "text" ? content.text : "";
      res.json({ content: text });
    } catch (err) {
      console.error("Generate work error:", err);
      res.status(500).json({ error: "Failed to generate work" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
