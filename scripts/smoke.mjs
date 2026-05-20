const baseUrl = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

async function main() {
  await checkHealth();
  await checkProjects();
  console.log(`Smoke checks passed against ${baseUrl}`);
}

async function checkHealth() {
  const { status, body } = await getJson("/api/health");
  if (status !== 200 || body?.ok !== true || body?.checks?.database !== "ok") {
    throw new Error(`Health check failed: ${status} ${JSON.stringify(body)}`);
  }
}

async function checkProjects() {
  const { status, body } = await getJson("/api/projects");
  if (status !== 200 || !Array.isArray(body?.projects)) {
    throw new Error(`Projects check failed: ${status} ${JSON.stringify(body)}`);
  }
}

async function getJson(path) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: buildHeaders(),
  });

  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  return { status: res.status, body };
}

function buildHeaders() {
  const user = process.env.SMOKE_BASIC_AUTH_USER;
  const password = process.env.SMOKE_BASIC_AUTH_PASSWORD;
  if (!user || !password) return {};

  return {
    Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`,
  };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
