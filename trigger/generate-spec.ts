import { google } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { metadata, schemaTask } from "@trigger.dev/sdk";

import { specRequestSchema } from "@/types/spec";

export const generateSpec = schemaTask({
  id: "generate-spec",
  schema: specRequestSchema.extend({ projectId: specRequestSchema.shape.roomId }),
  retry: { maxAttempts: 2 },
  run: async (payload, { ctx }) => {
    const setStatus = (status: "processing" | "complete" | "error", message: string) => {
      metadata.set("status", status).set("message", message);
    };

    setStatus("processing", "Generating the technical specification.");
    console.log("Spec generation started", { projectId: payload.projectId, attempt: ctx.attempt.number });

    try {
      const system = `You are Archy AI, a software architecture documentation specialist. Write a complete, clear technical specification in Markdown based on the supplied architecture canvas and conversation. Use only supported details; identify unspecified choices as assumptions or open questions. Include an overview, requirements, components, data flow, interfaces, data model, security and reliability considerations, and deployment/operations where relevant. Return plain Markdown without a JSON wrapper.`;
      const prompt = `Project ID: ${payload.projectId}\n\nConversation context:\n${payload.chatHistory.map((message) => `${message.role ?? message.sender ?? "user"}: ${message.content}`).join("\n\n")}\n\nCanvas nodes:\n${JSON.stringify(payload.nodes)}\n\nCanvas edges:\n${JSON.stringify(payload.edges)}`;
      const options = {
        system,
        prompt,
        abortSignal: AbortSignal.timeout(120_000),
      };

      let text: string;
      try {
        ({ text } = await generateText({ ...options, model: google("gemini-3.8-flash") }));
      } catch (primaryError) {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          throw new Error("Gemini spec generation failed and OPENROUTER_API_KEY is not configured for the OpenRouter fallback.", { cause: primaryError });
        }
        console.warn("Gemini 3.8 Flash failed; retrying spec generation with OpenRouter Qwen3.8 27B Free", primaryError);
        const openrouter = createOpenRouter({ apiKey });
        ({ text } = await generateText({
          ...options,
          model: openrouter("qwen/qwen3.8-27b:free", {
            provider: { require_parameters: true, allow_fallbacks: true },
          }),
        }));
      }

      if (!text.trim()) throw new Error("The model returned an empty specification.");
      setStatus("complete", "Technical specification generated.");
      console.log("Spec generation completed", { projectId: payload.projectId, characters: text.length });
      return { content: text.trim() };
    } catch (error) {
      setStatus("error", "Spec generation failed.");
      console.error("Spec generation failed", { projectId: payload.projectId, error });
      throw error;
    }
  },
});
