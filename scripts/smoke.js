const { spawn } = require("node:child_process");
const path = require("node:path");

const workspaceRoot = path.resolve(__dirname, "..");
const port = Number(process.env.SMOKE_PORT || 3310);
const baseURL = `http://127.0.0.1:${port}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(timeoutMs = 15000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseURL}/api/health`);

      if (response.ok) {
        return response.json();
      }
    } catch (_error) {
      // Wait for the child server to boot.
    }

    await sleep(300);
  }

  throw new Error("Smoke server did not become healthy in time.");
}

async function requestJson(url, init) {
  const response = await fetch(url, init);
  const json = await response.json().catch(() => null);

  if (!json) {
    throw new Error(`Expected JSON response from ${url}.`);
  }

  return {
    status: response.status,
    json
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const child = spawn(process.execPath, ["server.js"], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      PORT: String(port)
    },
    stdio: "pipe"
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += String(chunk);
  });

  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  try {
    const health = await waitForHealth();
    assert(health.ok === true, "Health endpoint did not return ok=true.");

    const testConnection = await requestJson(`${baseURL}/api/test-connection`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        provider: "openai",
        model: "gpt-4.1-mini",
        apiKey: "",
        baseURL: "https://api.openai.com/v1"
      })
    });

    assert(testConnection.json.ok === false, "Expected test-connection to fail without API key.");
    assert(
      testConnection.json.errorCode === "MISSING_API_KEY",
      `Expected MISSING_API_KEY, received ${testConnection.json.errorCode || "unknown"}.`
    );

    const minimaxNativeConnection = await requestJson(`${baseURL}/api/test-connection`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        provider: "minimax_native",
        model: "MiniMax-M2.5",
        apiKey: "",
        baseURL: "https://api.minimaxi.com/v1"
      })
    });

    assert(minimaxNativeConnection.json.ok === false, "Expected minimax_native test-connection to fail without API key.");
    assert(
      minimaxNativeConnection.json.errorCode === "MISSING_API_KEY",
      `Expected minimax_native MISSING_API_KEY, received ${minimaxNativeConnection.json.errorCode || "unknown"}.`
    );

    const generate = await requestJson(`${baseURL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        provider: "openai_compatible",
        model: "gpt-4.1-mini",
        apiKey: "",
        baseURL: "https://api.openai.com/v1",
        task: "reference_ideas",
        payload: {
          profile: {
            positioning: "男大学生日常"
          },
          references: {
            benchmarks: ["男大学生晨跑 vlog"]
          }
        }
      })
    });

    assert(generate.json.ok === false, "Expected generate to fail without API key.");
    assert(
      generate.json.errorCode === "MISSING_API_KEY",
      `Expected generate error to be MISSING_API_KEY, received ${generate.json.errorCode || "unknown"}.`
    );

    console.log("Smoke checks passed.");
    console.log(
      JSON.stringify(
        {
          health,
          testConnection: {
            status: testConnection.status,
            errorCode: testConnection.json.errorCode
          },
          minimaxNativeConnection: {
            status: minimaxNativeConnection.status,
            errorCode: minimaxNativeConnection.json.errorCode
          },
          generate: {
            status: generate.status,
            errorCode: generate.json.errorCode
          }
        },
        null,
        2
      )
    );
  } finally {
    child.kill("SIGTERM");
    await sleep(500);

    if (child.exitCode === null) {
      child.kill("SIGKILL");
    }

    if (stderr.trim()) {
      console.error(stderr.trim());
    } else if (stdout.trim()) {
      console.log(stdout.trim());
    }
  }
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
