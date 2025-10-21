// functions/api/save-gate.js
export const onRequestOptions = () => new Response(null, {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  },
});

export const onRequestPost = async ({ request, env }) => {
  try {
    const { owner, repo, branch = "main", dir = "data/gate-submissions", payload } = await request.json();
    if (!owner || !repo || !payload) return j({ error: "Missing owner|repo|payload" }, 400);
    if (!env.GITHUB_TOKEN) return j({ error: "Missing GITHUB_TOKEN" }, 500);

    const safe = s => String(s||"").toLowerCase().replace(/[^a-z0-9-_]+/g,"-").replace(/^-+|-+$/g,"");
    const ts = new Date().toISOString().replace(/[:.]/g,"-");
    const base = `${ts}--${safe(payload.prenom)}-${safe(payload.nom)}.json`;
    const path = `${dir.replace(/\/+$/,"")}/${base}`;
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2))));

    const gh = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: `chore(gate): form submission ${ts}`, content, branch }),
    });

    if (!gh.ok) return j({ error: "GitHub API error", detail: await gh.text() }, 502);
    const out = await gh.json();
    return j({ ok: true, path: out?.content?.path || path });
  } catch (e) {
    return j({ error: e.message || "Unknown error" }, 500);
  }
};

function j(obj, status=200){
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type":"application/json","Access-Control-Allow-Origin":"*" }});
}
