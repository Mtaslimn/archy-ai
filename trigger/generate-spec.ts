import { google } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { metadata, schemaTask } from "@trigger.dev/sdk";
import { put } from "@vercel/blob";

import { prisma } from "@/lib/prisma";
import { specRequestSchema } from "@/types/spec";

export const generateSpec = schemaTask({
  id: "generate-spec",
  schema: specRequestSchema.extend({ projectId: specRequestSchema.shape.roomId }),
  // Provider fallback is explicit; task retries can repeat quota-limited calls
  // and create duplicate artifacts if a later persistence step fails.
  retry: { maxAttempts: 1 },
  run: async (payload, { ctx }) => {
    const setStatus = (status: "processing" | "complete" | "error", message: string) => {
      metadata.set("status", status).set("message", message);
    };

    setStatus("processing", "Preparing the technical specification.");
    console.log("Spec generation started", { projectId: payload.projectId, attempt: ctx.attempt.number });

    try {
      // Fail before consuming provider quota or uploading a Blob if the worker
      // database credentials are missing or invalid.
      await prisma.$connect();
      const system = `You are Archy AI, a software architecture documentation specialist. Write a complete, clear technical specification in Markdown based on the supplied architecture canvas and conversation. Use only supported details; identify unspecified choices as assumptions or open questions. Include an overview, requirements, components, data flow, interfaces, data model, security and reliability considerations, and deployment/operations where relevant. Return plain Markdown without a JSON wrapper.`;
      const prompt = `Project ID: ${payload.projectId}\n\nConversation context:\n${payload.chatHistory.map((message) => `${message.role ?? message.sender ?? "user"}: ${message.content}`).join("\n\n")}\n\nCanvas nodes:\n${JSON.stringify(payload.nodes)}\n\nCanvas edges:\n${JSON.stringify(payload.edges)}`;
      const options = {
        system,
        prompt,
      };

      let text: string;
      try {
        const groqApiKey = process.env.GROQ_API_KEY;
        if (!groqApiKey) throw new Error("GROQ_API_KEY is not configured.");
        setStatus("processing", "Generating the specification with Groq GPT OSS 120B.");
        const groq = createGroq({ apiKey: groqApiKey });
        ({ text } = await generateText({
          ...options,
          model: groq(process.env.GROQ_SPEC_MODEL || "openai/gpt-oss-120b"),
          maxRetries: 0,
          maxOutputTokens: 8_000,
          abortSignal: AbortSignal.timeout(90_000),
        }));
      } catch (groqError) {
        console.warn("Groq spec generation failed; trying Gemini", groqError);
        try {
          setStatus("processing", "Groq is unavailable. Trying Gemini.");
          ({ text } = await generateText({
            ...options,
            model: google("gemini-3.8-flash"),
            maxRetries: 0,
            maxOutputTokens: 8_000,
            abortSignal: AbortSignal.timeout(60_000),
          }));
        } catch (geminiError) {
          const apiKey = process.env.OPENROUTER_API_KEY;
          if (!apiKey) {
            throw new Error("Groq and Gemini spec generation failed, and OPENROUTER_API_KEY is not configured for the final fallback.", { cause: geminiError });
          }
          console.warn("Gemini spec generation failed; trying the configured OpenRouter spec model", geminiError);
          const openrouter = createOpenRouter({ apiKey });
          setStatus("processing", "Groq and Gemini are unavailable. Trying the configured OpenRouter spec model.");
          ({ text } = await generateText({
            ...options,
            maxRetries: 0,
            maxOutputTokens: 8_000,
            abortSignal: AbortSignal.timeout(90_000),
            model: openrouter(process.env.OPENROUTER_SPEC_MODEL || "openrouter/free", {
              provider: { require_parameters: true, allow_fallbacks: true },
            }),
          }));
        }
      }

      if (!text.trim()) throw new Error("The model returned an empty specification.");
      const content = text.trim();
      setStatus("processing", "Saving the generated specification.");
      const specId = crypto.randomUUID();
      const blob = await put(`specs/${payload.projectId}/${specId}.md`, content, {
        access: "private",
        addRandomSuffix: false,
        contentType: "text/markdown; charset=utf-8",
      });
      await prisma.projectSpec.create({
        data: { id: specId, projectId: payload.projectId, filePath: blob.url },
      });
      setStatus("complete", "Technical specification generated.");
      console.log("Spec generation completed", { projectId: payload.projectId, specId, characters: content.length });
      return { specId };
    } catch (error) {
      setStatus("error", "Spec generation failed.");
      console.error("Spec generation failed", { projectId: payload.projectId, error });
      throw error;
    }
  },
});
