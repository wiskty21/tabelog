// scripts/scrape-tabelog.ts

import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const START_URL =
  "https://tabelog.com/rvwr/wi2kty/reviewed_restaurants/list";
const OUTPUT_PATH = new URL("../data/reviews.json", import.meta.url);

type Review = {
  name: string;
  url: string;
  body: string | null;
};

type ReviewLink = {
  name: string;
  url: string;
  detailUrl: string;
};

async function main() {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: false,
  });

  try {
    const page = await browser.newPage({ locale: "ja-JP" });
    const reviewLinks = new Map<string, ReviewLink>();
    let url: string | null = START_URL;

    while (url) {
      const response = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });

      if (!response?.ok()) {
        throw new Error(
          `ページの取得に失敗しました: ${response?.status() ?? "応答なし"} ${url}`,
        );
      }

      const pageReviews = await page
        .locator(".rvw-item")
        .evaluateAll((items) =>
          items.map((item) => {
            const restaurantLink = item.querySelector<HTMLAnchorElement>(
              "a.rvw-item__rst-name",
            );
            const detailPath = item.getAttribute("data-detail-url");

            return {
              name:
                restaurantLink?.textContent?.replace(/\s+/g, " ").trim() ?? "",
              url: restaurantLink?.href ?? "",
              detailUrl: detailPath
                ? new URL(detailPath, location.origin).href
                : "",
            };
          }),
        );

      if (pageReviews.length === 0) {
        throw new Error(`店舗情報が見つかりませんでした: ${url}`);
      }

      for (const review of pageReviews) {
        if (review.name && review.url && review.detailUrl) {
          reviewLinks.set(review.detailUrl, review);
        }
      }

      const nextLink = page.locator('a[rel="next"]');
      url = (await nextLink.count()) > 0 ? await nextLink.getAttribute("href") : null;

      if (url) {
        await page.waitForTimeout(1_000);
      }
    }

    const detailPage = await browser.newPage({ locale: "ja-JP" });
    const result: Review[] = [];

    for (const review of reviewLinks.values()) {
      const response = await detailPage.goto(review.detailUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });

      if (!response?.ok()) {
        throw new Error(
          `口コミ本文の取得に失敗しました: ${response?.status() ?? "応答なし"} ${review.detailUrl}`,
        );
      }

      const bodyElement = detailPage.locator(".rvw-item__rvw-comment").first();
      const body =
        (await bodyElement.count()) > 0
          ? (await bodyElement.innerText()).replace(/\s+/g, " ").trim()
          : null;

      result.push({
        name: review.name,
        url: review.url,
        body,
      });

      await detailPage.waitForTimeout(1_000);
    }

    await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`${result.length}件を data/reviews.json に保存しました。`);
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
