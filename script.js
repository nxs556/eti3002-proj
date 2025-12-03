// Base API info
const API_BASE =
  "https://qf91r7lrw8.execute-api.us-east-1.amazonaws.com/prod";
const AUTH_START_PATH = "/auth/asana/start";
const BACKUP_PATH = "/backup";

function getClientKey() {
  const v = document.getElementById("clientKey").value.trim();
  return v || "demo-client";
}

function setStatus(text, isError) {
  const bar = document.getElementById("statusBar");
  bar.textContent = text || "";
  bar.className = "status-bar" + (isError ? " error" : " ok");
}

function setOutputs(obj) {
  const pretty = document.getElementById("prettyOutput");
  const raw = document.getElementById("rawOutput");

  if (obj == null) {
    pretty.textContent = "";
    raw.textContent = "";
    return;
  }

  pretty.textContent = JSON.stringify(obj, null, 2);
  raw.textContent = JSON.stringify(obj);
}

// Open OAuth in new tab
function startOAuth() {
  const clientKey = getClientKey();
  const url =
    API_BASE +
    AUTH_START_PATH +
    "?client_key=" +
    encodeURIComponent(clientKey);

  window.open(url, "_blank");
  setStatus("Opened Asana OAuth window", false);
}

// Call backup endpoint
async function sendRequest() {
  try {
    setStatus("Sending request", false);
    setOutputs(null);

    const apiEndpoint =
      document.getElementById("apiEndpoint").value.trim() ||
      API_BASE + BACKUP_PATH;

    const clientKey = getClientKey();
    const action = document.getElementById("action").value;
    const workspaceId = document.getElementById("workspaceId").value.trim();

    const body = {
      action: action,
      client_key: clientKey
    };

    if (workspaceId) {
      body.workspace_id = workspaceId;
    }

    const res = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      data = { parseError: e.toString() };
    }

    setOutputs(data);

    if (res.ok) {
      setStatus("Success response received", false);
    } else {
      setStatus("HTTP " + res.status + " response received", true);
    }
  } catch (err) {
    setStatus("Network error " + err.toString(), true);
  }
}

function clearAll() {
  setOutputs(null);
  setStatus("", false);
}

// Wire up buttons
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("oauthBtn").onclick = startOAuth;
  document.getElementById("sendBtn").onclick = sendRequest;
  document.getElementById("clearBtn").onclick = clearAll;
  document.getElementById("oauthBackupBtn").onclick = async () => {
    startOAuth();
    // user finishes OAuth in new tab then comes back here
    // they can click Send request after that
  };
});
