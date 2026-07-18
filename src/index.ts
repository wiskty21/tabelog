import { generateReview } from "./generate";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function health(env: Env) {
  const result = await env.DB
    .prepare("SELECT COUNT(*) AS count FROM writing_samples")
    .first<{ count: number }>();

  return Response.json({ status: "ok", writingSamples: result?.count });
}

export default {
  async fetch(request: Request, env: Env) {
    const { pathname } = new URL(request.url);

    try {
      if (pathname === "/api/generate") {
        if (request.method !== "POST") {
          return new Response(JSON.stringify({ error: "POSTで送信してください。" }), {
            status: 405,
            headers: { "content-type": "application/json", allow: "POST" },
          });
        }
        return await generateReview(request, env);
      }

      if (pathname === "/api/health") return await health(env);
      if (pathname.startsWith("/api/")) return jsonError("APIが見つかりません。", 404);
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error("Request failed", error);
      return jsonError("生成に失敗しました。時間をおいて再度お試しください。", 500);
    }
  },
} satisfies ExportedHandler<Env>;
