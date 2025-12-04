const API_BASE = "https://qf91r7lrw8.execute-api.us-east-1.amazonaws.com/prod";
const AUTH_START_PATH = "/auth/asana/start";
const BACKUP_PATH = "/backup";

function getClientKey() {
  return document.getElementById("clientKey").value.trim() || "demo-client";
}

function setStatus(text) {
  document.getElementById("statusBar").textContent = text;
}

function setOutputs(obj) {
  document.getElementById("prettyOutput").textContent =
    JSON.stringify(obj, null, 2);
}

function startOAuth() {
  const url =
    API_BASE +
    AUTH_START_PATH +
    "?client_key=" +
    encodeURIComponent(getClientKey());

  window.open(url, "_blank");
  setStatus("Opened Asana OAuth window");
}

async function apiCall(action, extra = {}) {
  const endpoint =
    document.getElementById("apiEndpoint").value.trim() ||
    API_BASE + BACKUP_PATH;

  const body = {
    action,
    client_key: getClientKey(),
    ...extra
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  setOutputs(data);
  return data;
}

async function loadWorkspaces() {
  try {
    const data = await apiCall("list_workspaces")

    const sel = document.getElementById("workspaceSelect")
    sel.innerHTML = ""
    sel.disabled = false

    data.data.forEach(w => {
      const opt = document.createElement("option")
      opt.value = w.gid
      opt.textContent = w.name
      sel.appendChild(opt)
    })

    setStatus("Workspaces loaded")
  } catch (e) {
    setStatus("Failed to load workspaces")
    console.error(e)
  }
}

async function saveWorkspace() {
  const sel = document.getElementById("workspaceSelect")

  if (sel.disabled || !sel.value) {
    setStatus("Load and select a workspace first")
    return
  }

  await apiCall("select_workspace", {
    workspace_gid: sel.value,
    workspace_name: sel.options[sel.selectedIndex].text
  })

  setStatus("Workspace saved")
}

async function runBackup() {
  await apiCall("backup", {
    workspace_id: document.getElementById("workspaceSelect").value
  });

  setStatus("Backup completed");
}

async function checkStatus() {
  const data = await apiCall("status");

  document.getElementById("asanaLight").className =
    data.asana ? "light on" : "light error";

  document.getElementById("dbLight").className =
    data.db ? "light on" : "light error";

  setStatus("Status checked");
}

async function downloadCSV() {
  const endpoint =
    document.getElementById("apiEndpoint").value.trim() ||
    API_BASE + BACKUP_PATH;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "backup",
      client_key: getClientKey(),
      workspace_id: document.getElementById("workspaceSelect").value,
      format: "csv"
    })
  });

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "asana_backup.csv";
  a.click();
}

function clearAll() {
  setOutputs({});
  setStatus("");
}

document.getElementById("oauthBtn").onclick = startOAuth;
document.getElementById("loadBtn").onclick = loadWorkspaces;
document.getElementById("saveBtn").onclick = saveWorkspace;
document.getElementById("runBtn").onclick = runBackup;
document.getElementById("statusBtn").onclick = checkStatus;
document.getElementById("downloadBtn").onclick = downloadCSV;
document.getElementById("clearBtn").onclick = clearAll;
