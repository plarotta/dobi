import { getModel } from "@mariozechner/pi-ai";
import type { DobiConfig } from "./setup.js";

export function getConfiguredModel(config: DobiConfig) {
  // Set the provider's env var so pi-ai can pick it up
  const envVarMap: Record<string, string> = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    google: "GOOGLE_API_KEY",
    xai: "XAI_API_KEY",
    groq: "GROQ_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
  };
  const envVar = envVarMap[config.provider];
  if (envVar && !process.env[envVar]) {
    process.env[envVar] = config.apiKey;
  }

  return getModel(config.provider as any, config.model as any);
}
