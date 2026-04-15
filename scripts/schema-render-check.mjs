import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const { normalizeTaskOutput } = require("../services/taskSchemas.js");

const { renderIdeaSection } = await import(pathToFileURL(path.join(workspaceRoot, "vlog-topic-tool-v2/js/renderers/ideas.js")).href);
const { renderScriptSection } = await import(pathToFileURL(path.join(workspaceRoot, "vlog-topic-tool-v2/js/renderers/script.js")).href);
const { renderCalendarSection } = await import(pathToFileURL(path.join(workspaceRoot, "vlog-topic-tool-v2/js/renderers/calendar.js")).href);

function slot() {
  return { innerHTML: "", textContent: "", hidden: false };
}

async function readJson(...parts) {
  return JSON.parse(await fs.readFile(path.join(workspaceRoot, ...parts), "utf8"));
}

function baseState() {
  return {
    devConfig: { connectionStatus: "success" },
    profile: {
      mainPlatform: "xiaohongshu",
      mainPlatformLabel: "小红书",
      commonScene: "campus",
      commonSceneLabel: "校园 / 宿舍 / 教学楼"
    },
    requests: {},
    references: { samples: [], preferredId: null },
    ui: { message: null, errorPanel: null },
    ideas: {
      reference: { items: [], meta: null },
      creative: { items: [], meta: null },
      active: { id: null, source: null }
    },
    outputs: {
      plansByIdea: {},
      calendar: {
        entries: [],
        snapshot: null,
        meta: null,
        settings: { startDate: "2026-04-15", windowDays: 7 }
      }
    }
  };
}

function meta(task) {
  return {
    task,
    provider: "fixture",
    model: "schema-render-check",
    transport: "cached",
    generatedAt: "2026-04-15T00:00:00.000Z",
    latencyMs: 20
  };
}

function ideaElements() {
  return {
    referenceIdeasMetadata: slot(),
    creativeIdeasMetadata: slot(),
    referenceIdeasGrid: slot(),
    creativeIdeasGrid: slot(),
    currentSelection: slot()
  };
}

function scriptElements() {
  return {
    scriptMetadata: slot(),
    scriptModuleState: slot(),
    scriptTitleOutput: slot(),
    scriptHookOutput: slot(),
    scriptStructureOutput: slot(),
    scriptSectionsOutput: slot(),
    scriptAnglesOutput: slot(),
    scriptShotsOutput: slot(),
    scriptNotesOutput: slot(),
    scriptBrollOutput: slot(),
    scriptSubtitlesOutput: slot()
  };
}

function calendarElements() {
  return {
    calendarMetadata: slot(),
    calendarModuleState: slot(),
    snapshotFocus: slot(),
    snapshotFrequency: slot(),
    snapshotDistribution: slot(),
    snapshotSummary: slot(),
    calendarGrid: slot()
  };
}

const referenceEnvelope = await readJson("fixtures", "examples", "reference_ideas.success.example.json");
const referenceData = normalizeTaskOutput("reference_ideas", referenceEnvelope.data);
{
  const state = baseState();
  state.ideas.reference.items = referenceData.items;
  state.ideas.reference.meta = meta("reference_ideas");
  state.ideas.active = { id: referenceData.items[0].id, source: "reference" };
  const elements = ideaElements();
  renderIdeaSection(elements, state);
  assert(elements.referenceIdeasGrid.innerHTML.includes(referenceData.items[0].title));
}

const fullPlanEnvelope = await readJson("fixtures", "examples", "full_plan.success.example.json");
const fullPlanData = normalizeTaskOutput("full_plan", fullPlanEnvelope.data);
{
  const state = baseState();
  const activeIdea = {
    id: "creative-idea-1",
    title: "普通校园日常也能拍出状态感",
    platform: "小红书",
    scene: "校园 / 操场",
    recommendationReason: "更适合长期主线内容。"
  };
  state.ideas.creative.items = [activeIdea];
  state.ideas.active = { id: activeIdea.id, source: "creative" };
  state.outputs.plansByIdea[activeIdea.id] = {
    fullPlan: {
      data: fullPlanData,
      meta: meta("full_plan")
    }
  };
  const elements = scriptElements();
  renderScriptSection(elements, state);
  assert(elements.scriptTitleOutput.innerHTML.includes("校园"));
  assert(elements.scriptAnglesOutput.innerHTML.includes("低机位"));
}

const calendarEnvelope = await readJson("fixtures", "examples", "calendar_summary.success.example.json");
const calendarData = normalizeTaskOutput("calendar_summary", calendarEnvelope.data);
{
  const state = baseState();
  state.outputs.calendar.entries = calendarData.entries;
  state.outputs.calendar.snapshot = calendarData.snapshot;
  state.outputs.calendar.meta = meta("calendar_summary");
  const elements = calendarElements();
  renderCalendarSection(elements, state);
  assert(String(elements.snapshotFocus.textContent).trim());
  assert(elements.calendarGrid.innerHTML.includes(calendarData.entries[0].title));
}

console.log("Schema + render checks passed.");
