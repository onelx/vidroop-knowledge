/**
 * Dispara el workflow del crawler en GitHub Actions vía repository_dispatch.
 *
 * Requiere:
 * - GITHUB_REPO_OWNER, GITHUB_REPO_NAME
 * - GITHUB_DISPATCH_TOKEN: PAT con scope `repo` y `workflow`
 */

export type DispatchPayload = {
  event_type: "crawl_academia";
  client_payload: {
    crawl_id: string;
    academia_id: string;
    triggered_by: string;
  };
};

export async function triggerCrawlWorkflow(payload: DispatchPayload["client_payload"]): Promise<void> {
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  const token = process.env.GITHUB_DISPATCH_TOKEN;

  if (!owner || !repo || !token) {
    throw new Error("Faltan env vars: GITHUB_REPO_OWNER, GITHUB_REPO_NAME, GITHUB_DISPATCH_TOKEN");
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/dispatches`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "content-type": "application/json",
      "user-agent": "vidroop-knowledge",
    },
    body: JSON.stringify({
      event_type: "crawl_academia",
      client_payload: payload,
    } satisfies DispatchPayload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GitHub dispatch falló: ${res.status} ${res.statusText} — ${txt}`);
  }
}
