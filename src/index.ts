import reviews from "../data/reviews.json";
import { runReviewModel, type ReviewModelInput } from "./ai";

const STYLE_SAMPLE_NAMES = [
  "フォーティントーキョー 新宿店",
  "バニラビーンズ",
  "ラーメン豚山 武蔵小杉店",
];

const styleSamples = reviews
  .filter(
    (review): review is typeof review & { body: string } =>
      STYLE_SAMPLE_NAMES.includes(review.name) && review.body !== null,
  )
  .map(({ title, body }) => ({ title, body }));

type GenerateInput = {
  restaurantName: string;
  experience: string;
  rating: number;
  personalEpisode: string;
};

type GeneratedReview = {
  title: string;
  body: string;
};

const outputSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    body: { type: "string" },
  },
  required: ["title", "body"],
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function readText(value: unknown, fieldName: string, maxLength: number) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName}を入力してください。`);
  }

  const text = value.trim();
  if (text.length > maxLength) {
    throw new Error(`${fieldName}は${maxLength}文字以内で入力してください。`);
  }
  return text;
}

function parseInput(value: unknown): GenerateInput {
  if (typeof value !== "object" || value === null) {
    throw new Error("入力内容が正しくありません。");
  }

  const input = value as Record<string, unknown>;
  const rating = input.rating;
  if (typeof rating !== "number" || !Number.isFinite(rating) || rating < 0 || rating > 5) {
    throw new Error("評価は0〜5の数値で入力してください。");
  }

  const personalEpisode = input.personalEpisode;
  if (typeof personalEpisode !== "string" || personalEpisode.length > 2000) {
    throw new Error("日記・個人的エピソードは2000文字以内で入力してください。");
  }

  return {
    restaurantName: readText(input.restaurantName, "店名", 100),
    experience: readText(input.experience, "注文内容・体験", 3000),
    rating,
    personalEpisode: personalEpisode.trim(),
  };
}

function parseGeneratedReview(value: unknown): GeneratedReview {
  const parsed: unknown = typeof value === "string" ? JSON.parse(value) : value;
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("AIの出力形式が正しくありません。");
  }

  const result = parsed as Record<string, unknown>;
  if (typeof result.title !== "string" || typeof result.body !== "string") {
    throw new Error("AIの出力形式が正しくありません。");
  }

  return { title: result.title.trim(), body: result.body.trim() };
}

async function generateReview(request: Request, env: Env) {
  let input: GenerateInput;
  try {
    input = parseInput(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "入力内容が正しくありません。";
    return jsonError(message, 400);
  }

  const modelInput = {
    messages: [
      {
        role: "system",
        content: [
          "あなたは日本語の飲食店口コミを、ユーザー本人の文体で下書きする編集者です。",
          "currentInputだけを事実として使用してください。styleSamplesは語調・文章のリズム・構成だけの参考です。",
          "styleSamplesにある店名、料理、人物、出来事、価格、評価を新しい口コミへ流用してはいけません。",
          "入力にない事実を補完・推測しないでください。誹謗中傷や個人を特定する表現は避けてください。",
          "自然なタイトルと本文を作り、JSON Schemaどおりに返してください。",
        ].join("\n"),
      },
      {
        role: "user",
        content: JSON.stringify({ currentInput: input, styleSamples }),
      },
    ],
    max_tokens: 900,
    temperature: 0.7,
    response_format: {
      type: "json_schema",
      json_schema: outputSchema,
    },
  } satisfies ReviewModelInput;

  const generated = parseGeneratedReview(await runReviewModel(env, modelInput));
  return Response.json({
    ...generated,
    notice: "入力内容と事実関係を確認してから投稿してください。",
  });
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/generate") {
        if (request.method !== "POST") {
          return new Response(JSON.stringify({ error: "POSTで送信してください。" }), {
            status: 405,
            headers: { "content-type": "application/json", allow: "POST" },
          });
        }
        return await generateReview(request, env);
      }

      if (url.pathname === "/api/health") {
        const result = await env.DB
          .prepare("SELECT COUNT(*) AS count FROM writing_samples")
          .first<{ count: number }>();
        return Response.json({ status: "ok", writingSamples: result?.count });
      }

      if (url.pathname.startsWith("/api/")) {
        return jsonError("APIが見つかりません。", 404);
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error("Request failed", error);
      return jsonError("生成に失敗しました。時間をおいて再度お試しください。", 500);
    }
  },
} satisfies ExportedHandler<Env>;
