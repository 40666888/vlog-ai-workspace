function asString(value) {
  return String(value ?? "").trim();
}

function pickFirst(source = {}, keys = []) {
  for (const key of keys) {
    const value = source?.[key];

    if (value !== undefined && value !== null && `${value}`.trim() !== "") {
      return value;
    }
  }

  return "";
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    return Object.values(value);
  }

  if (typeof value === "string") {
    const lines = value
      .split(/\n+/)
      .map((item) => item.replace(/^[-*•\d.)\s]+/, "").trim())
      .filter(Boolean);

    return lines.length ? lines : [];
  }

  return [];
}

function toStringList(value) {
  return toArray(value)
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (item && typeof item === "object") {
        return asString(item.text || item.content || item.value || item.label || item.title);
      }

      return asString(item);
    })
    .filter(Boolean);
}

function toSectionList(value) {
  return toArray(value)
    .map((item, index) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        return {
          label: asString(item.label || item.title || item.section || `段落 ${index + 1}`),
          content: asString(item.content || item.text || item.body || item.script || item.description)
        };
      }

      const text = asString(item);
      const [label, ...rest] = text.split(/[:：]/);

      return {
        label: asString(rest.length ? label : `段落 ${index + 1}`),
        content: asString(rest.length ? rest.join("：") : text)
      };
    })
    .filter((section) => section.label && section.content);
}

function unwrapRoot(raw = {}) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) {
      return raw.data;
    }

    if (raw.result && typeof raw.result === "object" && !Array.isArray(raw.result)) {
      return raw.result;
    }
  }

  return raw;
}

function normalizeReferenceIdeas(raw = {}) {
  const root = unwrapRoot(raw);
  const itemsSource = root.items || root.ideas || root.referenceIdeas || root.recommendations || root.results || [];
  const items = toArray(itemsSource).map((item, index) => ({
    id: asString(pickFirst(item, ["id", "ideaId", "idea_id", "slug"])) || `reference-idea-${index + 1}`,
    title: asString(pickFirst(item, ["title", "topic", "name", "heading"])),
    referenceBasis: asString(pickFirst(item, ["referenceBasis", "reference", "referenceSource", "source", "basis"])),
    scene: asString(pickFirst(item, ["scene", "scenario", "setting"])),
    platform: asString(pickFirst(item, ["platform", "targetPlatform", "channel"])),
    recommendationReason: asString(pickFirst(item, ["recommendationReason", "reason", "why", "fitReason"]))
  }));

  return {
    items
  };
}

function normalizeCreativeIdeas(raw = {}) {
  const root = unwrapRoot(raw);
  const itemsSource = root.items || root.ideas || root.creativeIdeas || root.recommendations || root.results || [];
  const items = toArray(itemsSource).map((item, index) => ({
    id: asString(pickFirst(item, ["id", "ideaId", "idea_id", "slug"])) || `creative-idea-${index + 1}`,
    title: asString(pickFirst(item, ["title", "topic", "name", "heading"])),
    highlight: asString(pickFirst(item, ["highlight", "hookPoint", "sellingPoint", "angle"])),
    scene: asString(pickFirst(item, ["scene", "scenario", "setting"])),
    outcome: asString(pickFirst(item, ["outcome", "goal", "effect", "expectedResult"])),
    difficulty: asString(pickFirst(item, ["difficulty", "difficultyLevel", "effort"])),
    platform: asString(pickFirst(item, ["platform", "targetPlatform", "channel"])),
    recommendationReason: asString(pickFirst(item, ["recommendationReason", "reason", "why", "fitReason"]))
  }));
  const recommendedId =
    asString(pickFirst(root, ["recommendedId", "recommended_id", "selectedId", "bestIdeaId"])) || items[0]?.id || "";

  return {
    items,
    recommendedId
  };
}

