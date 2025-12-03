const DEFAULT_BASE_URL = "";
let toastTimeoutId = null;

function getSettings() {
  const raw = localStorage.getItem("asanaBackupSettings");
  if (!raw) {
    return {
      baseUrl: DEFAULT_BASE_URL,
      authToken: ""
    };
  }
  try {
    return JSON.parse(raw);
  } catch {
    return {
      baseUrl: DEFAULT_BASE_URL,
      authToken: ""
    };
  }
}

function saveSettings(settings) {
  localStorage.setItem("asanaBackupSettings", JSON.stringify(settings));
}

function applySettingsToForm() {
  const settings = getSettings();
  const baseUrlInput = document.getElementById("base-url");
  const authInput = document.getElementById("auth-token");

  if (settings.baseUrl) {
    baseUrlInput.value = settings.baseUrl;
  }
  if (settings.authToken) {
    authInput.value = settings.authToken;
  }
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden", "toast-success", "toast-error");
  toast.classList.add("show");
  if (type === "success") {
    toast.classList.add("toast-success");
  } else {
    toast.classList.add("toast-error");
  }

  if (toastTimeoutId) {
    clearTimeout(toastTimeoutId);
  }
  toastTimeoutId = setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

function buildHeaders() {
  const settings = getSettings();
  const headers = {
    "Content-Type": "application/json"
  };
  if (settings.authToken) {
    headers["Authorization"] = "Bearer " + settings.authToken;
  }
  return headers;
}

function setApiStatus(state, text) {
  const dot = document.getElementById("api-status-dot");
  const label = document.getElementById("api-status-text");

  dot.classList.remove(
    "status-dot-online",
    "status-dot-offline",
    "status-dot-unknown"
  );

  if (state === "online") {
    dot.classList.add("status-dot-online");
  } else if (state === "offline") {
    dot.classList.add("status-dot-offline");
  } else {
    dot.classList.add("status-dot-unknown");
  }

  label.textContent = text;
}

async function checkApiStatus() {
  const settings = getSettings();
  if (!settings.baseUrl) {
    setApiStatus("unknown", "Set backend URL");
    return;
  }

  try {
    const res = await fetch(settings.baseUrl + "/health", {
      method: "GET",
      headers: buildHeaders()
    });

    if (!res.ok) {
      setApiStatus("offline", "API not healthy status " + res.status);
      return;
    }

    setApiStatus("online", "API online");
  } catch (err) {
    console.error(err);
    setApiStatus("offline", "API unreachable");
  }
}

async function handleSettingsSubmit(event) {
  event.preventDefault();
  const baseUrlInput = document.getElementById("base-url");
  const authInput = document.getElementById("auth-token");

  const baseUrl = baseUrlInput.value.trim().replace(/\/+$/, "");
  const authToken = authInput.value.trim();

  saveSettings({ baseUrl, authToken });
  showToast("Settings saved", "success");
  checkApiStatus();
  loadBackups();
}

async function handleBackupSubmit(event) {
  event.preventDefault();

  const settings = getSettings();
  if (!settings.baseUrl) {
    showToast("Set backend URL first", "error");
    return;
  }

  const projectIdInput = document.getElementById("project-id");
  const notesInput = document.getElementById("notes");
  const spinner = document.getElementById("backup-spinner");

  const projectId = projectIdInput.value.trim();
  const notes = notesInput.value.trim();

  if (!projectId) {
    showToast("Project ID is required", "error");
    return;
  }

  spinner.classList.remove("hidden");

  try {
    const res = await fetch(settings.baseUrl + "/backup", {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({
        project_id: projectId,
        notes: notes || null
      })
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(text);
      showToast("Backup request failed status " + res.status, "error");
      return;
    }

    showToast("Backup started", "success");
    projectIdInput.value = "";
    notesInput.value = "";
    loadBackups();
  } catch (err) {
    console.error(err);
    showToast("Backup request error", "error");
  } finally {
    spinner.classList.add("hidden");
  }
}

function renderBackups(backups) {
  const emptyState = document.getElementById("backups-empty");
  const table = document.getElementById("backups-table");
  const tbody = document.getElementById("backups-tbody");

  if (!backups || backups.length === 0) {
    emptyState.classList.remove("hidden");
    table.classList.add("hidden");
    tbody.innerHTML = "";
    return;
  }

  emptyState.classList.add("hidden");
  table.classList.remove("hidden");
  tbody.innerHTML = "";

  backups.forEach((b) => {
    const tr = document.createElement("tr");

    const startedAt = new Date(b.started_at || b.created_at || Date.now());
    const startedCell = document.createElement("td");
    startedCell.textContent = startedAt.toLocaleString();
    tr.appendChild(startedCell);

    const projectCell = document.createElement("td");
    projectCell.textContent = b.project_id || "Unknown";
    tr.appendChild(projectCell);

    const statusCell = document.createElement("td");
    const status = (b.status || "unknown").toLowerCase();

    const pill = document.createElement("span");
    pill.classList.add("status-pill");

    const dot = document.createElement("span");
    dot.classList.add("status-pill-dot");
    pill.appendChild(dot);

    const label = document.createElement("span");
    label.textContent = status;
    pill.appendChild(label);

    if (status === "completed" || status === "ok" || status === "success") {
      pill.classList.add("status-pill-ok");
    } else if (status === "running" || status === "pending") {
      pill.classList.add("status-pill-running");
    } else {
      pill.classList.add("status-pill-failed");
    }

    statusCell.appendChild(pill);
    tr.appendChild(statusCell);

    const notesCell = document.createElement("td");
    notesCell.textContent = b.notes || "";
    tr.appendChild(notesCell);

    const downloadCell = document.createElement("td");
    if (b.download_url) {
      const link = document.createElement("a");
      link.href = b.download_url;
      link.textContent = "Download";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      downloadCell.appendChild(link);
    } else {
      downloadCell.textContent = "N A";
    }
    tr.appendChild(downloadCell);

    tbody.appendChild(tr);
  });
}

async function loadBackups() {
  const settings = getSettings();
  if (!settings.baseUrl) {
    renderBackups([]);
    return;
  }

  try {
    const res = await fetch(settings.baseUrl + "/backups", {
      method: "GET",
      headers: buildHeaders()
    });

    if (!res.ok) {
      console.error("Backups fetch error status " + res.status);
      renderBackups([]);
      return;
    }

    const data = await res.json();
    const backups = Array.isArray(data) ? data : data.backups || [];
    renderBackups(backups);
  } catch (err) {
    console.error(err);
    renderBackups([]);
  }
}

function init() {
  applySettingsToForm();
  checkApiStatus();
  loadBackups();

  const settingsForm = document.getElementById("settings-form");
  const backupForm = document.getElementById("backup-form");
  const refreshButton = document.getElementById("refresh-backups");

  settingsForm.addEventListener("submit", handleSettingsSubmit);
  backupForm.addEventListener("submit", handleBackupSubmit);
  refreshButton.addEventListener("click", loadBackups);
}

document.addEventListener("DOMContentLoaded", init);
