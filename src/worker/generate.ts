import reviews from "../../data/reviews.json";
import { runReviewModel, type ReviewModelInput } from "./ai";

type GenerateInput = {
  restaurantName: string;
  experience: string;
  rating: number;
  personalEpisode: string;
};

const sampleNames = new Set([
  "フォーティントーキョー 新宿店",
  "バニラビーンズ",
  "ラーメン豚山 武蔵小杉店",
]);

const styleSamples = reviews
  .filter((review): review is typeof review & { body: string } => sampleNames.has(review.name) && review.body !== null)
  .map(({ title, body }) => ({ title, body }));

const outputSchema = {
  type: "object",
  properties: { title: { type: "string" }, body: { type: "string" } },
  required: ["title", "body"],
};

function readText(value: unknown, name: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name}を入力してください。`);
  if (value.trim().length > maxLength) throw new Error(`${name}は${maxLength}文字以内で入力してください。`);
  return value.trim();
}

function parseInput(value: unknown): GenerateInput {
  if (typeof value !== "object" || value === null) throw new Error("入力内容が正しくありません。");

  const input = value as Record<string, unknown>;
  const { rating, personalEpisode } = input;
  if (typeof rating !== "number" || !Number.isFinite(rating) || rating < 0 || rating > 5) {
    throw new Error("評価は0〜5の数値で入力してください。");
  }
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

function buildModelInput(input: GenerateInput) {
  return {
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
      { role: "user", content: JSON.stringify({ currentInput: input, styleSamples }) },
    ],
    max_tokens: 900,
    temperature: 0.7,
    response_format: { type: "json_schema", json_schema: outputSchema },
  } satisfies ReviewModelInput;
}

function parseGeneratedReview(value: unknown) {
  const parsed: unknown = typeof value === "string" ? JSON.parse(value) : value;
  if (typeof parsed !== "object" || parsed === null) throw new Error("AIの出力形式が正しくありません。");

  const result = parsed as Record<string, unknown>;
  if (typeof result.title !== "string" || typeof result.body !== "string") {
    throw new Error("AIの出力形式が正しくありません。");
  }
  return { title: result.title.trim(), body: result.body.trim() };
}

export async function generateReview(request: Request, env: CloudflareBindings) {
  let input: GenerateInput;
  try {
    input = parseInput(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "入力内容が正しくありません。";
    return Response.json({ error: message }, { status: 400 });
  }

  const generated = parseGeneratedReview(await runReviewModel(env, buildModelInput(input)));
  return Response.json({
    ...generated,
    notice: "入力内容と事実関係を確認してから投稿してください。",
  });
}
