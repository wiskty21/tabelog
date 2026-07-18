const getElement = (id) => document.getElementById(id);

const form = getElement("reviewForm");
const submitButton = getElement("submitButton");
const status = getElement("status");
const result = getElement("result");
const generatedTitle = getElement("generatedTitle");
const generatedBody = getElement("generatedBody");
const notice = getElement("notice");
const copyButton = getElement("copyButton");

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "生成中…" : "口コミを生成する";
}

function readForm() {
  const data = new FormData(form);
  return {
    restaurantName: data.get("restaurantName"),
    experience: data.get("experience"),
    rating: Number(data.get("rating")),
    personalEpisode: data.get("personalEpisode"),
  };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoading(true);
  status.textContent = "口コミを生成しています。";
  status.classList.remove("error");
  result.hidden = true;

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(readForm()),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "生成に失敗しました。");

    generatedTitle.textContent = body.title;
    generatedBody.textContent = body.body;
    notice.textContent = body.notice;
    result.hidden = false;
    status.textContent = "下書きを生成しました。";
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "生成に失敗しました。";
    status.classList.add("error");
  } finally {
    setLoading(false);
  }
});

copyButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(`${generatedTitle.textContent}\n\n${generatedBody.textContent}`);
  copyButton.textContent = "コピーしました";
  setTimeout(() => { copyButton.textContent = "コピー"; }, 1600);
});
