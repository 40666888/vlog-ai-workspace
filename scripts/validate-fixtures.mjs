import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const { normalizeTaskResponse } = require("../services/responseNormalizer.js");
const { normalizeTaskOutput } = require("../services/taskSchemas.js");

const { renderIdeaSection } = await import(pathToFileURL(path.join(workspaceRoot, "vlog-topic-tool-v2/js/renderers/ideas.js")).href);
const { renderScriptSection } = await import(pathToFileURL(path.join(workspaceRoot, "vlog-topic-tool-v2/js/renderers/script.js")).href);
const { renderCalendarSection } = await import(pathToFileURL(path.join(workspaceRoot, "vlog-topic-tool-v2/js/renderers/calendar.js")).href);

function createSlot() {
  return {
    innerHTML: "",
    textContent: "",
    hidden: false
  };
}

async function readJson(...segments) {
  const filepath = path.join(workspaceRoot, ...segments);
  const text = await fs.readFile(filepath, "utf8");
  return JSON.parse(text);
}

function createBaseState() {
  return {
    devConfig: {
      connectionStatus: "success"
    },
    profile: {
      mainPlatform: "xiaohongshu",
      mainPlatformLabel: "小红书",
      commonScene: "campus",
      commonSceneLabel: "校园 / 宿舍 / 教学楼"
    },
    references: {
      samples: [],
      preferredId: null
    },
    requests: {},
    ui: {
      message: null,
      errorPanel: null
    },
    ideas: {
      reference: {
        items: [],
        meta: null
      },
      creative: {
        items: [],
        meta: null
      },
      active: {
        id: null,
        source: null
      }
    },
    outputs: {
      plansByIdea: {},
      calendar: {
        entries: [],
        snapshot: null,
        meta: null,
        settings: {
          startDate: "2026-04-13",
          windowDays: 7
        }
      }
    }
  };
}

function buildMeta(task) {
  return {
    task,
    provider: "fixture",
    model: "schema-check",
    transport: "cached",
    generatedAt: "2026-04-13T00:00:00.000Z",
    latencyMs: 42
  };
}

function buildIdeaElements() {
  return {
    referenceIdeasMetadata: createSlot(),
    creativeIdeasMetadata: createSlot(),
    referenceIdeasGrid: createSlot(),
    creativeIdeasGrid: createSlot(),
    currentSelection: createSlot()
  };
}

function buildScriptElements() {
  return {
    scriptMetadata: createSlot(),
    scriptModuleState: createSlot(),
    scriptTitleOutput: createSlot(),
    scriptHookOutput: createSlot(),
    scriptStructureOutput: createSlot(),
    scriptSectionsOutput: createSlot(),
    scriptAnglesOutput: createSlot(),
    scriptShotsOutput: createSlot(),
    scriptNotesOutput: createSlot(),
    scriptBrollOutput: createSlot(),
    scriptSubtitlesOutput: createSlot()
  };
}

function buildCalendarElements() {
  return {
    calendarMetadata: createSlot(),
    calendarModuleState: createSlot(),
    snapshotFocus: createSlot(),
    snapshotFrequency: createSlot(),
    snapshotDistribution: createSlot(),
    snapshotSummary: createSlot(),
    calendarGrid: createSlot()
  };
}

async function validateReferenceIdeas() {
  const payload = await readJson("fixtures", "payloads", "reference_ideas.basic.json");
  assert(payload.profile.accountType, "reference_ideas payload should be readable.");

  const rawResponse = await readJson("fixtures", "provider-raw", "reference_ideas.repair.json");
  const repaired = normalizeTaskResponse("reference_ideas", rawResponse, JSON.stringify(rawResponse));
  const validated = normalizeTaskOutput("reference_ideas", repaired.data, JSON.stringify(rawResponse));

  const state = createBaseState();
  state.ideas.reference.items = validated.items;
  state.ideas.reference.meta = buildMeta("reference_ideas");
  state.ideas.active = {
    id: validated.items[0].id,
    source: "reference"
  };

  const elements = buildIdeaElements();
  renderIdeaSection(elements, state);

  assert(elements.referenceIdeasGrid.innerHTML.includes(validated.items[0].title), "reference ideas should render title.");
}

async function validateFullPlan() {
  const payload = await readJson("fixtures", "payloads", "full_plan.basic.json");
  assert(payload.activeIdea.title, "full_plan payload should be readable.");

  const rawResponse = await readJson("fixtures", "provider-raw", "full_plan.repair.json");
  const repaired = normalizeTaskResponse("full_plan", rawResponse, JSON.stringify(rawResponse));
  const validated = normalizeTaskOutput("full_plan", repaired.data, JSON.stringify(rawResponse));

  const state = createBaseState();
  const activeIdea = {
    id: "creative-idea-1",
    title: "普通校园日常也能拍出状态感",
    platform: "小红书",
    scene: "校园 / 宿舍 / 教学楼",
    recommendationReason: "更适合长期主线内容。"
  };

  state.ideas.creative.items = [activeIdea];
  state.ideas.active = {
    id: activeIdea.id,
    source: "creative"
  };
  state.outputs.plansByIdea[activeIdea.id] = {
    fullPlan: {
      data: validated,
      meta: buildMeta("full_plan")
    }
  };

  const elements = buildScriptElements();
  renderScriptSection(elements, state);

  assert(elements.scriptTitleOutput.innerHTML.includes("校园"), "full plan should render title suggestions.");
  assert(elements.scriptAnglesOutput.innerHTML.includes("低机位"), "full plan should render angles.");
}

async function validateCalendarSummary() {
  const payload = await readJson("fixtures", "payloads", "calendar_summary.basic.json");
  assert(payload.calendarSettings.windowDays, "calendar_summary payload should be readable.");

  const rawResponse = await readJson("fixtures", "provider-raw", "calendar_summary.repair.json");
  const repaired = normalizeTaskResponse("calendar_summary", rawResponse, JSON.stringify(rawResponse));
  const validated = normalizeTaskOutput("calendar_summary", repaired.data, JSON.stringify(rawResponse));

  const state = createBaseState();
  state.outputs.calendar.entries = validated.entries;
  state.outputs.calendar.snapshot = validated.snapshot;
  state.outputs.calendar.meta = buildMeta("calendar_summary");

  const elements = buildCalendarElements();
  renderCalendarSection(elements, state);

  assert(String(elements.snapshotFocus.textContent).trim(), "calendar snapshot focus should render.");
  assert(elements.calendarGrid.innerHTML.includes(validated.entries[0].title), "calendar entries should render title.");
}

await validateReferenceIdeas();
await validateFullPlan();
await validateCalendarSummary();

console.log("Fixture validation passed.");
