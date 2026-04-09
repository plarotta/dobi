import { nanoid } from "nanoid";

export type ItemStatus = "todo" | "wip" | "done";

export interface Item {
  id: string;
  title: string;
  points: number;
  tags: string[];
  description: string;
  status: ItemStatus;
}

/**
 * Generate a short 4-character alphanumeric ID.
 */
export function generateId(): string {
  return nanoid(4);
}

const VALID_TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
  todo: ["wip", "done"],
  wip: ["todo", "done"],
  done: ["todo", "wip"],
};

/**
 * Check whether a status transition is valid.
 */
export function isValidTransition(from: ItemStatus, to: ItemStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
