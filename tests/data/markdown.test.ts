import { describe, it, expect } from "vitest";
import { parseItemLine, serializeItem, parseItems, serializeItems } from "../../src/data/markdown.js";
import type { Item } from "../../src/data/items.js";

describe("parseItemLine", () => {
  it("parses a todo item with tags and description", () => {
    const line = '- [ ] `a3f1` **Build auth flow** (3 pts) [backend] — OAuth2 login with GitHub';
    const item = parseItemLine(line);
    expect(item).toEqual({
      id: "a3f1",
      title: "Build auth flow",
      points: 3,
      tags: ["backend"],
      description: "OAuth2 login with GitHub",
      status: "todo",
    });
  });

  it("parses a wip item", () => {
    const line = '- [~] `c4d5` **Vector store integration** (5 pts) [backend] — In progress';
    const item = parseItemLine(line);
    expect(item).not.toBeNull();
    expect(item!.status).toBe("wip");
  });

  it("parses a done item", () => {
    const line = '- [x] `b7c2` **Setup CI pipeline** (2 pts) [infra] — GitHub Actions, lint + test';
    const item = parseItemLine(line);
    expect(item).not.toBeNull();
    expect(item!.status).toBe("done");
  });

  it("parses an item with multiple tags", () => {
    const line = '- [ ] `e8f9` **Add logging** (1 pts) [backend] [observability] — Structured logging';
    const item = parseItemLine(line);
    expect(item).not.toBeNull();
    expect(item!.tags).toEqual(["backend", "observability"]);
  });

  it("parses an item with no tags", () => {
    const line = '- [ ] `abcd` **Simple task** (2 pts) — Just a task';
    const item = parseItemLine(line);
    expect(item).not.toBeNull();
    expect(item!.tags).toEqual([]);
    expect(item!.description).toBe("Just a task");
  });

  it("parses an item with no description", () => {
    const line = '- [ ] `abcd` **Simple task** (2 pts) [frontend]';
    const item = parseItemLine(line);
    expect(item).not.toBeNull();
    expect(item!.tags).toEqual(["frontend"]);
    expect(item!.description).toBe("");
  });

  it("parses an item with no tags and no description", () => {
    const line = '- [ ] `abcd` **Simple task** (2 pts)';
    const item = parseItemLine(line);
    expect(item).not.toBeNull();
    expect(item!.tags).toEqual([]);
    expect(item!.description).toBe("");
  });

  it("returns null for non-item lines", () => {
    expect(parseItemLine("# Heading")).toBeNull();
    expect(parseItemLine("")).toBeNull();
    expect(parseItemLine("- just a list item")).toBeNull();
  });
});

describe("serializeItem", () => {
  it("serializes a todo item", () => {
    const item: Item = {
      id: "a3f1",
      title: "Build auth flow",
      points: 3,
      tags: ["backend"],
      description: "OAuth2 login with GitHub",
      status: "todo",
    };
    expect(serializeItem(item)).toBe(
      '- [ ] `a3f1` **Build auth flow** (3 pts) [backend] — OAuth2 login with GitHub'
    );
  });

  it("serializes a wip item", () => {
    const item: Item = {
      id: "c4d5",
      title: "Vector store",
      points: 5,
      tags: ["backend"],
      description: "Integration",
      status: "wip",
    };
    expect(serializeItem(item)).toBe(
      '- [~] `c4d5` **Vector store** (5 pts) [backend] — Integration'
    );
  });

  it("serializes a done item", () => {
    const item: Item = {
      id: "b7c2",
      title: "Setup CI",
      points: 2,
      tags: ["infra"],
      description: "",
      status: "done",
    };
    expect(serializeItem(item)).toBe(
      '- [x] `b7c2` **Setup CI** (2 pts) [infra]'
    );
  });

  it("serializes an item with no tags", () => {
    const item: Item = {
      id: "abcd",
      title: "Simple",
      points: 1,
      tags: [],
      description: "A task",
      status: "todo",
    };
    expect(serializeItem(item)).toBe(
      '- [ ] `abcd` **Simple** (1 pts) — A task'
    );
  });
});

describe("round-trip", () => {
  const testLines = [
    '- [ ] `a3f1` **Build auth flow** (3 pts) [backend] — OAuth2 login with GitHub',
    '- [~] `c4d5` **Vector store integration** (5 pts) [backend] — In progress',
    '- [x] `b7c2` **Setup CI pipeline** (2 pts) [infra] — GitHub Actions, lint + test',
    '- [ ] `e8f9` **Add logging** (1 pts) [backend] [observability] — Structured logging',
  ];

  for (const line of testLines) {
    it(`round-trips: ${line.slice(0, 50)}...`, () => {
      const item = parseItemLine(line);
      expect(item).not.toBeNull();
      expect(serializeItem(item!)).toBe(line);
    });
  }
});

describe("parseItems / serializeItems", () => {
  it("parses only item lines from mixed content", () => {
    const content = [
      "# Backlog",
      "",
      '- [ ] `a3f1` **Task A** (3 pts) [backend] — Desc A',
      "",
      "Some other text",
      '- [x] `b7c2` **Task B** (2 pts) [infra] — Desc B',
    ].join("\n");

    const items = parseItems(content);
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe("a3f1");
    expect(items[1].id).toBe("b7c2");
  });

  it("serializes and re-parses consistently", () => {
    const items: Item[] = [
      { id: "aa", title: "First", points: 1, tags: ["a"], description: "d1", status: "todo" },
      { id: "bb", title: "Second", points: 2, tags: ["b"], description: "d2", status: "done" },
    ];
    const serialized = serializeItems(items);
    const reparsed = parseItems(serialized);
    expect(reparsed).toEqual(items);
  });
});
