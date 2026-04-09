import { getModel } from "@mariozechner/pi-ai";

export function getConfiguredModel() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "Missing ANTHROPIC_API_KEY environment variable.\n\n" +
        "Set it in your shell:\n" +
        "  export ANTHROPIC_API_KEY=sk-ant-...\n\n" +
        "Get a key at https://console.anthropic.com/settings/keys"
    );
  }
  return getModel("anthropic", "claude-sonnet-4-20250514");
}
