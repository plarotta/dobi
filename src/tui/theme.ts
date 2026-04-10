import chalk from "chalk";
import type { MarkdownTheme } from "@mariozechner/pi-tui";

export const colors = {
  // Message roles
  userLabel: chalk.bold.hex("#C27D5A"),     // warm rust
  assistantLabel: chalk.bold.hex("#7B9DB7"), // steel blue
  userMsg: chalk.white,
  assistantMsg: chalk.white,

  // Proposal cards
  proposalBorder: chalk.hex("#7B9DB7"),   // steel blue
  proposalTitle: chalk.bold.hex("#7B9DB7"),
  proposalBody: chalk.white,

  // Actions
  accepted: chalk.bold.hex("#22C55E"),  // green
  rejected: chalk.bold.hex("#EF4444"),  // red
  error: chalk.bold.hex("#EF4444"),

  // Chrome
  header: chalk.bold.hex("#7B9DB7"),    // steel blue
  border: chalk.hex("#525252"),         // neutral-600
  spinner: chalk.hex("#7B9DB7"),
  muted: chalk.hex("#A3A3A3"),          // neutral-400
  dim: chalk.hex("#737373"),            // neutral-500

  // Status bar
  logo: chalk.bold.hex("#7B9DB7"),
  statusText: chalk.hex("#A3A3A3"),
};

export const markdownTheme: MarkdownTheme = {
  heading: chalk.bold.hex("#7B9DB7"),
  link: chalk.hex("#7B9DB7").underline,
  linkUrl: chalk.hex("#737373"),
  code: chalk.hex("#C9A65A"),
  codeBlock: chalk.white,
  codeBlockBorder: chalk.hex("#525252"),
  quote: chalk.italic.hex("#A3A3A3"),
  quoteBorder: chalk.hex("#525252"),
  hr: chalk.hex("#525252"),
  listBullet: chalk.hex("#7B9DB7"),
  bold: chalk.bold,
  italic: chalk.italic,
  strikethrough: chalk.strikethrough,
  underline: chalk.underline,
};

export const editorTheme = {
  borderColor: colors.border,
  selectList: {
    selectedPrefix: chalk.hex("#7B9DB7"),
    selectedText: chalk.white.bold,
    description: chalk.hex("#A3A3A3"),
    scrollInfo: chalk.hex("#737373"),
    noMatch: chalk.hex("#737373"),
  },
};
