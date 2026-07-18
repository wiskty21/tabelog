const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export type ReviewModelInput = Ai_Cf_Meta_Llama_3_3_70B_Instruct_Fp8_Fast_Messages;

export async function runReviewModel(env: CloudflareBindings, input: ReviewModelInput) {
  if (env.AI_TRANSPORT === "binding") {
    const result = await env.AI.run(MODEL, input);
    if (typeof result === "string") return result;
    if ("response" in result) return result.response;
    throw new Error("Workers AI Bindingの応答形式が正しくありません。");
  }
  if (env.AI_TRANSPORT !== "rest") {
    throw new Error("AI_TRANSPORTはrestまたはbindingを指定してください。");
  }
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_AI_API_TOKEN) {
    throw new Error(".dev.varsにCloudflareのAccount IDとWorkers AI API Tokenを設定してください。");
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.CLOUDFLARE_AI_API_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  const payload = await response.json() as { success?: boolean; result?: { response?: unknown } };
  if (!response.ok) {
    throw new Error(`Workers AI REST APIへの接続に失敗しました（HTTP ${response.status}）。`);
  }
  if (!payload.success || payload.result?.response === undefined) {
    throw new Error("Workers AI REST APIの応答形式が正しくありません。");
  }
  return payload.result.response;
}
