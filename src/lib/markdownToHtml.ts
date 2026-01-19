// src/lib/markdownToHtml.ts
import { remark } from "remark";
import html from "remark-html";

/**
 * Converts Markdown → HTML safely
 * Used for chapter content & summaries
 */
export async function markdownToHtml(markdown: string) {
  const processed = await remark()
    .use(html)
    .process(markdown);

  return processed.toString();
}
