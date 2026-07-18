const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export type ReviewModelInput = Ai_Cf_Meta_Llama_3_3_70B_Instruct_Fp8_Fast_Messages;

type RestApiResult = {
  response: unknown;
};

function readTransport(env: Env) {
  const transport: string = env.AI_TRANSPORT;
  if (transport !== "rest" && transport !== "binding") {
    throw new Error("AI_TRANSPORTはrestまたはbindingを指定してください。");
  }
  return transport;
}

function parseRestApiResult(value: unknown): RestApiResult {
  if (typeof value !== "object" || value === null) {
    throw new Error("Workers AI REST APIの応答形式が正しくありません。");
  }

  const envelope = value as Record<string, unknown>;
  if (envelope.success !== true || typeof envelope.result !== "object" || envelope.result === null) {
    throw new Error("Workers AI REST APIが生成に失敗しました。");
  }

  const result = envelope.result as Record<string, unknown>;
  if (!("response" in result)) {
    throw new Error("Workers AI REST APIの応答にresponseがありません。");
  }

  return { response: result.response };
}

async function runWithRestApi(env: Env, input: ReviewModelInput) {
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

  const payload: unknown = await response.json();
  if (!response.ok) {
    throw new Error(`Workers AI REST APIへの接続に失敗しました（HTTP ${response.status}）。`);
  }

  return parseRestApiResult(payload).response;
}

export async function runReviewModel(env: Env, input: ReviewModelInput) {
  if (readTransport(env) === "rest") {
    return await runWithRestApi(env, input);
  }

  const result = await env.AI.run(MODEL, input);
  return result.response;
}
