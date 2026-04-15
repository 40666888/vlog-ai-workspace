(function () {
  "use strict";

  const STORAGE_KEY = "reminder-calendar_v1_data";
  const VERSION = "1.4.0";
  const CATEGORY_VALUES = ["工作", "健康", "家庭", "学习", "财务", "其他"];
  const PRIORITY_VALUES = ["高", "中", "低"];
  const PRIORITY_ORDER = { 高: 0, 中: 1, 低: 2 };
  const STATUS_VALUES = ["未开始", "进行中", "已完成", "已延期", "已跳过"];
  const REPEAT_VALUES = ["none", "daily", "weekly", "monthly"];
  const DEFAULT_TASK_PANEL_HINT = "这里统一调整状态、进度、日期和备注。";
  const REPEAT_LABELS = {
    none: "不重复",
    daily: "每日",
    weekly: "每周",
    monthly: "每月",
  };
  const FILTER_VALUES = ["today", "selected", "all", "open", "done", "overdue"];

  const elements = {
    plannerDate: document.getElementById("plannerDate"),
    defaultCategory: document.getElementById("defaultCategory"),
    defaultPriority: document.getElementById("defaultPriority"),
    defaultReminderTime: document.getElementById("defaultReminderTime"),
    defaultRepeat: document.getElementById("defaultRepeat"),
    batchInput: document.getElementById("batchInput"),
    generateTasksBtn: document.getElementById("generateTasksBtn"),
    clearInputBtn: document.getElementById("clearInputBtn"),
    batchPreviewPanel: document.getElementById("batchPreviewPanel"),
    batchPreviewSummary: document.getElementById("batchPreviewSummary"),
    batchValidMeta: document.getElementById("batchValidMeta"),
    batchValidList: document.getElementById("batchValidList"),
    batchErrorMeta: document.getElementById("batchErrorMeta"),
    batchErrorList: document.getElementById("batchErrorList"),
    confirmPreviewBtn: document.getElementById("confirmPreviewBtn"),
    cancelPreviewBtn: document.getElementById("cancelPreviewBtn"),
    quickTaskForm: document.getElementById("quickTaskForm"),
    singleTitle: document.getElementById("singleTitle"),
    singleReminderTime: document.getElementById("singleReminderTime"),
    singleCategory: document.getElementById("singleCategory"),
    singlePriority: document.getElementById("singlePriority"),
    singleRepeat: document.getElementById("singleRepeat"),
    singleNotes: document.getElementById("singleNotes"),
    statusMetaText: document.getElementById("statusMetaText"),
    appNotice: document.getElementById("appNotice"),
    todayDisplayDate: document.getElementById("todayDisplayDate"),
    todaySummaryText: document.getElementById("todaySummaryText"),
    todaySummaryChips: document.getElementById("todaySummaryChips"),
    heroTodayRate: document.getElementById("heroTodayRate"),
    todayTaskCount: document.getElementById("todayTaskCount"),
    todayTaskList: document.getElementById("todayTaskList"),
    selectedDateLabel: document.getElementById("selectedDateLabel"),
    selectedDateSummary: document.getElementById("selectedDateSummary"),
    summaryCards: document.getElementById("summaryCards"),
    notificationState: document.getElementById("notificationState"),
    requestNotificationBtn: document.getElementById("requestNotificationBtn"),
    copyYesterdayBtn: document.getElementById("copyYesterdayBtn"),
    jumpTodayBtn: document.getElementById("jumpTodayBtn"),
    sideTabs: document.getElementById("sideTabs"),
    timelineList: document.getElementById("timelineList"),
    timelinePanel: document.getElementById("timelinePanel"),
    calendarTitle: document.getElementById("calendarTitle"),
    calendarGrid: document.getElementById("calendarGrid"),
    prevMonthBtn: document.getElementById("prevMonthBtn"),
    nextMonthBtn: document.getElementById("nextMonthBtn"),
    taskFilters: document.getElementById("taskFilters"),
    filterMoreToggle: document.getElementById("filterMoreToggle"),
    filterMorePanel: document.getElementById("filterMorePanel"),
    categoryFilter: document.getElementById("categoryFilter"),
    priorityFilter: document.getElementById("priorityFilter"),
    taskSearchInput: document.getElementById("taskSearchInput"),
    taskResultMeta: document.getElementById("taskResultMeta"),
    taskPanelHint: document.getElementById("taskPanelHint"),
    tasksPanel: document.getElementById("taskList") ? document.getElementById("taskList").closest(".tasks-panel") : null,
    taskList: document.getElementById("taskList"),
    pendingList: document.getElementById("pendingList"),
    pendingPanel: document.getElementById("pendingPanel"),
    statsTableBody: document.getElementById("statsTableBody"),
    exportBtn: document.getElementById("exportBtn"),
    importBtn: document.getElementById("importBtn"),
    importFileInput: document.getElementById("importFileInput"),
    clearAllBtn: document.getElementById("clearAllBtn"),
    storageMeta: document.getElementById("storageMeta"),
    loadSampleBtn: document.getElementById("loadSampleBtn"),
  };

  const runtime = {
    batchPreview: null,
    editingTaskId: "",
    noticeTimer: 0,
    filterMoreOpen: false,
    taskGuideTimer: 0,
  };

  let state = loadState();

  init();

  function init() {
    syncControlsWithState();
    bindEvents();
    syncResponsiveFilterPanel();
    renderAll();
    updateNotificationState();
    checkReminderDue();
    window.setInterval(checkReminderDue, 30000);
  }

  function buildInitialState() {
    const today = new Date();
    return {
      version: VERSION,
      meta: {
        lastSavedAt: "",
        lastExportedAt: "",
      },
      tasks: [],
      ui: {
        selectedDate: toISODate(today),
        filter: "today",
        calendarYear: today.getFullYear(),
        calendarMonth: today.getMonth(),
        categoryFilter: "all",
        priorityFilter: "all",
        searchQuery: "",
        sideTab: "timeline",
      },
      reminderLog: {},
    };
  }

  function loadState() {
    const initialState = buildInitialState();

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return initialState;
      }

      return migrateState(JSON.parse(raw), initialState);
    } catch (error) {
      console.error("读取本地数据失败：", error);
      showNotice("读取本地数据失败，已使用空白数据重新开始。", "warn");
      return initialState;
    }
  }

  function migrateState(parsed, initialState) {
    const nextState = buildInitialState();
    const source = parsed && typeof parsed === "object" ? parsed : {};
    const sourceMeta = source.meta && typeof source.meta === "object" ? source.meta : {};
    const sourceUi = source.ui && typeof source.ui === "object" ? source.ui : {};

    nextState.meta.lastSavedAt =
      typeof sourceMeta.lastSavedAt === "string"
        ? sourceMeta.lastSavedAt
        : typeof source.lastSavedAt === "string"
          ? source.lastSavedAt
          : initialState.meta.lastSavedAt;
    nextState.meta.lastExportedAt =
      typeof sourceMeta.lastExportedAt === "string"
        ? sourceMeta.lastExportedAt
        : typeof source.lastExportedAt === "string"
          ? source.lastExportedAt
          : initialState.meta.lastExportedAt;

    nextState.ui.selectedDate = isISODate(sourceUi.selectedDate)
      ? sourceUi.selectedDate
      : isISODate(source.selectedDate)
        ? source.selectedDate
        : initialState.ui.selectedDate;
    nextState.ui.filter = FILTER_VALUES.includes(sourceUi.filter)
      ? sourceUi.filter
      : FILTER_VALUES.includes(source.filter)
        ? source.filter
        : initialState.ui.filter;
    nextState.ui.calendarYear = Number.isInteger(sourceUi.calendarYear)
      ? sourceUi.calendarYear
      : Number.isInteger(source.calendarYear)
        ? source.calendarYear
        : parseISODate(nextState.ui.selectedDate).getFullYear();
    nextState.ui.calendarMonth = Number.isInteger(sourceUi.calendarMonth)
      ? sourceUi.calendarMonth
      : Number.isInteger(source.calendarMonth)
        ? source.calendarMonth
        : parseISODate(nextState.ui.selectedDate).getMonth();
    nextState.ui.categoryFilter =
      sourceUi.categoryFilter === "all" || CATEGORY_VALUES.includes(sourceUi.categoryFilter)
        ? sourceUi.categoryFilter || "all"
        : "all";
    nextState.ui.priorityFilter =
      sourceUi.priorityFilter === "all" || PRIORITY_VALUES.includes(sourceUi.priorityFilter)
        ? sourceUi.priorityFilter || "all"
        : "all";
    nextState.ui.searchQuery = typeof sourceUi.searchQuery === "string" ? sourceUi.searchQuery : "";
    nextState.ui.sideTab = sourceUi.sideTab === "pending" ? "pending" : "timeline";

    nextState.tasks = Array.isArray(source.tasks)
      ? source.tasks.map(sanitizeTask).filter(Boolean)
      : [];
    nextState.reminderLog = source.reminderLog && typeof source.reminderLog === "object" ? source.reminderLog : {};

    return nextState;
  }

  function sanitizeTask(task) {
    if (!task || typeof task !== "object") {
      return null;
    }

    const today = toISODate(new Date());
    const id = typeof task.id === "string" && task.id ? task.id : createId();
    const dueDate = isISODate(task.dueDate) ? task.dueDate : today;
    const reminderTime = normalizeTime(typeof task.reminderTime === "string" ? task.reminderTime : "");
    const repeat = REPEAT_VALUES.includes(task.repeat) ? task.repeat : "none";
    let progress = clamp(Number(task.progress) || 0, 0, 100);
    let status = STATUS_VALUES.includes(task.status) ? task.status : deriveStatusFromProgress(progress);

    if (status === "已完成" || progress >= 100) {
      status = "已完成";
      progress = 100;
    } else if (status === "进行中" && progress === 0) {
      progress = 25;
    } else if (status === "未开始" && progress > 0) {
      status = "进行中";
    } else if (status === "已延期" && progress >= 100) {
      status = "已完成";
      progress = 100;
    } else if (status === "已跳过" && progress === 100) {
      progress = 0;
    }

    const createdAt = typeof task.createdAt === "string" ? task.createdAt : new Date().toISOString();
    const updatedAt = typeof task.updatedAt === "string" ? task.updatedAt : createdAt;
    const completedAt = status === "已完成"
      ? typeof task.completedAt === "string" && task.completedAt
        ? task.completedAt
        : updatedAt
      : "";
    const skippedAt = status === "已跳过"
      ? typeof task.skippedAt === "string" && task.skippedAt
        ? task.skippedAt
        : updatedAt
      : "";
    const postponedAt = status === "已延期"
      ? typeof task.postponedAt === "string" && task.postponedAt
        ? task.postponedAt
        : updatedAt
      : "";
    const templateId = repeat !== "none"
      ? typeof task.templateId === "string" && task.templateId
        ? task.templateId
        : id
      : typeof task.templateId === "string"
        ? task.templateId
        : "";
    const carryOverFrom = isISODate(task.carryOverFrom) ? task.carryOverFrom : "";

    return {
      id,
      title: String(task.title || "未命名任务").trim(),
      notes: String(task.notes || "").trim(),
      category: CATEGORY_VALUES.includes(task.category) ? task.category : "其他",
      priority: PRIORITY_VALUES.includes(task.priority) ? task.priority : "中",
      dueDate,
      reminderTime,
      status,
      progress,
      repeat,
      templateId,
      createdAt,
      updatedAt,
      completedAt,
      skippedAt,
      postponedAt,
      carryOverFrom,
    };
  }

  function bindEvents() {
    elements.generateTasksBtn.addEventListener("click", handleBatchPreview);
    elements.clearInputBtn.addEventListener("click", handleClearInput);
    elements.batchInput.addEventListener("input", handleBatchInputChange);
    elements.confirmPreviewBtn.addEventListener("click", handleConfirmPreview);
    elements.cancelPreviewBtn.addEventListener("click", handleCancelPreview);
    elements.quickTaskForm.addEventListener("submit", handleSingleCreate);
    elements.plannerDate.addEventListener("change", handlePlannerDateChange);
    elements.batchErrorList.addEventListener("click", handleBatchErrorListClick);
    elements.filterMoreToggle.addEventListener("click", handleFilterMoreToggle);
    elements.prevMonthBtn.addEventListener("click", function () {
      shiftCalendarMonth(-1);
    });
    elements.nextMonthBtn.addEventListener("click", function () {
      shiftCalendarMonth(1);
    });
    elements.taskFilters.addEventListener("click", handleFilterClick);
    elements.categoryFilter.addEventListener("change", handleAuxiliaryFiltersChange);
    elements.priorityFilter.addEventListener("change", handleAuxiliaryFiltersChange);
    elements.taskSearchInput.addEventListener("input", handleSearchInput);
    elements.calendarGrid.addEventListener("click", handleCalendarClick);
    elements.exportBtn.addEventListener("click", handleExport);
    elements.importBtn.addEventListener("click", function () {
      elements.importFileInput.click();
    });
    elements.importFileInput.addEventListener("change", handleImport);
    elements.requestNotificationBtn.addEventListener("click", requestNotifications);
    elements.copyYesterdayBtn.addEventListener("click", handleCopyYesterday);
    elements.jumpTodayBtn.addEventListener("click", jumpToToday);
    elements.sideTabs.addEventListener("click", handleSideTabClick);
    elements.sideTabs.addEventListener("keydown", handleSideTabKeydown);
    elements.clearAllBtn.addEventListener("click", handleClearAll);
    elements.loadSampleBtn.addEventListener("click", handleLoadSample);
    window.addEventListener("resize", syncResponsiveFilterPanel);

    bindTaskContainer(elements.taskList);
    elements.todayTaskList.addEventListener("click", handleTodayTaskListClick);
  }

  function bindTaskContainer(container) {
    container.addEventListener("click", handleTaskContainerClick);
    container.addEventListener("change", handleTaskContainerChange);
    container.addEventListener("input", handleTaskContainerInput);
    container.addEventListener("submit", handleTaskContainerSubmit);
  }

  function handleSideTabClick(event) {
    const button = event.target.closest("[data-side-tab]");
    if (!button) {
      return;
    }

    state.ui.sideTab = button.dataset.sideTab === "pending" ? "pending" : "timeline";
    persistState({ updateTimestamp: false });
    renderSidePanel();
  }

  function handleTodayTaskListClick(event) {
    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      const taskId = actionButton.dataset.taskId;
      if (!taskId) {
        return;
      }

      if (actionButton.dataset.action === "quick-complete") {
        const result = mutateTask(taskId, function (task) {
          return applyStatusChange(task, "已完成");
        });
        if (result) {
          renderAll();
          showNotice(result.createdRepeat ? "任务已完成，并已生成下一次重复任务。" : "任务已标记为完成。", "success");
        }
        return;
      }

      if (actionButton.dataset.action === "focus-task") {
        focusTaskInMainList(taskId);
      }
      return;
    }

    const card = event.target.closest("[data-task-focus]");
    if (!card) {
      return;
    }

    focusTaskInMainList(card.dataset.taskFocus);
  }

  function handleCancelPreview() {
    clearBatchPreview({ focusFirstError: true });
  }

  function handleBatchErrorListClick(event) {
    const trigger = event.target.closest("[data-jump-error-line]");
    if (!trigger) {
      return;
    }

    const lineNumber = Number(trigger.dataset.jumpErrorLine);
    if (!lineNumber) {
      return;
    }

    focusBatchInputAtLine(lineNumber);
  }

  function handleFilterMoreToggle() {
    runtime.filterMoreOpen = !runtime.filterMoreOpen;
    syncResponsiveFilterPanel();
  }

  function handleBatchPreview() {
    const raw = elements.batchInput.value.trim();
    if (!raw) {
      showNotice("先在输入框里写入至少一条晨间事项，再生成预览。", "warn");
      return;
    }

    runtime.batchPreview = parseBatchInput(raw, getBatchDefaults());
    renderBatchPreview();

    if (!runtime.batchPreview.rows.length) {
      showNotice("没有识别到可解析的行，请检查输入。", "warn");
      return;
    }

    if (!runtime.batchPreview.validTasks.length) {
      showNotice("没有可生成的任务，请先修正错误行。", "warn");
      return;
    }

    if (runtime.batchPreview.errorCount) {
      showNotice(
        "已解析 " +
          runtime.batchPreview.validTasks.length +
          " 条任务，另有 " +
          runtime.batchPreview.errorCount +
          " 行需要修正。",
        "warn"
      );
      return;
    }

    showNotice("解析预览已完成，请确认后再生成。", "success");
  }

  function handleConfirmPreview() {
    if (!runtime.batchPreview || !runtime.batchPreview.validTasks.length) {
      showNotice("当前没有可确认生成的任务。", "warn");
      return;
    }

    appendTasks(runtime.batchPreview.validTasks);
    elements.batchInput.value = "";
    clearBatchPreview();
    renderAll();
    showNotice("代办事项已生成并写入本地。", "success");
  }

  function handleBatchInputChange() {
    if (!runtime.batchPreview) {
      return;
    }

    runtime.batchPreview = null;
    renderBatchPreview();
  }

  function handleClearInput() {
    elements.batchInput.value = "";
    clearBatchPreview();
    showNotice("输入框已清空。", "success");
  }

  function handleSingleCreate(event) {
    event.preventDefault();

    const title = elements.singleTitle.value.trim();
    const rawTime = elements.singleReminderTime.value.trim();
    const reminderTime = normalizeTime(rawTime);

    if (!title) {
      showNotice("请填写任务标题。", "warn");
      return;
    }

    if (rawTime && !reminderTime) {
      showNotice("提醒时间格式不正确。", "warn");
      return;
    }

    const newTask = sanitizeTask({
      id: createId(),
      title,
      notes: elements.singleNotes.value.trim(),
      category: elements.singleCategory.value,
      priority: elements.singlePriority.value,
      dueDate: state.ui.selectedDate,
      reminderTime,
      status: "未开始",
      progress: 0,
      repeat: elements.singleRepeat.value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    appendTasks([newTask]);
    elements.quickTaskForm.reset();
    elements.singleCategory.value = "其他";
    elements.singlePriority.value = "中";
    elements.singleRepeat.value = "none";
    renderAll();
    showNotice("新任务已加入清单。", "success");
  }

  function handlePlannerDateChange(event) {
    const nextDate = event.target.value;
    if (!isISODate(nextDate)) {
      return;
    }

    const today = toISODate(new Date());
    state.ui.selectedDate = nextDate;
    state.ui.filter = nextDate === today ? "today" : "selected";
    state.ui.calendarYear = parseISODate(nextDate).getFullYear();
    state.ui.calendarMonth = parseISODate(nextDate).getMonth();
    persistState({ updateTimestamp: false });
    renderAll();
  }

  function handleFilterClick(event) {
    const button = event.target.closest("[data-filter]");
    if (!button) {
      return;
    }

    state.ui.filter = button.dataset.filter;
    persistState({ updateTimestamp: false });
    renderTaskFilters();
    renderTaskList();
  }

  function handleAuxiliaryFiltersChange() {
    state.ui.categoryFilter = elements.categoryFilter.value;
    state.ui.priorityFilter = elements.priorityFilter.value;
    persistState({ updateTimestamp: false });
    renderTaskList();
  }

  function handleSearchInput(event) {
    state.ui.searchQuery = event.target.value;
    persistState({ updateTimestamp: false });
    renderTaskList();
  }

  function handleCalendarClick(event) {
    const button = event.target.closest("[data-date]");
    if (!button) {
      return;
    }

    const nextDate = button.dataset.date;
    if (!isISODate(nextDate)) {
      return;
    }

    state.ui.selectedDate = nextDate;
    state.ui.filter = nextDate === toISODate(new Date()) ? "today" : "selected";
    state.ui.calendarYear = parseISODate(nextDate).getFullYear();
    state.ui.calendarMonth = parseISODate(nextDate).getMonth();
    persistState({ updateTimestamp: false });
    renderAll();
  }

  function handleSideTabKeydown(event) {
    const currentTab = event.target.closest("[data-side-tab]");
    if (!currentTab) {
      return;
    }

    const tabs = Array.from(elements.sideTabs.querySelectorAll("[data-side-tab]"));
    const currentIndex = tabs.indexOf(currentTab);
    if (currentIndex === -1) {
      return;
    }

    let nextIndex = -1;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex === -1) {
      return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    state.ui.sideTab = nextTab.dataset.sideTab === "pending" ? "pending" : "timeline";
    persistState({ updateTimestamp: false });
    renderSidePanel();
    nextTab.focus();
  }

  function syncResponsiveFilterPanel() {
    if (!elements.filterMoreToggle || !elements.filterMorePanel) {
      return;
    }

    const isCompact = window.innerWidth <= 560;
    if (!isCompact) {
      elements.filterMorePanel.hidden = false;
      elements.filterMoreToggle.hidden = true;
      elements.filterMoreToggle.disabled = true;
      elements.filterMoreToggle.setAttribute("aria-hidden", "true");
      elements.filterMoreToggle.setAttribute("tabindex", "-1");
      elements.filterMoreToggle.setAttribute("aria-expanded", "false");
      elements.filterMoreToggle.textContent = "更多筛选";
      return;
    }

    elements.filterMoreToggle.hidden = false;
    elements.filterMoreToggle.disabled = false;
    elements.filterMoreToggle.setAttribute("aria-hidden", "false");
    elements.filterMoreToggle.setAttribute("tabindex", "0");
    elements.filterMorePanel.hidden = !runtime.filterMoreOpen;
    elements.filterMoreToggle.setAttribute("aria-expanded", runtime.filterMoreOpen ? "true" : "false");
    elements.filterMoreToggle.textContent = runtime.filterMoreOpen ? "收起筛选" : "更多筛选";
  }

  function handleTaskContainerInput(event) {
    const range = event.target.closest("[data-progress-range]");
    if (!range) {
      return;
    }

    const taskId = range.dataset.taskId;
    const wrap = event.currentTarget.querySelector('[data-progress-value][data-task-id="' + taskId + '"]');
    if (wrap) {
      wrap.textContent = String(range.value) + "%";
    }

    const fill = event.currentTarget.querySelector('[data-progress-fill][data-task-id="' + taskId + '"]');
    if (fill) {
      fill.style.width = String(range.value) + "%";
    }
  }

  function handleTaskContainerChange(event) {
    const statusSelect = event.target.closest("[data-status-select]");
    if (statusSelect) {
      const result = mutateTask(statusSelect.dataset.taskId, function (task) {
        return applyStatusChange(task, statusSelect.value);
      });
      if (result) {
        renderAll();
        showNotice(result.createdRepeat ? "状态已更新，并已生成下一次重复任务。" : "任务状态已更新。", "success");
      }
      return;
    }

    const range = event.target.closest("[data-progress-range]");
    if (range) {
      const result = mutateTask(range.dataset.taskId, function (task) {
        return applyProgressChange(task, Number(range.value));
      });
      if (result) {
        renderAll();
        showNotice("任务进度已更新。", "success");
      }
    }
  }

  function handleTaskContainerClick(event) {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) {
      return;
    }

    const action = actionButton.dataset.action;
    const taskId = actionButton.dataset.taskId;

    if (!taskId) {
      return;
    }

    if (action === "mark-complete") {
      const result = mutateTask(taskId, function (task) {
        return applyStatusChange(task, "已完成");
      });
      if (result) {
        renderAll();
        showNotice(result.createdRepeat ? "任务已完成，并已生成下一次重复任务。" : "任务已标记为完成。", "success");
      }
      return;
    }

    if (action === "postpone") {
      const result = mutateTask(taskId, postponeTaskToTomorrow);
      if (result) {
        renderAll();
        showNotice("任务已延期到明天。", "success");
      }
      return;
    }

    if (action === "skip") {
      const result = mutateTask(taskId, function (task) {
        return applyStatusChange(task, "已跳过");
      });
      if (result) {
        renderAll();
        showNotice("任务已标记为跳过。", "success");
      }
      return;
    }

    if (action === "delete") {
      const task = getTaskById(taskId);
      if (!task) {
        return;
      }
      if (!window.confirm("删除后将从当前浏览器的清单中移除这条任务，确定继续吗？")) {
        return;
      }
      state.tasks = state.tasks.filter(function (item) {
        return item.id !== taskId;
      });
      delete state.reminderLog[buildReminderKey(taskId, task.dueDate)];
      if (runtime.editingTaskId === taskId) {
        runtime.editingTaskId = "";
      }
      persistState();
      renderAll();
      showNotice("任务已删除。", "success");
      return;
    }

    if (action === "toggle-edit") {
      runtime.editingTaskId = runtime.editingTaskId === taskId ? "" : taskId;
      renderTaskList();
      return;
    }

    if (action === "cancel-edit") {
      runtime.editingTaskId = "";
      renderTaskList();
      return;
    }

    if (action === "jump-date") {
      const task = getTaskById(taskId);
      if (!task) {
        return;
      }
      state.ui.selectedDate = task.dueDate;
      state.ui.filter = task.dueDate === toISODate(new Date()) ? "today" : "selected";
      state.ui.calendarYear = parseISODate(task.dueDate).getFullYear();
      state.ui.calendarMonth = parseISODate(task.dueDate).getMonth();
      persistState({ updateTimestamp: false });
      renderAll();
      showNotice("已定位到任务对应的日期。", "success");
    }
  }

  function handleTaskContainerSubmit(event) {
    const form = event.target.closest("[data-edit-form]");
    if (!form) {
      return;
    }

    event.preventDefault();
    const taskId = form.dataset.taskId;
    const formData = new FormData(form);
    const title = String(formData.get("title") || "").trim();
    const dueDate = String(formData.get("dueDate") || "");
    const rawTime = String(formData.get("reminderTime") || "").trim();
    const reminderTime = normalizeTime(rawTime);

    if (!title) {
      showNotice("任务标题不能为空。", "warn");
      return;
    }

    if (!isISODate(dueDate)) {
      showNotice("请选择有效的任务日期。", "warn");
      return;
    }

    if (rawTime && !reminderTime) {
      showNotice("提醒时间格式不正确。", "warn");
      return;
    }

    const category = CATEGORY_VALUES.includes(String(formData.get("category") || ""))
      ? String(formData.get("category"))
      : "其他";
    const priority = PRIORITY_VALUES.includes(String(formData.get("priority") || ""))
      ? String(formData.get("priority"))
      : "中";
    const repeat = REPEAT_VALUES.includes(String(formData.get("repeat") || ""))
      ? String(formData.get("repeat"))
      : "none";
    const notes = String(formData.get("notes") || "").trim();

    const result = mutateTask(taskId, function (task) {
      return sanitizeTask({
        ...task,
        title,
        dueDate,
        reminderTime,
        category,
        priority,
        repeat,
        notes,
        updatedAt: new Date().toISOString(),
      });
    });

    if (!result) {
      return;
    }

    runtime.editingTaskId = "";
    renderAll();
    showNotice("任务内容已更新。", "success");
  }

  function handleExport() {
    const now = new Date().toISOString();
    const payload = {
      app: "晨间提醒日历",
      version: VERSION,
      exportedAt: now,
      meta: state.meta,
      tasks: state.tasks,
      ui: state.ui,
      reminderLog: state.reminderLog,
    };

    state.meta.lastExportedAt = now;
    persistState({ updateTimestamp: false });

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "reminder-calendar-backup-" + toISODate(new Date()) + ".json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    renderMetaStrip();
    showNotice("备份文件已导出。建议把 JSON 和整个网页文件夹一起保存。", "success");
  }

  function handleImport(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = function () {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        if (!parsed || !Array.isArray(parsed.tasks)) {
          throw new Error("invalid");
        }

        if (!window.confirm("导入备份会替换当前浏览器里的日历数据，确定继续吗？")) {
          elements.importFileInput.value = "";
          return;
        }

        state = migrateState(parsed, buildInitialState());
        runtime.batchPreview = null;
        runtime.editingTaskId = "";
        persistState();
        renderAll();
        showNotice("备份导入成功。", "success");
      } catch (error) {
        console.error("导入备份失败：", error);
        showNotice("导入失败，文件格式不是当前网页可识别的 JSON 备份。", "danger");
      } finally {
        elements.importFileInput.value = "";
      }
    };

    reader.readAsText(file, "utf-8");
  }

  function handleClearAll() {
    if (!state.tasks.length) {
      showNotice("当前没有任务可清空。", "warn");
      return;
    }

    if (!window.confirm("这会清空当前浏览器中保存的全部任务。若还没导出备份，建议先导出。确定继续吗？")) {
      return;
    }

    if (!window.confirm("最后确认：清空后本地任务会全部移除，确定要继续吗？")) {
      return;
    }

    state.tasks = [];
    state.reminderLog = {};
    runtime.batchPreview = null;
    runtime.editingTaskId = "";
    persistState();
    renderAll();
    showNotice("当前浏览器中的任务已清空。", "success");
  }

  function handleLoadSample() {
    if (state.tasks.length && !window.confirm("载入示例会保留现有任务，并继续追加示例数据。确定继续吗？")) {
      return;
    }

    appendTasks(buildSampleTasks());
    renderAll();
    showNotice("示例数据已载入，你可以直接按自己的节奏修改。", "success");
  }

  function handleCopyYesterday() {
    const today = toISODate(new Date());
    const yesterday = toISODate(addDays(parseISODate(today), -1));
    const candidates = state.tasks.filter(function (task) {
      return task.dueDate === yesterday && !isTerminalStatus(task.status);
    });

    if (!candidates.length) {
      showNotice("昨天没有可复制到今天的未完成任务。", "warn");
      return;
    }

    const copiedTasks = candidates
      .filter(function (task) {
        return !hasSimilarTaskForDate(task, today);
      })
      .map(function (task) {
        const progress = clamp(Number(task.progress) || 0, 0, 100);
        return sanitizeTask({
          ...task,
          id: createId(),
          dueDate: today,
          status: progress > 0 ? "进行中" : "未开始",
          progress: progress,
          carryOverFrom: yesterday,
          completedAt: "",
          skippedAt: "",
          postponedAt: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

    if (!copiedTasks.length) {
      showNotice("今天已经有相似任务了，没有重复复制。", "warn");
      return;
    }

    appendTasks(copiedTasks);
    jumpToToday();
    showNotice("已把昨天未完成的任务复制到今天。", "success");
  }

  function jumpToToday() {
    const today = toISODate(new Date());
    state.ui.selectedDate = today;
    state.ui.filter = "today";
    state.ui.calendarYear = parseISODate(today).getFullYear();
    state.ui.calendarMonth = parseISODate(today).getMonth();
    persistState({ updateTimestamp: false });
    renderAll();
  }

  function focusTaskInMainList(taskId) {
    const task = getTaskById(taskId);
    if (!task) {
      return;
    }

    const today = toISODate(new Date());
    state.ui.selectedDate = task.dueDate;
    state.ui.filter = task.dueDate === today ? "today" : "selected";
    state.ui.calendarYear = parseISODate(task.dueDate).getFullYear();
    state.ui.calendarMonth = parseISODate(task.dueDate).getMonth();
    state.ui.categoryFilter = "all";
    state.ui.priorityFilter = "all";
    state.ui.searchQuery = "";
    runtime.editingTaskId = "";

    persistState({ updateTimestamp: false });
    renderAll();
    flashTaskPanelGuide("已定位到这条任务，可继续调整状态、进度、日期和备注。");

    window.requestAnimationFrame(function () {
      const target = document.getElementById("task-card-" + taskId);
      if (!target) {
        return;
      }

      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("is-focused");
      window.setTimeout(function () {
        target.classList.remove("is-focused");
        target.removeAttribute("tabindex");
      }, 1800);
    });
  }

  function flashTaskPanelGuide(message) {
    if (!elements.taskPanelHint || !elements.tasksPanel) {
      return;
    }

    window.clearTimeout(runtime.taskGuideTimer);
    elements.taskPanelHint.textContent = message || DEFAULT_TASK_PANEL_HINT;
    elements.tasksPanel.classList.add("is-guided");
    runtime.taskGuideTimer = window.setTimeout(function () {
      elements.taskPanelHint.textContent = DEFAULT_TASK_PANEL_HINT;
      elements.tasksPanel.classList.remove("is-guided");
    }, 2400);
  }

  function requestNotifications() {
    if (!("Notification" in window)) {
      showNotice("当前浏览器不支持桌面提醒，网页其他功能仍可正常使用。", "warn");
      return;
    }

    Notification.requestPermission().then(function () {
      updateNotificationState();
      if (Notification.permission === "granted") {
        showNotice("浏览器提醒已开启。页面保持打开时，到点会发出通知。", "success");
      } else {
        showNotice("浏览器提醒未授权，你仍然可以使用日历和进度统计。", "warn");
      }
    });
  }

  function updateNotificationState() {
    if (!("Notification" in window)) {
      elements.notificationState.textContent = "当前浏览器不支持系统通知。";
      elements.requestNotificationBtn.disabled = true;
      elements.requestNotificationBtn.textContent = "当前浏览器不支持提醒";
      return;
    }

    if (Notification.permission === "granted") {
      elements.notificationState.textContent = "浏览器提醒已开启。";
      elements.requestNotificationBtn.textContent = "提醒已开启";
      return;
    }

    if (Notification.permission === "denied") {
      elements.notificationState.textContent = "浏览器提醒已被禁用。";
      elements.requestNotificationBtn.textContent = "提醒已被禁用";
      return;
    }

    elements.notificationState.textContent = "可按需开启浏览器提醒。";
    elements.requestNotificationBtn.textContent = "开启浏览器提醒";
  }

  function checkReminderDue() {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    const now = new Date();
    const today = toISODate(now);

    state.tasks
      .filter(function (task) {
        return task.dueDate === today && !isTerminalStatus(task.status) && task.reminderTime;
      })
      .forEach(function (task) {
        const reminderDate = combineDateAndTime(task.dueDate, task.reminderTime);
        const delta = now.getTime() - reminderDate.getTime();
        const key = buildReminderKey(task.id, task.dueDate);

        if (state.reminderLog[key]) {
          return;
        }

        if (delta >= 0 && delta <= 15 * 60 * 1000) {
          new Notification("待办提醒：" + task.title, {
            body: buildReminderBody(task),
          });
          state.reminderLog[key] = new Date().toISOString();
          persistState({ updateTimestamp: false });
        }
      });
  }

  function buildReminderBody(task) {
    const timeLabel = task.reminderTime ? task.reminderTime : "未设提醒时间";
    const notes = task.notes ? "，备注：" + task.notes : "";
    return timeLabel + " · " + task.category + " · " + task.status + " · 当前进度 " + task.progress + "%" + notes;
  }

  function appendTasks(tasks) {
    state.tasks = sortTasks(state.tasks.concat(tasks.map(sanitizeTask).filter(Boolean)));
    persistState();
  }

  function mutateTask(taskId, updater) {
    let previousTask = null;
    let updatedTask = null;

    state.tasks = state.tasks.map(function (task) {
      if (task.id !== taskId) {
        return task;
      }

      previousTask = task;
      updatedTask = sanitizeTask(updater({ ...task }));
      return updatedTask;
    });

    if (!updatedTask) {
      return null;
    }

    const createdRepeat = maybeCreateNextRepeatTask(previousTask, updatedTask);
    state.tasks = sortTasks(state.tasks);
    persistState();
    return {
      task: updatedTask,
      createdRepeat: createdRepeat,
    };
  }

  function maybeCreateNextRepeatTask(previousTask, updatedTask) {
    if (!previousTask || !updatedTask) {
      return false;
    }

    if (previousTask.status === "已完成" || updatedTask.status !== "已完成" || updatedTask.repeat === "none") {
      return false;
    }

    const nextDueDate = getNextRepeatDate(updatedTask.dueDate, updatedTask.repeat);
    const templateId = updatedTask.templateId || updatedTask.id;

    const exists = state.tasks.some(function (task) {
      return task.id !== updatedTask.id && task.templateId === templateId && task.dueDate === nextDueDate;
    });

    if (exists) {
      return false;
    }

    state.tasks.push(
      sanitizeTask({
        ...updatedTask,
        id: createId(),
        dueDate: nextDueDate,
        status: "未开始",
        progress: 0,
        completedAt: "",
        skippedAt: "",
        postponedAt: "",
        carryOverFrom: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        templateId: templateId,
      })
    );

    return true;
  }

  function applyStatusChange(task, nextStatus) {
    const status = STATUS_VALUES.includes(nextStatus) ? nextStatus : deriveStatusFromProgress(task.progress);
    const now = new Date().toISOString();

    if (status === "已完成") {
      return sanitizeTask({
        ...task,
        status: "已完成",
        progress: 100,
        completedAt: now,
        skippedAt: "",
        postponedAt: "",
        updatedAt: now,
      });
    }

    if (status === "进行中") {
      return sanitizeTask({
        ...task,
        status: "进行中",
        progress: task.progress > 0 && task.progress < 100 ? task.progress : 25,
        completedAt: "",
        skippedAt: "",
        postponedAt: "",
        updatedAt: now,
      });
    }

    if (status === "已延期") {
      return sanitizeTask({
        ...task,
        status: "已延期",
        progress: task.progress >= 100 ? 75 : task.progress,
        completedAt: "",
        skippedAt: "",
        postponedAt: now,
        updatedAt: now,
      });
    }

    if (status === "已跳过") {
      return sanitizeTask({
        ...task,
        status: "已跳过",
        skippedAt: now,
        completedAt: "",
        updatedAt: now,
      });
    }

    return sanitizeTask({
      ...task,
      status: "未开始",
      progress: 0,
      completedAt: "",
      skippedAt: "",
      postponedAt: "",
      updatedAt: now,
    });
  }

  function applyProgressChange(task, rawValue) {
    const progress = clamp(Number(rawValue) || 0, 0, 100);
    const now = new Date().toISOString();
    return sanitizeTask({
      ...task,
      progress: progress,
      status: deriveStatusFromProgress(progress),
      completedAt: progress >= 100 ? now : "",
      skippedAt: "",
      postponedAt: "",
      updatedAt: now,
    });
  }

  function postponeTaskToTomorrow(task) {
    const now = new Date().toISOString();
    return sanitizeTask({
      ...task,
      dueDate: toISODate(addDays(parseISODate(task.dueDate), 1)),
      status: "已延期",
      completedAt: "",
      skippedAt: "",
      postponedAt: now,
      updatedAt: now,
    });
  }

  function parseBatchInput(input, defaults) {
    const rows = [];
    const validTasks = [];

    input.split(/\r?\n/).forEach(function (rawLine, index) {
      const line = rawLine.trim();
      if (!line) {
        return;
      }

      const parsed = parseTaskLine(line, defaults);
      if (parsed.ok) {
        rows.push({
          lineNumber: index + 1,
          raw: line,
          status: "valid",
          task: parsed.task,
        });
        validTasks.push(parsed.task);
      } else {
        rows.push({
          lineNumber: index + 1,
          raw: line,
          status: "error",
          error: parsed.error,
        });
      }
    });

    return {
      rows: rows,
      validTasks: validTasks,
      errorCount: rows.filter(function (row) {
        return row.status === "error";
      }).length,
    };
  }

  function parseTaskLine(line, defaults) {
    try {
      const segments = line.split("|").map(function (part) {
        return part.trim();
      });

      if (!segments.some(Boolean)) {
        throw createParseError("field");
      }

      if (segments.some(function (segment) {
        return segment === "";
      })) {
        throw createParseError("field");
      }

      let title = segments[0];
      let category = defaults.category;
      let reminderTime = defaults.reminderTime;
      const notes = [];

      const leadingTimeMatch = title.match(/^([^\s]+)\s+(.+)$/);
      if (leadingTimeMatch) {
        const leadingToken = leadingTimeMatch[1];
        if (looksLikeTimeToken(leadingToken)) {
          const normalizedLeadingTime = normalizeTime(leadingToken);
          if (!normalizedLeadingTime) {
            throw createParseError("time");
          }
          reminderTime = normalizedLeadingTime;
          title = leadingTimeMatch[2].trim();
        }
      } else if (looksLikeTimeToken(title)) {
        throw createParseError("missingTitle");
      }

      if (!title) {
        throw createParseError("missingTitle");
      }

      const trailingSegments = segments.slice(1);
      if (trailingSegments.length) {
        const firstTrailing = trailingSegments[0];
        if (CATEGORY_VALUES.includes(firstTrailing)) {
          category = firstTrailing;
          trailingSegments.shift();
        } else if (looksLikeTimeToken(firstTrailing)) {
          const normalizedFirstTrailingTime = normalizeTime(firstTrailing);
          if (!normalizedFirstTrailingTime) {
            throw createParseError("time");
          }
          reminderTime = normalizedFirstTrailingTime;
          trailingSegments.shift();
        } else if (trailingSegments.length >= 2) {
          throw createParseError("category");
        }
      }

      trailingSegments.forEach(function (segment) {
        if (CATEGORY_VALUES.includes(segment)) {
          category = segment;
          return;
        }

        if (looksLikeTimeToken(segment)) {
          const normalizedSegmentTime = normalizeTime(segment);
          if (!normalizedSegmentTime) {
            throw createParseError("time");
          }
          reminderTime = normalizedSegmentTime;
          return;
        }

        notes.push(segment);
      });

      return {
        ok: true,
        task: sanitizeTask({
          id: createId(),
          title: title,
          notes: notes.join(" / "),
          category: category,
          priority: defaults.priority,
          dueDate: defaults.dueDate,
          reminderTime: reminderTime,
          status: "未开始",
          progress: 0,
          repeat: defaults.repeat,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      };
    } catch (error) {
      return {
        ok: false,
        error: error && error.message ? error.message : createParseError("field").message,
      };
    }
  }

  function createParseError(type) {
    if (type === "time") {
      return new Error("时间格式错误");
    }
    if (type === "missingTitle") {
      return new Error("缺少任务标题");
    }
    if (type === "category") {
      return new Error("分类无法识别");
    }
    return new Error("字段异常");
  }

  function looksLikeTimeToken(value) {
    return typeof value === "string" && value.includes(":");
  }

  function getBatchDefaults() {
    return {
      dueDate: state.ui.selectedDate,
      category: elements.defaultCategory.value,
      priority: elements.defaultPriority.value,
      reminderTime: normalizeTime(elements.defaultReminderTime.value),
      repeat: REPEAT_VALUES.includes(elements.defaultRepeat.value) ? elements.defaultRepeat.value : "none",
    };
  }

  function renderAll() {
    syncControlsWithState();
    renderMetaStrip();
    renderBatchPreview();
    renderTodayOverview();
    renderSelectedDateSummary();
    renderSummaryCards();
    renderTodayTaskList();
    renderCalendar();
    renderTaskFilters();
    renderTaskList();
    renderTimeline();
    renderPendingList();
    renderSidePanel();
    renderStatsTable();
    renderStorageMeta();
  }

  function syncControlsWithState() {
    elements.plannerDate.value = state.ui.selectedDate;
    elements.categoryFilter.value = state.ui.categoryFilter;
    elements.priorityFilter.value = state.ui.priorityFilter;
    elements.taskSearchInput.value = state.ui.searchQuery;
  }

  function renderMetaStrip() {
    if (!state.meta.lastSavedAt && !state.meta.lastExportedAt) {
      elements.statusMetaText.textContent = "本地自动保存已就绪";
      return;
    }

    const parts = [];
    parts.push(state.meta.lastSavedAt ? "最近保存 " + formatDateTime(state.meta.lastSavedAt) : "尚未保存");
    parts.push(state.meta.lastExportedAt ? "最近导出 " + formatDateTime(state.meta.lastExportedAt) : "尚未导出");
    elements.statusMetaText.textContent = parts.join(" · ");
  }

  function renderBatchPreview() {
    const preview = runtime.batchPreview;
    if (!preview || !preview.rows.length) {
      elements.batchPreviewPanel.classList.add("is-hidden");
      elements.batchPreviewSummary.textContent = "尚未解析。";
      elements.batchValidMeta.textContent = "0 条";
      elements.batchErrorMeta.textContent = "0 条";
      elements.batchValidList.innerHTML = "";
      elements.batchErrorList.innerHTML = "";
      elements.confirmPreviewBtn.disabled = true;
      return;
    }

    const validRows = preview.rows.filter(function (row) {
      return row.status === "valid";
    });
    const errorRows = preview.rows.filter(function (row) {
      return row.status === "error";
    });

    elements.batchPreviewPanel.classList.remove("is-hidden");
    elements.confirmPreviewBtn.disabled = !preview.validTasks.length;
    elements.batchPreviewSummary.textContent =
      "将生成 " +
      validRows.length +
      " 条，跳过 " +
      errorRows.length +
      " 条。";
    elements.batchValidMeta.textContent = validRows.length + " 条";
    elements.batchErrorMeta.textContent = errorRows.length + " 条";

    elements.batchValidList.innerHTML = validRows.length
      ? validRows
          .map(function (row) {
            const task = row.task;
            return (
              '<article class="preview-row is-valid">' +
              '<div class="preview-row-head">' +
              '<span class="preview-line">第 ' +
              row.lineNumber +
              " 行</span>" +
              '<span class="status-chip status-in-progress">可导入</span>' +
              "</div>" +
              "<strong>" +
              escapeHtml(task.title) +
              "</strong>" +
              '<div class="preview-tags">' +
              '<span class="tag">' +
              escapeHtml(task.category) +
              "</span>" +
              '<span class="tag">' +
              escapeHtml(task.priority + "优先级") +
              "</span>" +
              '<span class="tag">' +
              escapeHtml(task.reminderTime || "未设提醒") +
              "</span>" +
              (task.repeat !== "none" ? '<span class="tag">' + escapeHtml(REPEAT_LABELS[task.repeat]) + "</span>" : "") +
              "</div>" +
              (task.notes ? '<div class="preview-supporting">' + escapeHtml(task.notes) + "</div>" : "") +
              "</article>"
            );
          })
          .join("")
      : buildEmptyState("当前没有可导入项。", "先修正输入格式，再重新生成预览。");

    elements.batchErrorList.innerHTML = errorRows.length
      ? errorRows
          .map(function (row) {
            return (
              '<article class="preview-row is-error">' +
              '<div class="preview-row-head">' +
              '<span class="preview-line">第 ' +
              row.lineNumber +
              " 行</span>" +
              '<span class="status-chip status-overdue">需修正</span>' +
              "</div>" +
              '<div class="preview-error-body">' +
              '<div class="preview-reason-badge">' +
              escapeHtml(row.error) +
              "</div>" +
              '<div class="preview-raw">' +
              escapeHtml(row.raw) +
              "</div>" +
              '<div class="preview-supporting">' +
              "原因：" +
              escapeHtml(row.error) +
              "</div>" +
              '<div class="preview-error-actions">' +
              '<button class="text-btn preview-jump-btn" type="button" data-jump-error-line="' +
              row.lineNumber +
              '" aria-label="定位到第 ' +
              row.lineNumber +
              ' 行输入">' +
              "定位此行" +
              "</button>" +
              "</div>" +
              "</div>" +
              "</article>"
            );
          })
          .join("")
      : buildEmptyState("没有错误项。", "当前预览里的任务都可以直接导入。");
  }

  function renderSidePanel() {
    Array.from(elements.sideTabs.querySelectorAll("[data-side-tab]")).forEach(function (button) {
      const selected = button.dataset.sideTab === state.ui.sideTab;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
      button.tabIndex = selected ? 0 : -1;
    });
    const showTimeline = state.ui.sideTab === "timeline";
    elements.timelinePanel.classList.toggle("is-hidden", !showTimeline);
    elements.timelinePanel.hidden = !showTimeline;
    elements.timelinePanel.setAttribute("aria-hidden", showTimeline ? "false" : "true");
    elements.pendingPanel.classList.toggle("is-hidden", showTimeline);
    elements.pendingPanel.hidden = showTimeline;
    elements.pendingPanel.setAttribute("aria-hidden", showTimeline ? "true" : "false");
  }

  function renderTodayOverview() {
    const today = toISODate(new Date());
    const todayTasks = sortTasks(getTasksForDate(today));
    const todayStats = createStats(todayTasks, today);

    elements.todayDisplayDate.textContent = formatDisplayDate(today);
    elements.heroTodayRate.textContent = todayStats.completionRate + "%";
    elements.todaySummaryText.textContent = todayTasks.length
      ? "今天共 " +
        todayStats.total +
        " 项，已完成 " +
        todayStats.done +
        " 项，待推进 " +
        todayStats.open +
        " 项。"
      : "今天还没有任务，先在中间的快速录入区补上今天要做的事情。";

    const summaryItems = [
      { label: "总任务", value: todayStats.total },
      { label: "已完成", value: todayStats.done },
      { label: "进行中", value: todayStats.inProgress },
      { label: "未开始", value: todayStats.notStarted },
      { label: "逾期", value: todayStats.overdue },
      { label: "待提醒", value: todayStats.reminderCount },
    ];

    elements.todaySummaryChips.innerHTML = summaryItems
      .map(function (item) {
        return (
          '<div class="summary-chip">' +
          "<span>" +
          escapeHtml(item.label) +
          "</span>" +
          "<strong>" +
          item.value +
          "</strong>" +
          "</div>"
        );
      })
      .join("");
  }

  function renderSelectedDateSummary() {
    const selectedTasks = getTasksForDate(state.ui.selectedDate);
    const selectedStats = createStats(selectedTasks, toISODate(new Date()));

    elements.selectedDateLabel.textContent = formatDisplayDate(state.ui.selectedDate);
    elements.selectedDateSummary.textContent = selectedTasks.length
      ? "共 " +
        selectedStats.total +
        " 项 · 完成率 " +
        selectedStats.completionRate +
        "% · 未完成 " +
        selectedStats.open +
        " 项 · 逾期 " +
        selectedStats.overdue +
        " 项"
      : "这一天还没有任务，点击别的日期或先新增。";
  }

  function renderSummaryCards() {
    const periodStats = createPeriodStats();
    const cards = [
      {
        title: "本周",
        label: periodStats.week.label,
        stats: periodStats.week,
      },
      {
        title: "本月",
        label: periodStats.month.label,
        stats: periodStats.month,
      },
      {
        title: "本年",
        label: periodStats.year.label,
        stats: periodStats.year,
      },
    ];

    elements.summaryCards.innerHTML = cards
      .map(function (item) {
        return (
          '<article class="summary-card">' +
          '<div class="summary-card-head">' +
          "<div>" +
          "<h3>" +
          escapeHtml(item.title) +
          "</h3>" +
          '<div class="muted-text">' +
          escapeHtml(item.label) +
          "</div>" +
          "</div>" +
          "<strong>" +
          item.stats.completionRate +
          "%</strong>" +
          "</div>" +
          '<div class="progress-track"><span class="progress-fill" style="width:' +
          item.stats.completionRate +
          '%;"></span></div>' +
          '<div class="summary-stat-list">' +
          '<div class="summary-stat-item">' +
          "<span>已完成 / 总数</span>" +
          "<strong>" +
          item.stats.done +
          " / " +
          item.stats.total +
          "</strong>" +
          "</div>" +
          '<div class="summary-stat-item">' +
          "<span>逾期</span>" +
          "<strong>" +
          item.stats.overdue +
          "</strong>" +
          "</div>" +
          '<div class="summary-stat-item">' +
          "<span>平均进度</span>" +
          "<strong>" +
          item.stats.averageProgress +
          "%</strong>" +
          "</div>" +
          "</div>" +
          '<p class="summary-recap">' +
          escapeHtml(item.stats.recap) +
          "</p>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderTodayTaskList() {
    const today = toISODate(new Date());
    const allTodayTasks = sortTasks(getTasksForDate(today));
    const openTasks = allTodayTasks.filter(function (task) {
      return !isTerminalStatus(task.status);
    });
    const handledTasks = allTodayTasks.filter(function (task) {
      return isTerminalStatus(task.status);
    });
    elements.todayTaskCount.textContent = !allTodayTasks.length
      ? "0 项"
      : openTasks.length
        ? openTasks.length + " 项待推进" + (handledTasks.length ? " · 已处理 " + handledTasks.length + " 项" : "")
        : "已处理 " + handledTasks.length + " 项";

    if (!allTodayTasks.length) {
      elements.todayTaskList.innerHTML = buildEmptyState("今天还没有任务。", "先在快速录入区写下今天早上要做的事情。");
      return;
    }

    const openMarkup = openTasks.length
      ? openTasks.map(function (task) {
          return buildTodayTaskItem(task, false);
        }).join("")
      : '<div class="today-inline-note">今天待推进事项已处理完，下面保留已处理记录。</div>';

    const handledMarkup = handledTasks.length
      ? '<details class="today-completed-fold">' +
        "<summary>" +
        escapeHtml(getHandledTaskSummaryText(handledTasks)) +
        "</summary>" +
        '<div class="today-completed-list">' +
        handledTasks.map(function (task) {
          return buildTodayTaskItem(task, true);
        }).join("") +
        "</div>" +
        "</details>"
      : "";

    elements.todayTaskList.innerHTML = openMarkup + handledMarkup;
  }

  function buildTodayTaskItem(task, isHandled) {
    const action = isHandled
      ? "focus-task"
      : shouldOfferQuickComplete(task)
        ? "quick-complete"
        : "focus-task";
    const actionLabel = isHandled ? "查看" : action === "quick-complete" ? "完成" : "继续";
    const actionMarkup = isHandled
      ? ""
      : '<button class="text-btn today-task-button" type="button" data-action="' +
        action +
        '" data-task-id="' +
        task.id +
        '">' +
        actionLabel +
        "</button>";

    return (
      '<article class="today-task-item' +
      (isHandled ? " is-completed" : "") +
      '" data-task-focus="' +
      task.id +
      '">' +
      '<div class="today-task-main">' +
      "<h3>" +
      escapeHtml(task.title) +
      "</h3>" +
      '<div class="today-task-meta">' +
      "<span>" +
      escapeHtml(task.reminderTime || "时间待定") +
      "</span>" +
      '<span class="status-chip status-' +
      getStatusClassName(task.status) +
      '">' +
      escapeHtml(task.status) +
      "</span>" +
      "</div>" +
      "</div>" +
      actionMarkup +
      "</article>"
    );
  }

  function getHandledTaskSummaryText(tasks) {
    const doneCount = tasks.filter(function (task) {
      return task.status === "已完成";
    }).length;

    if (doneCount === tasks.length) {
      return "已完成 " + doneCount + " 项，点击展开查看";
    }

    return "已处理 " + tasks.length + " 项，点击展开查看";
  }

  function renderCalendar() {
    const year = state.ui.calendarYear;
    const month = state.ui.calendarMonth;
    const today = toISODate(new Date());

    elements.calendarTitle.textContent = year + " 年 " + (month + 1) + " 月任务分布";

    const firstDay = new Date(year, month, 1);
    const offset = convertSundayStartToMonday(firstDay.getDay());
    const calendarStart = addDays(firstDay, -offset);
    const dayButtons = [];

    for (let index = 0; index < 42; index += 1) {
      const currentDate = addDays(calendarStart, index);
      const isoDate = toISODate(currentDate);
      const dayTasks = getTasksForDate(isoDate);
      const dayStats = createStats(dayTasks, today);
      const classes = [
        "calendar-day",
        currentDate.getMonth() !== month ? "is-outside" : "",
        isoDate === today ? "is-today" : "",
        isoDate === state.ui.selectedDate ? "is-selected" : "",
        dayStats.overdue ? "is-overdue" : "",
        dayStats.total > 0 && dayStats.open === 0 ? "is-complete" : "",
      ]
        .filter(Boolean)
        .join(" ");

      const summaryText = getCalendarSummaryText(dayStats);
      const summaryClass = !dayStats.total
        ? "is-empty"
        : dayStats.overdue
          ? "is-warning"
          : dayStats.total > 0 && dayStats.open === 0
            ? "is-positive"
            : "";
      const calendarRate = dayStats.total ? dayStats.completionRate + "%" : "--";
      const summaryMarkup = buildCalendarSummaryMarkup(dayStats);

      dayButtons.push(
        '<button class="' +
          classes +
          '" type="button" data-date="' +
          isoDate +
          '" aria-label="' +
          escapeHtml(formatDisplayDate(isoDate) + "，完成率 " + calendarRate + "，" + summaryText) +
          '">' +
          '<div class="calendar-day-head">' +
          '<span class="date-number">' +
          currentDate.getDate() +
          "</span>" +
          '<span class="calendar-rate">' +
          calendarRate +
          "</span>" +
          "</div>" +
          '<div class="calendar-progress-track' +
          (dayStats.overdue ? " is-danger" : "") +
          '"><span class="calendar-progress-fill" style="width:' +
          dayStats.averageProgress +
          '%;"></span></div>' +
          '<div class="calendar-summary ' +
          summaryClass +
          '">' +
          summaryMarkup +
          "</div>" +
          "</button>"
      );
    }

    elements.calendarGrid.innerHTML = dayButtons.join("");
  }

  function renderTaskFilters() {
    Array.from(elements.taskFilters.querySelectorAll("[data-filter]")).forEach(function (button) {
      const active = button.dataset.filter === state.ui.filter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function renderTaskList() {
    const tasks = getVisibleTasks();
    elements.taskResultMeta.textContent = buildTaskResultMeta(tasks.length);

    if (!tasks.length) {
      elements.taskList.innerHTML = buildEmptyState("当前筛选条件下没有任务。", "你可以切换筛选条件，或者先新增新的待办事项。");
      return;
    }

    elements.taskList.innerHTML = renderTaskCards(tasks);
  }

  function renderTaskCards(tasks) {
    return tasks
      .map(function (task) {
        const statusClass = getStatusClassName(task.status);
        const overdue = isOverdue(task, toISODate(new Date()));
        const repeatLabel = task.repeat !== "none" ? REPEAT_LABELS[task.repeat] : "";
        const noteSummary = task.notes ? "备注：" + truncateText(task.notes, 36) : "无备注";
        const timeLabel = getTaskTimeLabel(task);
        const dateTag = getRelativeDateLabel(task.dueDate);
        const primaryAction = buildTaskPrimaryAction(task);
        const carryOverLabel = task.carryOverFrom ? "延续任务" : "";

        return (
          '<article class="task-card" id="task-card-' +
          task.id +
          '" data-task-card="true" data-task-id="' +
          task.id +
          '">' +
          '<div class="task-card-body">' +
          '<div class="task-row task-row-head">' +
          '<div class="task-title-wrap">' +
          "<h3>" +
          escapeHtml(task.title) +
          "</h3>" +
          "</div>" +
          '<div class="task-head-badges">' +
          '<span class="status-chip status-' +
          statusClass +
          '">' +
          escapeHtml(task.status) +
          "</span>" +
          '<span class="priority-chip priority-' +
          priorityClassName(task.priority) +
          '">' +
          escapeHtml(task.priority + "优先级") +
          "</span>" +
          (overdue ? '<span class="status-chip status-overdue">已逾期</span>' : "") +
          "</div>" +
          "</div>" +

          '<div class="task-row task-row-meta">' +
          '<span class="meta-chip">' +
          escapeHtml(task.category) +
          "</span>" +
          '<span class="meta-chip">' +
          escapeHtml(timeLabel) +
          "</span>" +
          '<span class="meta-chip">' +
          escapeHtml(dateTag) +
          "</span>" +
          (repeatLabel ? '<span class="meta-chip">' + escapeHtml(repeatLabel) + "</span>" : "") +
          (carryOverLabel ? '<span class="meta-chip meta-chip-carryover">' + escapeHtml(carryOverLabel) + "</span>" : "") +
          '<span class="task-supporting">' +
          escapeHtml(noteSummary) +
          "</span>" +
          "</div>" +

          '<div class="task-row task-row-progress">' +
          '<div class="task-progress-inline">' +
          '<div class="task-progress-copy">' +
          "<span>当前进度</span>" +
          "<strong data-progress-value=\"true\" data-task-id=\"" +
          task.id +
          "\">" +
          task.progress +
          "%</strong>" +
          "</div>" +
          '<div class="task-progress-track' +
          (overdue ? " is-danger" : "") +
          '"><span class="task-progress-fill" data-progress-fill="true" data-task-id="' +
          task.id +
          '" style="width:' +
          task.progress +
          '%;"></span></div>' +
          '<label class="task-status-inline" aria-label="切换 ' +
          escapeHtml(task.title) +
          ' 的状态"><span>状态</span><select class="subtle-select" data-status-select="true" data-task-id="' +
          task.id +
          '" aria-label="切换 ' +
          escapeHtml(task.title) +
          ' 的状态">' +
          buildOptionsHtml(STATUS_VALUES, task.status, function (value) {
            return value;
          }) +
          "</select></label>" +
          "</div>" +
          '<div class="task-progress-controls">' +
          '<input type="range" min="0" max="100" step="5" value="' +
          task.progress +
          '" data-progress-range="true" data-task-id="' +
          task.id +
          '" aria-label="调整 ' +
          escapeHtml(task.title) +
          ' 的进度">' +
          "</div>" +

          '<div class="task-row task-row-actions">' +
          primaryAction +
          '<button class="secondary-btn task-inline-btn" type="button" data-action="toggle-edit" data-task-id="' +
          task.id +
          '">' +
          (runtime.editingTaskId === task.id ? "收起编辑" : "编辑") +
          "</button>" +
          (!isTerminalStatus(task.status)
            ? '<button class="secondary-btn task-inline-btn desktop-postpone-btn" type="button" data-action="postpone" data-task-id="' +
              task.id +
              '">延期到明天</button>'
            : "") +
          '<details class="more-actions">' +
          "<summary>更多</summary>" +
          '<div class="more-actions-menu">' +
          (!isTerminalStatus(task.status)
            ? '<button class="ghost-btn mobile-postpone-btn" type="button" data-action="postpone" data-task-id="' + task.id + '">延期到明天</button>'
            : "") +
          (task.status !== "已跳过"
            ? '<button class="ghost-btn" type="button" data-action="skip" data-task-id="' + task.id + '">跳过</button>'
            : "") +
          '<button class="ghost-btn" type="button" data-action="jump-date" data-task-id="' +
          task.id +
          '">定位日期</button>' +
          '<button class="ghost-btn more-danger" type="button" data-action="delete" data-task-id="' +
          task.id +
          '">删除</button>' +
          "</div>" +
          "</details>" +
          "</div>" +

          (runtime.editingTaskId === task.id ? buildTaskEditForm(task) : "") +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function shouldOfferQuickComplete(task) {
    return task.progress >= 75 || (task.status === "已延期" && task.progress >= 50);
  }

  function getCalendarSummaryText(dayStats) {
    if (!dayStats.total) {
      return "无任务";
    }

    if (!dayStats.open) {
      return "全部完成";
    }

    if (dayStats.overdue && dayStats.reminderCount) {
      return "未完 " + dayStats.open + " · 逾期 " + dayStats.overdue + " · 提醒 " + dayStats.reminderCount;
    }

    if (dayStats.overdue) {
      return "未完 " + dayStats.open + " · 逾期 " + dayStats.overdue;
    }

    if (dayStats.reminderCount) {
      return "未完 " + dayStats.open + " · 提醒 " + dayStats.reminderCount;
    }

    return "待做 " + dayStats.open + " 项";
  }

  function buildCalendarSummaryMarkup(dayStats) {
    if (!dayStats.total) {
      return '<span class="calendar-summary-quiet">无任务</span>';
    }

    if (!dayStats.open) {
      return '<span class="calendar-summary-badge is-positive">全部完成</span>';
    }

    const parts = ['<span class="calendar-summary-badge is-open"><strong>' + dayStats.open + '</strong><span>未完</span></span>'];

    if (dayStats.overdue && dayStats.reminderCount) {
      parts.push(
        '<span class="calendar-summary-badge is-mixed"><strong>' +
          dayStats.overdue +
          '</strong><span>逾期</span><em>提醒 ' +
          dayStats.reminderCount +
          "</em></span>"
      );
    } else if (dayStats.overdue) {
      parts.push('<span class="calendar-summary-badge is-warning"><strong>' + dayStats.overdue + '</strong><span>逾期</span></span>');
    } else if (dayStats.reminderCount) {
      parts.push('<span class="calendar-summary-badge is-reminder"><strong>' + dayStats.reminderCount + '</strong><span>提醒</span></span>');
    }

    return parts.join("");
  }

  function truncateText(text, maxLength) {
    const value = String(text || "").trim();
    if (!value || value.length <= maxLength) {
      return value;
    }
    return value.slice(0, maxLength - 1) + "…";
  }

  function buildTaskPrimaryAction(task) {
    if (task.status === "已完成") {
      return '<button class="main-action-btn is-disabled" type="button" disabled>已完成</button>';
    }

    if (task.status === "已跳过") {
      return '<button class="main-action-btn is-disabled" type="button" disabled>已跳过</button>';
    }

    return '<button class="main-action-btn" type="button" data-action="mark-complete" data-task-id="' + task.id + '">完成</button>';
  }

  function getTaskTimeLabel(task) {
    return task.reminderTime || "时间待定";
  }

  function getRelativeDateLabel(isoDate) {
    const today = toISODate(new Date());
    const tomorrow = toISODate(addDays(parseISODate(today), 1));
    return isoDate === today
      ? "今天"
      : isoDate === tomorrow
        ? "明天"
        : formatShortDate(isoDate);
  }

  function formatShortDate(isoDate) {
    const date = parseISODate(isoDate);
    return date.getMonth() + 1 + "月" + date.getDate() + "日";
  }

  function buildTaskEditForm(task) {
    return (
      '<form class="task-edit-form" data-edit-form="true" data-task-id="' +
      task.id +
      '">' +
      '<div class="task-edit-grid">' +
      '<label class="field field-wide"><span>任务标题</span><input name="title" type="text" value="' +
      escapeHtml(task.title) +
      '" required></label>' +
      '<label class="field"><span>日期</span><input name="dueDate" type="date" value="' +
      escapeHtml(task.dueDate) +
      '"></label>' +
      '<label class="field"><span>提醒时间</span><input name="reminderTime" type="time" value="' +
      escapeHtml(task.reminderTime) +
      '"></label>' +
      '<label class="field"><span>分类</span><select name="category">' +
      buildOptionsHtml(CATEGORY_VALUES, task.category, function (value) {
        return value;
      }) +
      "</select></label>" +
      '<label class="field"><span>优先级</span><select name="priority">' +
      buildOptionsHtml(PRIORITY_VALUES, task.priority, function (value) {
        return value;
      }) +
      "</select></label>" +
      '<label class="field"><span>重复模板</span><select name="repeat">' +
      buildOptionsHtml(REPEAT_VALUES, task.repeat, function (value) {
        return REPEAT_LABELS[value];
      }) +
      "</select></label>" +
      '<label class="field field-wide"><span>备注</span><textarea name="notes" rows="3">' +
      escapeHtml(task.notes) +
      "</textarea></label>" +
      "</div>" +
      '<div class="task-action-row">' +
      '<button class="primary-btn" type="submit">保存编辑</button>' +
      '<button class="secondary-btn" type="button" data-action="cancel-edit" data-task-id="' +
      task.id +
      '">取消</button>' +
      "</div>" +
      "</form>"
    );
  }

  function renderTimeline() {
    const tasks = sortTasks(getTasksForDate(state.ui.selectedDate));
    if (!tasks.length) {
      elements.timelineList.innerHTML = buildEmptyState("这一天还没有安排任务。", "先在快速录入区输入事项，或点击其他日期查看。");
      return;
    }

    elements.timelineList.innerHTML = tasks
      .map(function (task) {
        const overdue = isOverdue(task, toISODate(new Date()));
        return (
          '<article class="timeline-item">' +
          '<div class="timeline-time">' +
          escapeHtml(task.reminderTime || "待定") +
          "</div>" +
          '<div class="timeline-main">' +
          "<h3>" +
          escapeHtml(task.title) +
          "</h3>" +
          '<div class="timeline-meta">' +
          '<span class="meta-chip">' +
          escapeHtml(task.category) +
          "</span>" +
          '<span class="status-chip status-' +
          getStatusClassName(task.status) +
          '">' +
          escapeHtml(task.status) +
          "</span>" +
          '<span class="result-pill">进度 ' +
          task.progress +
          "%</span>" +
          (overdue ? '<span class="status-chip status-overdue">已逾期</span>' : "") +
          "</div>" +
          (task.notes ? '<div class="timeline-meta">' + escapeHtml(task.notes) + "</div>" : "") +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderPendingList() {
    const today = toISODate(new Date());
    const pendingTasks = state.tasks
      .filter(function (task) {
        return !isTerminalStatus(task.status);
      })
      .sort(function (left, right) {
        const leftOverdue = Number(isOverdue(left, today));
        const rightOverdue = Number(isOverdue(right, today));
        return (
          rightOverdue - leftOverdue ||
          left.dueDate.localeCompare(right.dueDate) ||
          PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority] ||
          left.progress - right.progress
        );
      })
      .slice(0, 6);

    if (!pendingTasks.length) {
      elements.pendingList.innerHTML = buildEmptyState("目前没有需要重点跟进的任务。", "新的未完成或逾期任务会显示在这里。");
      return;
    }

    elements.pendingList.innerHTML = pendingTasks
      .map(function (task) {
        const overdue = isOverdue(task, today);
        return (
          '<article class="pending-item">' +
          '<div class="pending-head">' +
          "<h3>" +
          escapeHtml(task.title) +
          "</h3>" +
          '<span class="status-chip status-' +
          getStatusClassName(task.status) +
          '">' +
          escapeHtml(task.status) +
          "</span>" +
          "</div>" +
          '<div class="pending-meta">' +
          '<span class="meta-chip">' +
          escapeHtml(formatDisplayDate(task.dueDate)) +
          "</span>" +
          '<span class="meta-chip">' +
          escapeHtml(task.category) +
          "</span>" +
          '<span class="priority-chip priority-' +
          priorityClassName(task.priority) +
          '">' +
          escapeHtml(task.priority + "优先级") +
          "</span>" +
          (overdue ? '<span class="status-chip status-overdue">已逾期</span>' : "") +
          "</div>" +
          '<div class="task-progress-track' +
          (overdue ? " is-danger" : "") +
          '"><span class="task-progress-fill" style="width:' +
          task.progress +
          '%;"></span></div>' +
          '<div class="muted-text">当前进度 ' +
          task.progress +
          "%</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderStatsTable() {
    const periodStats = createPeriodStats();
    const rows = [periodStats.week, periodStats.month, periodStats.year];

    elements.statsTableBody.innerHTML = rows
      .map(function (row) {
        return (
          "<tr>" +
          "<td>" +
          escapeHtml(row.label) +
          "</td>" +
          "<td>" +
          row.total +
          "</td>" +
          "<td>" +
          row.done +
          "</td>" +
          "<td>" +
          row.inProgress +
          "</td>" +
          "<td>" +
          row.notStarted +
          "</td>" +
          "<td>" +
          row.overdue +
          "</td>" +
          '<td class="stats-progress-cell"><div class="mini-bar-track"><span class="mini-bar-fill" style="width:' +
          row.averageProgress +
          '%;"></span></div><div class="muted-text">' +
          row.averageProgress +
          "%</div></td>" +
          "<td>" +
          row.completionRate +
          "%</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function renderStorageMeta() {
    elements.storageMeta.textContent =
      "v" +
      VERSION +
      " · " +
      state.tasks.length +
      " 项" +
      (state.meta.lastSavedAt ? " · 存 " + formatCompactMetaTime(state.meta.lastSavedAt) : "") +
      (state.meta.lastExportedAt ? " · 导 " + formatCompactMetaTime(state.meta.lastExportedAt) : "");
  }

  function buildTaskResultMeta(count) {
    const labels = {
      today: "今天",
      selected: "选中日期",
      all: "全部",
      open: "未完成",
      done: "已完成",
      overdue: "逾期",
    };
    return (labels[state.ui.filter] || "当前") + " · " + count + " 条";
  }

  function getVisibleTasks() {
    const today = toISODate(new Date());
    const search = state.ui.searchQuery.trim().toLowerCase();

    return sortTasks(
      state.tasks.filter(function (task) {
        const matchesFilter =
          state.ui.filter === "today"
            ? task.dueDate === today
            : state.ui.filter === "selected"
              ? task.dueDate === state.ui.selectedDate
              : state.ui.filter === "open"
                ? !isTerminalStatus(task.status)
                : state.ui.filter === "done"
                  ? task.status === "已完成"
                  : state.ui.filter === "overdue"
                    ? isOverdue(task, today)
                    : true;

        if (!matchesFilter) {
          return false;
        }

        const matchesCategory =
          state.ui.categoryFilter === "all" || task.category === state.ui.categoryFilter;
        if (!matchesCategory) {
          return false;
        }

        const matchesPriority =
          state.ui.priorityFilter === "all" || task.priority === state.ui.priorityFilter;
        if (!matchesPriority) {
          return false;
        }

        if (!search) {
          return true;
        }

        const haystack = [task.title, task.notes, task.category, task.priority, task.status].join(" ").toLowerCase();
        return haystack.includes(search);
      })
    );
  }

  function createPeriodStats() {
    const anchor = parseISODate(state.ui.selectedDate);
    const today = toISODate(new Date());
    const weekStart = startOfWeek(anchor);
    const weekEnd = addDays(weekStart, 6);
    const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    const yearStart = new Date(anchor.getFullYear(), 0, 1);
    const yearEnd = new Date(anchor.getFullYear(), 11, 31);
    const weekTasks = getTasksInRange(toISODate(weekStart), toISODate(weekEnd));
    const monthTasks = getTasksInRange(toISODate(monthStart), toISODate(monthEnd));
    const yearTasks = getTasksInRange(toISODate(yearStart), toISODate(yearEnd));
    const weekStats = createStats(weekTasks, today);
    const monthStats = createStats(monthTasks, today);
    const yearStats = createStats(yearTasks, today);

    return {
      week: {
        label: formatDisplayDate(toISODate(weekStart)) + " - " + formatDisplayDate(toISODate(weekEnd)),
        recap: buildPeriodRecap("week", weekStats, weekTasks),
        ...weekStats,
      },
      month: {
        label: anchor.getFullYear() + " 年 " + (anchor.getMonth() + 1) + " 月",
        recap: buildPeriodRecap("month", monthStats, monthTasks),
        ...monthStats,
      },
      year: {
        label: anchor.getFullYear() + " 年",
        recap: buildPeriodRecap("year", yearStats, yearTasks),
        ...yearStats,
      },
    };
  }

  function buildPeriodRecap(kind, stats, tasks) {
    if (!stats.total) {
      return kind === "year" ? "本年还没有任务记录。" : kind === "month" ? "本月还没有任务记录。" : "本周还没有任务记录。";
    }

    if (kind === "month") {
      const completedTasks = tasks.filter(function (task) {
        return task.status === "已完成";
      });
      const topCategory = getTopCategory(completedTasks.length ? completedTasks : tasks);
      return "本月累计完成 " + stats.done + " 项，当前最常见分类为 " + topCategory + "。";
    }

    if (kind === "year") {
      return "本年累计完成 " + stats.done + " 项，平均推进 " + stats.averageProgress + "%。";
    }

    return "本周已完成 " + stats.done + " 项，逾期 " + stats.overdue + " 项，平均推进 " + stats.averageProgress + "%。";
  }

  function getTopCategory(tasks) {
    if (!tasks.length) {
      return "暂无";
    }

    const counts = tasks.reduce(function (result, task) {
      result[task.category] = (result[task.category] || 0) + 1;
      return result;
    }, {});

    return Object.keys(counts).sort(function (left, right) {
      return counts[right] - counts[left] || CATEGORY_VALUES.indexOf(left) - CATEGORY_VALUES.indexOf(right);
    })[0];
  }

  function createStats(tasks, today) {
    const referenceDate = today || toISODate(new Date());
    const total = tasks.length;
    const done = tasks.filter(function (task) {
      return task.status === "已完成";
    }).length;
    const inProgress = tasks.filter(function (task) {
      return !isTerminalStatus(task.status) && task.progress > 0;
    }).length;
    const notStarted = tasks.filter(function (task) {
      return !isTerminalStatus(task.status) && task.progress === 0;
    }).length;
    const overdue = tasks.filter(function (task) {
      return isOverdue(task, referenceDate);
    }).length;
    const skipped = tasks.filter(function (task) {
      return task.status === "已跳过";
    }).length;
    const reminderCount = tasks.filter(function (task) {
      return Boolean(task.reminderTime);
    }).length;
    const open = tasks.filter(function (task) {
      return !isTerminalStatus(task.status);
    }).length;
    const averageProgress = total
      ? Math.round(
          tasks.reduce(function (sum, task) {
            return sum + task.progress;
          }, 0) / total
        )
      : 0;
    const completionRate = total ? Math.round((done / total) * 100) : 0;

    return {
      total: total,
      done: done,
      inProgress: inProgress,
      notStarted: notStarted,
      overdue: overdue,
      skipped: skipped,
      reminderCount: reminderCount,
      open: open,
      averageProgress: averageProgress,
      completionRate: completionRate,
    };
  }

  function getTasksForDate(isoDate) {
    return state.tasks.filter(function (task) {
      return task.dueDate === isoDate;
    });
  }

  function getTasksInRange(startDate, endDate) {
    return state.tasks.filter(function (task) {
      return task.dueDate >= startDate && task.dueDate <= endDate;
    });
  }

  function getTaskById(taskId) {
    return state.tasks.find(function (task) {
      return task.id === taskId;
    });
  }

  function sortTasks(tasks) {
    return tasks.slice().sort(function (left, right) {
      return (
        left.dueDate.localeCompare(right.dueDate) ||
        normalizedTimeForSort(left.reminderTime).localeCompare(normalizedTimeForSort(right.reminderTime)) ||
        PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority] ||
        left.createdAt.localeCompare(right.createdAt)
      );
    });
  }

  function hasSimilarTaskForDate(task, dueDate) {
    return state.tasks.some(function (item) {
      return (
        item.dueDate === dueDate &&
        item.title === task.title &&
        item.category === task.category &&
        item.reminderTime === task.reminderTime
      );
    });
  }

  function clearBatchPreview(options) {
    const config = options || {};
    const firstErrorLine = config.focusFirstError && runtime.batchPreview
      ? getFirstPreviewErrorLine(runtime.batchPreview)
      : 0;
    runtime.batchPreview = null;
    renderBatchPreview();
    if (firstErrorLine) {
      focusBatchInputAtLine(firstErrorLine);
    }
  }

  function getFirstPreviewErrorLine(preview) {
    const firstError = preview.rows.find(function (row) {
      return row.status === "error";
    });
    return firstError ? firstError.lineNumber : 0;
  }

  function focusBatchInputAtLine(lineNumber) {
    const textarea = elements.batchInput;
    const lines = textarea.value.split(/\r?\n/);
    let selectionStart = 0;

    for (let index = 0; index < lineNumber - 1; index += 1) {
      selectionStart += (lines[index] || "").length + 1;
    }

    const selectionEnd = selectionStart + (lines[lineNumber - 1] || "").length;
    textarea.focus();
    textarea.setSelectionRange(selectionStart, selectionEnd);
    const estimatedLineHeight = 28;
    textarea.scrollTop = Math.max(0, (lineNumber - 2) * estimatedLineHeight);
  }

  function persistState(options) {
    const config = options || {};
    if (config.updateTimestamp !== false) {
      state.meta.lastSavedAt = new Date().toISOString();
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: VERSION,
        meta: state.meta,
        tasks: state.tasks,
        ui: state.ui,
        reminderLog: state.reminderLog,
      })
    );

    renderMetaStrip();
    renderStorageMeta();
  }

  function shiftCalendarMonth(offset) {
    const nextDate = new Date(state.ui.calendarYear, state.ui.calendarMonth + offset, 1);
    state.ui.calendarYear = nextDate.getFullYear();
    state.ui.calendarMonth = nextDate.getMonth();
    if (!isDateInMonth(state.ui.selectedDate, state.ui.calendarYear, state.ui.calendarMonth)) {
      state.ui.selectedDate = toISODate(nextDate);
      state.ui.filter = state.ui.selectedDate === toISODate(new Date()) ? "today" : "selected";
    }
    persistState({ updateTimestamp: false });
    renderAll();
  }

  function buildSampleTasks() {
    const today = parseISODate(toISODate(new Date()));

    return [
      sanitizeTask({
        id: createId(),
        title: "晨跑 30 分钟",
        notes: "完成后顺手记录体感和步数。",
        category: "健康",
        priority: "高",
        dueDate: toISODate(today),
        reminderTime: "07:30",
        status: "已完成",
        progress: 100,
        repeat: "daily",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      sanitizeTask({
        id: createId(),
        title: "跟进客户报价",
        notes: "先确认价格表，再补发交期说明。",
        category: "工作",
        priority: "高",
        dueDate: toISODate(today),
        reminderTime: "09:00",
        status: "进行中",
        progress: 55,
        repeat: "none",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      sanitizeTask({
        id: createId(),
        title: "整理报销资料",
        notes: "核对发票照片和付款截图。",
        category: "财务",
        priority: "中",
        dueDate: toISODate(addDays(today, 1)),
        reminderTime: "16:30",
        status: "未开始",
        progress: 0,
        repeat: "monthly",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      sanitizeTask({
        id: createId(),
        title: "给父母打电话",
        notes: "确认周末体检和出门时间。",
        category: "家庭",
        priority: "中",
        dueDate: toISODate(addDays(today, -1)),
        reminderTime: "20:00",
        status: "已延期",
        progress: 25,
        repeat: "weekly",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      sanitizeTask({
        id: createId(),
        title: "复盘本周学习进度",
        notes: "确认下周优先章节。",
        category: "学习",
        priority: "低",
        dueDate: toISODate(addDays(today, 3)),
        reminderTime: "21:00",
        status: "未开始",
        progress: 0,
        repeat: "weekly",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ];
  }

  function buildReminderKey(taskId, dueDate) {
    return taskId + "::" + dueDate;
  }

  function buildEmptyState(title, copy) {
    return (
      '<div class="empty-state">' +
      "<h3>" +
      escapeHtml(title) +
      "</h3>" +
      '<div class="empty-copy">' +
      escapeHtml(copy) +
      "</div>" +
      "</div>"
    );
  }

  function showNotice(message, tone) {
    elements.appNotice.textContent = message;
    elements.appNotice.dataset.tone = tone || "success";
    elements.appNotice.classList.add("is-visible");
    window.clearTimeout(runtime.noticeTimer);
    runtime.noticeTimer = window.setTimeout(function () {
      elements.appNotice.classList.remove("is-visible");
    }, 4200);
  }

  function buildOptionsHtml(values, selectedValue, labelBuilder) {
    return values
      .map(function (value) {
        return (
          '<option value="' +
          escapeHtml(String(value)) +
          '"' +
          (String(value) === String(selectedValue) ? " selected" : "") +
          ">" +
          escapeHtml(labelBuilder(value)) +
          "</option>"
        );
      })
      .join("");
  }

  function deriveStatusFromProgress(progress) {
    if (progress >= 100) {
      return "已完成";
    }
    if (progress > 0) {
      return "进行中";
    }
    return "未开始";
  }

  function getStatusClassName(status) {
    if (status === "已完成") {
      return "completed";
    }
    if (status === "进行中") {
      return "in-progress";
    }
    if (status === "已延期") {
      return "postponed";
    }
    if (status === "已跳过") {
      return "skipped";
    }
    return "not-started";
  }

  function priorityClassName(priority) {
    if (priority === "高") {
      return "high";
    }
    if (priority === "中") {
      return "medium";
    }
    return "low";
  }

  function isTerminalStatus(status) {
    return status === "已完成" || status === "已跳过";
  }

  function isOverdue(task, today) {
    return task.dueDate < today && !isTerminalStatus(task.status);
  }

  function normalizedTimeForSort(value) {
    return value || "99:99";
  }

  function getNextRepeatDate(isoDate, repeat) {
    const date = parseISODate(isoDate);
    if (repeat === "daily") {
      return toISODate(addDays(date, 1));
    }
    if (repeat === "weekly") {
      return toISODate(addDays(date, 7));
    }
    if (repeat === "monthly") {
      return toISODate(getClampedMonthDate(date.getFullYear(), date.getMonth() + 1, date.getDate()));
    }
    return isoDate;
  }

  function isDateInMonth(isoDate, year, month) {
    const date = parseISODate(isoDate);
    return date.getFullYear() === year && date.getMonth() === month;
  }

  function getClampedMonthDate(year, month, day) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(day, lastDay));
  }

  function combineDateAndTime(isoDate, time) {
    const date = parseISODate(isoDate);
    const parts = normalizeTime(time).split(":").map(Number);
    date.setHours(parts[0] || 0, parts[1] || 0, 0, 0);
    return date;
  }

  function startOfWeek(date) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = convertSundayStartToMonday(copy.getDay());
    return addDays(copy, -day);
  }

  function addDays(date, amount) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
  }

  function convertSundayStartToMonday(day) {
    return day === 0 ? 6 : day - 1;
  }

  function parseISODate(isoDate) {
    const parts = isoDate.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function isISODate(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  function normalizeTime(value) {
    if (!value || typeof value !== "string") {
      return "";
    }

    const match = value.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      return "";
    }

    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return "";
    }

    return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "task-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function formatDisplayDate(isoDate) {
    const date = parseISODate(isoDate);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  }

  function formatDateTime(isoDateTime) {
    const date = new Date(isoDateTime);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatCompactMetaTime(isoDateTime) {
    const date = new Date(isoDateTime);
    return date.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
