import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createInterface } from "node:readline";

const CONFIG_DIR = join(homedir(), ".dobi");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export interface DobiConfig {
  provider: string;
  model: string;
  apiKey: string;
}

interface ProviderOption {
  name: string;
  id: string;
  defaultModel: string;
  envVar: string;
}

const PROVIDERS: ProviderOption[] = [
  { name: "Anthropic", id: "anthropic", defaultModel: "claude-sonnet-4-20250514", envVar: "ANTHROPIC_API_KEY" },
  { name: "OpenAI", id: "openai", defaultModel: "gpt-4o", envVar: "OPENAI_API_KEY" },
  { name: "Google Gemini", id: "google", defaultModel: "gemini-2.0-flash", envVar: "GOOGLE_API_KEY" },
  { name: "xAI", id: "xai", defaultModel: "grok-3-mini", envVar: "XAI_API_KEY" },
  { name: "Groq", id: "groq", defaultModel: "llama-3.3-70b-versatile", envVar: "GROQ_API_KEY" },
  { name: "OpenRouter", id: "openrouter", defaultModel: "anthropic/claude-sonnet-4", envVar: "OPENROUTER_API_KEY" },
];

function prompt(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

export function loadConfig(): DobiConfig | null {
  // Env vars override saved config
  const envProvider = process.env.DOBI_PROVIDER;
  const envModel = process.env.DOBI_MODEL;
  const envKey = process.env.DOBI_API_KEY;
  if (envProvider && envKey) {
    const provider = PROVIDERS.find((p) => p.id === envProvider);
    return {
      provider: envProvider,
      model: envModel ?? provider?.defaultModel ?? "",
      apiKey: envKey,
    };
  }

  // Fall back to legacy ANTHROPIC_API_KEY env var
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      apiKey: process.env.ANTHROPIC_API_KEY,
    };
  }

  // Read saved config
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as DobiConfig;
  } catch {
    return null;
  }
}

function saveConfig(config: DobiConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { encoding: "utf-8", mode: 0o600 });
}

export async function runSetup(): Promise<DobiConfig> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    console.log("\n  Welcome to dobi!\n");
    console.log("  Let's get you set up with an LLM provider.\n");

    // Provider selection
    console.log("  Available providers:\n");
    for (let i = 0; i < PROVIDERS.length; i++) {
      console.log(`    ${i + 1}) ${PROVIDERS[i].name}`);
    }
    console.log();

    let providerIdx = -1;
    while (providerIdx < 0 || providerIdx >= PROVIDERS.length) {
      const answer = await prompt(rl, `  Select a provider [1-${PROVIDERS.length}]: `);
      const num = parseInt(answer, 10);
      if (num >= 1 && num <= PROVIDERS.length) {
        providerIdx = num - 1;
      }
    }
    const provider = PROVIDERS[providerIdx];
    console.log();

    // API key
    const apiKey = await prompt(rl, `  Enter your ${provider.name} API key: `);
    if (!apiKey) {
      console.error("\n  API key is required.");
      process.exit(1);
    }
    console.log();

    // Model (with default)
    const modelAnswer = await prompt(
      rl,
      `  Model [${provider.defaultModel}]: `
    );
    const model = modelAnswer || provider.defaultModel;

    const config: DobiConfig = {
      provider: provider.id,
      model,
      apiKey,
    };

    saveConfig(config);
    console.log(`\n  Config saved to ${CONFIG_PATH}\n`);

    return config;
  } finally {
    rl.close();
  }
}
