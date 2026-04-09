import chalk from "chalk";
import type { MarkdownTheme } from "@mariozechner/pi-tui";

export const colors = {
  userMsg: chalk.dim.white,
  assistantMsg: chalk.white,
  border: chalk.gray,
  header: chalk.bold.cyan,
  proposalBorder: chalk.yellow,
  accepted: chalk.green,
  rejected: chalk.red,
  error: chalk.red.bold,
  spinner: chalk.cyan,
  muted: chalk.dim,
};

export const markdownTheme: MarkdownTheme = {
  heading: chalk.bold.cyan,
  link: chalk.blue.underline,
  linkUrl: chalk.dim,
  code: chalk.yellow,
  codeBlock: chalk.white,
  codeBlockBorder: chalk.gray,
  quote: chalk.italic,
  quoteBorder: chalk.gray,
  hr: chalk.gray,
  listBullet: chalk.cyan,
  bold: chalk.bold,
  italic: chalk.italic,
  strikethrough: chalk.strikethrough,
  underline: chalk.underline,
};

export const editorTheme = {
  borderColor: colors.border,
  selectList: {
    selectedPrefix: chalk.cyan,
    selectedText: chalk.white.bold,
    description: chalk.dim,
    scrollInfo: chalk.dim,
    noMatch: chalk.dim,
  },
};
