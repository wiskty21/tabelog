import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

type GeneratedReview = {
  title: string;
  body: string;
  notice: string;
};

export function App() {
  const [result, setResult] = useState<GeneratedReview>();
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copyLabel, setCopyLabel] = useState("コピー");
  const resultRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("口コミを生成しています。");
    setIsError(false);
    setResult(undefined);

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          restaurantName: form.get("restaurantName"),
          experience: form.get("experience"),
          rating: Number(form.get("rating")),
          personalEpisode: form.get("personalEpisode"),
        }),
      });
      const body = await response.json() as GeneratedReview & { error?: string };
      if (!response.ok) throw new Error(body.error || "生成に失敗しました。");

      setResult(body);
      setMessage("下書きを生成しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成に失敗しました。");
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(`${result.title}\n\n${result.body}`);
    setCopyLabel("コピーしました");
    window.setTimeout(() => setCopyLabel("コピー"), 1600);
  }

  return (
    <main>
      <header>
        <p className="eyebrow">PERSONAL REVIEW WRITER</p>
        <h1>自分らしい口コミを、下書きに。</h1>
        <p className="lead">今回の食事について入力すると、過去の口コミの文体を参考にタイトルと本文を生成します。</p>
      </header>

      <section className="card" aria-labelledby="form-title">
        <h2 id="form-title" hidden>口コミ入力フォーム</h2>
        <form onSubmit={submit}>
          <Field label="店名">
            <input name="restaurantName" required maxLength={100} autoComplete="organization" placeholder="例：〇〇食堂" />
          </Field>
          <Field label="注文内容・体験">
            <textarea name="experience" required maxLength={3000} placeholder="食べた料理、味、価格、店内の様子など、事実を自由に入力" />
          </Field>
          <Field label="評価">
            <input name="rating" type="number" required min={0} max={5} step={0.1} inputMode="decimal" placeholder="4.0" />
          </Field>
          <Field label="日記・個人的エピソード" optional>
            <textarea name="personalEpisode" maxLength={2000} placeholder="誰と行ったか、その日にあったことなど" />
          </Field>
          <button type="submit" disabled={isLoading}>{isLoading ? "生成中…" : "口コミを生成する"}</button>
          <p className={isError ? "error" : undefined} id="status" role="status" aria-live="polite">{message}</p>
        </form>
      </section>

      {result && (
        <section ref={resultRef} id="result" className="card" aria-labelledby="result-title">
          <h2 id="result-title">生成した下書き</h2>
          <p id="generatedTitle">{result.title}</p>
          <p id="generatedBody">{result.body}</p>
          <div className="result-footer">
            <p className="notice">{result.notice}</p>
            <button className="copy" type="button" onClick={copy}>{copyLabel}</button>
          </div>
        </section>
      )}
    </main>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: ReactNode }) {
  return (
    <label>
      <span>{label}{optional && <span className="optional"> 任意</span>}</span>
      {children}
    </label>
  );
}