function normalizeShootingScript(raw = {}) {
  const root = unwrapRoot(raw);

  return {
    titleSuggestions: toStringList(root.titleSuggestions || root.titles || root.titleOptions || root.title_options),
    hook: asString(pickFirst(root, ["hook", "openingHook", "hook3s", "opening"])),
    structure: toStringList(root.structure || root.outline || root.beats || root.rhythm),
    scriptSections: toSectionList(root.scriptSections || root.sections || root.sectionList || root.paragraphs),
    subtitleKeywords: toStringList(root.subtitleKeywords || root.subtitles || root.keywords)
  };
}

function normalizeShootingAdvice(raw = {}) {
  const root = unwrapRoot(raw);

  return {
    angles: toStringList(root.angles || root.cameraAngles || root.shotAngles || root.filmingAngles),
    shotSuggestions: toStringList(root.shotSuggestions || root.shots || root.shotList || root.cameraPlan),
    notes: toStringList(root.notes || root.precautions || root.tips || root.reminders),
    broll: toStringList(root.broll || root.bRoll || root.b_roll || root.cutaways)
  };
}

function normalizeFullPlan(raw = {}) {
  return {
    ...normalizeShootingScript(raw),
    ...normalizeShootingAdvice(raw)
  };
}

function normalizeCalendarSummary(raw = {}) {
  const root = unwrapRoot(raw);
  const entriesSource = root.entries || root.calendar || root.schedule || root.plan || root.days || [];
  const snapshotSource = root.snapshot || root.strategy || root.strategySnapshot || {};
  const entries = toArray(entriesSource).map((item, index) => ({
    id: asString(pickFirst(item, ["id", "entryId", "dayId"])) || `calendar-entry-${index + 1}`,
    dateLabel: asString(pickFirst(item, ["dateLabel", "date", "day", "label"])),
    title: asString(pickFirst(item, ["title", "topic", "contentTitle", "ideaTitle"])),
    type: asString(pickFirst(item, ["type", "category", "contentType"])),
    platform: asString(pickFirst(item, ["platform", "targetPlatform", "channel"])),
    goal: asString(pickFirst(item, ["goal", "objective", "purpose"])),
    reminder: asString(pickFirst(item, ["reminder", "note", "tip", "advice"]))
  }));

  return {
    entries,
    snapshot: {
      focus: asString(pickFirst(snapshotSource, ["focus", "priority"])) || asString(root.focus),
      cadence: asString(pickFirst(snapshotSource, ["cadence", "frequency"])) || asString(root.cadence),
      distribution: asString(pickFirst(snapshotSource, ["distribution", "mix"])) || asString(root.distribution),
      summary: asString(pickFirst(snapshotSource, ["summary", "overview"])) || asString(root.summary)
    }
  };
}

function normalizeTaskResponse(task, parsed, rawText = "") {
  const root = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  const repairs = [];
  let normalized;

  switch (task) {
    case "reference_ideas":
      normalized = normalizeReferenceIdeas(root);
      break;
    case "creative_ideas":
      normalized = normalizeCreativeIdeas(root);
      break;
    case "shooting_script":
      normalized = normalizeShootingScript(root);
      break;
    case "shooting_advice":
      normalized = normalizeShootingAdvice(root);
      break;
    case "full_plan":
      normalized = normalizeFullPlan(root);
      break;
    case "calendar_summary":
      normalized = normalizeCalendarSummary(root);
      break;
    default:
      normalized = root;
      break;
  }

  if (JSON.stringify(normalized) !== JSON.stringify(root)) {
    repairs.push("provider-response-normalized");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    repairs.push("provider-response-was-not-object");
  }

  if (rawText && /```|json/i.test(String(rawText))) {
    repairs.push("text-pollution-trimmed-before-provider-parse");
  }

  return {
    data: normalized,
    repairMeta: {
      applied: repairs.length > 0,
      notes: repairs
    }
  };
}

module.exports = {
  normalizeTaskResponse
};
