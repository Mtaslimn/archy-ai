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
      const nodeLabel = (node: (typeof payload.nodes)[number] | undefined, fallback: string) =>
        typeof node?.data.label === "string" && node.data.label.trim() ? node.data.label.trim() : fallback;
      const nodesById = new Map(payload.nodes.map((node) => [node.id, node]));
      const components = payload.nodes.map((node) => `- ${nodeLabel(node, node.id)} (${typeof node.data.shape === "string" ? node.data.shape : "component"})`).join("\n");
      const connections = payload.edges.map((edge) => {
        const source = nodeLabel(nodesById.get(edge.source), edge.source);
        const target = nodeLabel(nodesById.get(edge.target), edge.target);
        const dataLabel = typeof edge.data?.label === "string" ? edge.data.label.trim() : "";
        const topLevelLabel = typeof edge.label === "string" ? edge.label.trim() : "";
        const label = dataLabel || topLevelLabel || "unlabeled connection";
        return `- ${source} -> ${target} : ${label}`;
      }).join("\n");
      const system = `You are Archy AI, documenting a software architecture canvas. Document ONLY what is on the canvas. Every component in the spec must correspond to a canvas node and every interaction to a canvas edge, using its label. Do not add infrastructure that is not on the canvas (for example, gateways, caches, queues, load balancers, Kubernetes, CDNs, search, or monitoring stacks). If something not on the canvas seems necessary, mention it in one line under "Assumptions and open questions" and do not design it. Do not invent numeric targets (uptime, request rates, latency) or version/date metadata unless the user stated them. Scale the length to the canvas: a five-node canvas should produce roughly 1-2 pages. Use these sections only when the canvas supports them: Overview, Components (table of name, purpose, responsibilities), Data flows (from the edges), Data model (only entities the canvas implies), Assumptions and open questions. Add security or deployment notes only when the canvas contains nodes that relate to them, and keep them short. Keep tables to at most 4 columns. Do not include Mermaid or ASCII diagrams; describe flows as numbered lists. Return plain Markdown without a JSON wrapper.`;
      const userMessages = payload.chatHistory.filter((message) => message.role === "user");
      const prompt = `Conversation context (user messages only):\n${userMessages.map((message) => message.content).join("\n\n") || "None"}\n\nComponents:\n${components || "None"}\n\nConnections:\n${connections || "None"}`;
      const options = {
        system,
        prompt,
      };

      let text: string;
      let provider = "groq";
      let finishReason: string | undefined;
      try {
        const groqApiKey = process.env.GROQ_API_KEY;
        if (!groqApiKey) throw new Error("GROQ_API_KEY is not configured.");
        setStatus("processing", "Generating the specification with Groq GPT OSS 120B.");
        const groq = createGroq({ apiKey: groqApiKey });
        const result = await generateText({
          ...options,
          model: groq(process.env.GROQ_SPEC_MODEL || "openai/gpt-oss-120b"),
          maxRetries: 0,
          maxOutputTokens: 8_000,
          abortSignal: AbortSignal.timeout(90_000),
        });
        text = result.text;
        finishReason = result.finishReason;
      } catch (groqError) {
        console.warn("Groq spec generation failed; trying Gemini", groqError);
        try {
          setStatus("processing", "Groq is unavailable. Trying Gemini.");
          provider = "gemini";
          const result = await generateText({
            ...options,
            model: google("gemini-3.8-flash"),
            maxRetries: 0,
            maxOutputTokens: 8_000,
            abortSignal: AbortSignal.timeout(60_000),
          });
          text = result.text;
          finishReason = result.finishReason;
        } catch (geminiError) {
          const apiKey = process.env.OPENROUTER_API_KEY;
          if (!apiKey) {
            throw new Error("Groq and Gemini spec generation failed, and OPENROUTER_API_KEY is not configured for the final fallback.", { cause: geminiError });
          }
          console.warn("Gemini spec generation failed; trying the configured OpenRouter spec model", geminiError);
          const openrouter = createOpenRouter({ apiKey });
          setStatus("processing", "Groq and Gemini are unavailable. Trying the configured OpenRouter spec model.");
          provider = "openrouter";
          const result = await generateText({
            ...options,
            maxRetries: 0,
            maxOutputTokens: 8_000,
            abortSignal: AbortSignal.timeout(90_000),
            model: openrouter(process.env.OPENROUTER_SPEC_MODEL || "openrouter/free", {
              provider: { require_parameters: true, allow_fallbacks: true },
            }),
          });
          text = result.text;
          finishReason = result.finishReason;
        }
      }

      if (!text.trim()) throw new Error("The model returned an empty specification.");
      const content = text.trim();
      if (finishReason === "length") console.warn("Spec generation may be truncated", { projectId: payload.projectId, provider, finishReason, characters: content.length });
      metadata.set("provider", provider).set("finishReason", finishReason ?? "").set("characters", content.length);
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
      console.log("Spec generation completed", { projectId: payload.projectId, specId, provider, finishReason, characters: content.length });
      return { specId };
    } catch (error) {
      setStatus("error", "Spec generation failed.");
      console.error("Spec generation failed", { projectId: payload.projectId, error });
      throw error;
    }
  },
});
