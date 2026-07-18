export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      const result = await env.DB
        .prepare("SELECT COUNT(*) AS count FROM writing_samples")
        .first<{ count: number }>();

      return Response.json({
        status: "ok",
        writingSamples: result?.count,
      });
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
