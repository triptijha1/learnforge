// src/lib/prompts.ts

export function chapterContentPrompt(chapterName: string) {
  return `
You are an expert educator.

Create detailed learning content for the chapter:
"${chapterName}"

Audience: beginners
Tone: simple, friendly, practical

Structure:
- Short introduction
- Key concepts in bullet points
- One simple real-world example
- 3 quick takeaways

Rules:
- Do not use markdown
- Do not add emojis
- Keep language simple
`;
}

export function summaryPrompt(content: string) {
  return `
Summarize the following lesson for revision.

Rules:
- Bullet points only
- Short, clear sentences
- Focus on key ideas
- No extra explanation

Lesson:
${content}
`;
}

export function quizPrompt(topic: string) {
  return `
You are a quiz designer for an online learning platform.

Create 5 multiple-choice questions on:
"${topic}"

Rules:
- Beginner level
- 4 options per question
- Only one correct answer
- Include short explanation

Respond ONLY in valid JSON:
[
  {
    "question": "",
    "options": ["", "", "", ""],
    "answer": "",
    "explanation": ""
  }
]
`;
}
