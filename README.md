# LearnForge – AI-Powered Personalized Learning Platform

A full-stack platform that generates complete, personalized learning experiences from a single topic. You enter "Machine Learning." LearnForge orchestrates AI to design a curriculum, generate chapter content, create quizzes, and recommend YouTube resources—building an entire course structure that adapts to the learner. This repo is the complete backend + frontend system that shows how modern AI engineering meets full-stack architecture.

## Table of Contents

- [What this project proves](#what-this-project-proves)
- [How to run it](#how-to-run-it)
- [The course generation flow (step by step)](#the-course-generation-flow-step-by-step)
- [Architecture](#architecture)
- [AI Content Generation Engine](#ai-content-generation-engine)
- [Prompt Engineering Strategy](#prompt-engineering-strategy)
- [Quiz Generation Pipeline](#quiz-generation-pipeline)
- [YouTube Recommendation System](#youtube-recommendation-system)
- [Database Design](#database-design)
- [Authentication Flow](#authentication-flow)
- [Queue Processing System](#queue-processing-system)
- [File-by-file walkthrough](#file-by-file-walkthrough)
- [API Reference](#api-reference)
- [Scalability & Performance](#scalability--performance)
- [Security](#security)
- [What's NOT in this demo (production considerations)](#whats-not-in-this-demo-production-considerations)
- [Future Improvements](#future-improvements)
- [Why this project is interesting](#why-this-project-is-interesting)

---

## What this project proves

LearnForge demonstrates three core capabilities working end-to-end:

1. **AI-Driven Curriculum Generation** — Given any topic, generate a complete learning structure (units, chapters, learning outcomes) using structured LLM outputs + schema validation.

2. **Asynchronous Content Pipeline** — A background job queue (BullMQ + Redis) processes chapter generation without blocking the user. Heavy AI work is distributed, not synchronous.

3. **Personalized Learning Experiences** — Each learner gets a customized dashboard, progress tracking, quiz evaluation, and AI-recommended YouTube resources tailored to the course topic.

You'll see this working end-to-end in a single click: user creates a course → AI generates structure → jobs queue → chapters are processed in parallel → content appears in the dashboard.

---

## How to run it

### Prerequisites

- **Node.js** 18+ and **pnpm** (or npm)
- **PostgreSQL** 14+ running locally or Docker
- **Redis** running locally or Docker
- **.env file** with Gemini API key, OAuth credentials, and database URLs

### Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Generate Prisma client
npx prisma generate

# 3. Run migrations
npx prisma migrate dev

# 4. Start the dev server
npm run dev
```

Open `http://localhost:3000` (or the port shown in terminal).

### Using Docker for PostgreSQL and Redis

```bash
docker run --name learnforge-pg -e POSTGRES_PASSWORD=password -d -p 5432:5432 postgres:15
docker run --name learnforge-redis -d -p 6379:6379 redis:7
```

### Build for production

```bash
npm run build
npm run start
```

---

## The course generation flow (step by step)

### User Flow: "Machine Learning" → Complete Course

#### Step 1: User submits topic

```
User enters: "Machine Learning"
             ↓
             POST /api/course/create
             { topic: "Machine Learning", level: "beginner" }
```

**Backend: Initialization**
- Validate input with Zod schema
- Create `Course` record in PostgreSQL
- Generate unique `courseId`
- Set status to `GENERATING`

**Database operation:**
```sql
INSERT INTO Course (id, title, description, topic, userId, status, createdAt)
VALUES (uuid(), 'Machine Learning', '...', 'Machine Learning', userId, 'GENERATING', now());
```

---

#### Step 2: AI generates curriculum structure

**The request to Gemini:**

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent

{
  "contents": {
    "role": "user",
    "parts": [{
      "text": "Generate a beginner-friendly Machine Learning course curriculum with 3-4 units. For each unit, create 2-3 chapters. Return ONLY valid JSON..."
    }]
  },
  "generationConfig": {
    "responseSchema": {
      "type": "OBJECT",
      "properties": {
        "courseTitle": { "type": "STRING" },
        "courseDescription": { "type": "STRING" },
        "units": {
          "type": "ARRAY",
          "items": {
            "type": "OBJECT",
            "properties": {
              "unitTitle": { "type": "STRING" },
              "unitDescription": { "type": "STRING" },
              "chapters": {
                "type": "ARRAY",
                "items": {
                  "type": "OBJECT",
                  "properties": {
                    "chapterTitle": { "type": "STRING" },
                    "chapterDescription": { "type": "STRING" }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Response (guaranteed valid JSON):**
```json
{
  "courseTitle": "Machine Learning Fundamentals",
  "courseDescription": "A hands-on introduction to ML concepts and algorithms",
  "units": [
    {
      "unitTitle": "Foundations & Data Preparation",
      "unitDescription": "Learn supervised learning basics and how to prepare data",
      "chapters": [
        {
          "chapterTitle": "What is Machine Learning?",
          "chapterDescription": "Definitions, supervised vs unsupervised, real-world examples"
        },
        {
          "chapterTitle": "Data Preprocessing",
          "chapterDescription": "Cleaning, normalization, handling missing values"
        }
      ]
    },
    {
      "unitTitle": "Algorithms & Training",
      "unitDescription": "Explore fundamental algorithms",
      "chapters": [
        {
          "chapterTitle": "Linear Regression",
          "chapterDescription": "The simplest supervised algorithm explained"
        }
      ]
    }
  ]
}
```

**Backend: Parse and validate with Zod**

```typescript
// From src/lib/courseGeneration.ts
const CurriculumSchema = z.object({
  courseTitle: z.string(),
  courseDescription: z.string(),
  units: z.array(z.object({
    unitTitle: z.string(),
    unitDescription: z.string(),
    chapters: z.array(z.object({
      chapterTitle: z.string(),
      chapterDescription: z.string()
    }))
  }))
});

// Validate response
const curriculum = CurriculumSchema.parse(response);
```

**Database operations:**
```sql
-- Insert course
UPDATE Course SET title = 'Machine Learning Fundamentals', description = '...' WHERE id = courseId;

-- Insert units
INSERT INTO Unit (id, courseId, title, description, order) VALUES
  (uuid(), courseId, 'Foundations & Data Preparation', '...', 0),
  (uuid(), courseId, 'Algorithms & Training', '...', 1);

-- Insert chapters
INSERT INTO Chapter (id, unitId, title, description, order, status)
VALUES
  (uuid(), unitId1, 'What is Machine Learning?', '...', 0, 'PENDING'),
  (uuid(), unitId1, 'Data Preprocessing', '...', 1, 'PENDING'),
  (uuid(), unitId2, 'Linear Regression', '...', 0, 'PENDING');
```

---

#### Step 3: Queue chapter generation jobs

**Backend: BullMQ Job Creation**

```typescript
// From src/lib/queue.ts
const chapterQueue = new Queue('chapter-generation', {
  connection: redisClient
});

// For each chapter, create a job
for (const chapter of chapters) {
  await chapterQueue.add(
    'generate-content',
    {
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      courseContext: course.topic,
      level: course.level
    },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true
    }
  );
}
```

**Redis state:**
```
LPUSH queue:chapter-generation { chapterId: ..., chapterTitle: ... }
LPUSH queue:chapter-generation { chapterId: ..., chapterTitle: ... }
LPUSH queue:chapter-generation { chapterId: ..., chapterTitle: ... }
...
```

---

#### Step 4: Background workers process chapters

**Worker pool (configured in worker thread):**

```typescript
// From src/lib/queue.ts - Worker listening
chapterQueue.process('generate-content', async (job) => {
  const { chapterId, chapterTitle, courseContext } = job.data;

  // 1. Generate content
  const content = await generateChapterContent(chapterId, chapterTitle, courseContext);

  // 2. Generate summary
  const summary = await generateChapterSummary(chapterId, content);

  // 3. Generate quiz questions
  const questions = await generateChapterQuestions(chapterId, chapterTitle);

  // 4. Fetch YouTube recommendations
  const videos = await fetchYouTubeVideos(chapterId);

  // 5. Update database
  await db.chapter.update({
    where: { id: chapterId },
    data: {
      content,
      summary,
      questions: { create: questions },
      youtubeVideos: { create: videos },
      status: 'COMPLETED'
    }
  });

  return { success: true, chapterId };
});
```

**What the worker does:**

1. **Calls Gemini 4 times** (content, summary, questions, video search)
2. **Fetches YouTube data** via YouTube Data API
3. **Stores results** in PostgreSQL
4. **Updates chapter status** to COMPLETED
5. **Retries on failure** (exponential backoff)

---

#### Step 5: Course becomes available

**User dashboard**:
- Sees course in "My Courses"
- All chapters visible with content loaded
- Can take quizzes immediately
- Sees recommended YouTube videos

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER (Browser)                        │
│  Next.js 15 | React 19 | TypeScript | Tailwind CSS | Radix UI           │
│  ├─ /create (Course creation form)                                      │
│  ├─ /explore (Browse courses)                                           │
│  ├─ /course/[slug] (Course viewer + quiz)                               │
│  └─ /quiz (Quiz dashboard)                                              │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS API LAYER (Middleware)                      │
│  ├─ Authentication (NextAuth + Google OAuth)                            │
│  ├─ Rate Limiting (per-user, per-endpoint)                              │
│  ├─ Input Validation (Zod schemas)                                      │
│  └─ Protected Routes (JWT verification)                                 │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
    ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
    │  API Routes │  │ Gemini Client│  │ YouTube API  │
    │  (Create,   │  │  (Structured │  │  (Search &   │
    │   Read,     │  │   generation)│  │  Transcript) │
    │   Update)   │  └──────────────┘  └──────────────┘
    └─────────────┘
          │
          └──────────────────┬──────────────────┐
                             ▼                  ▼
                    ┌──────────────┐   ┌──────────────┐
                    │   Prisma     │   │    Redis     │
                    │    (Query)   │   │   (Cache &   │
                    └──────┬───────┘   │    Queues)   │
                           │           └──────┬───────┘
                           ▼                  ▼
                    ┌──────────────────────────────┐
                    │     PostgreSQL Database      │
                    │  Users, Courses, Chapters,   │
                    │  Progress, Questions, etc.   │
                    └──────────────────────────────┘
                           ▲
                           │
                    ┌──────┴────────┐
                    │  Background   │
                    │  Worker Pool  │
                    │  (BullMQ)     │
                    │               │
                    │ Processes:    │
                    │  - Content    │
                    │  - Summaries  │
                    │  - Quizzes    │
                    │  - Videos     │
                    └────────────────┘
                           ▲
                           │
                    Redis Queue
                    (Job Storage)
```

### Layer Breakdown

**Frontend Layer**
- Next.js App Router for routing
- React components with TypeScript for type safety
- Tailwind CSS + Shadcn UI for responsive design
- React Query for server state management

**API Layer** (Next.js API Routes)
- Authentication middleware (NextAuth session verification)
- Rate limiting middleware (Redis-backed)
- Input validation (Zod)
- Protected routes (require valid session)

**Business Logic Layer**
- `CourseService` — orchestrates course creation
- `ChapterService` — handles chapter operations
- `AIService` — calls Gemini API with structured prompts
- `YouTubeService` — searches and filters videos
- `QuizService` — evaluates quiz submissions

**Data Layer**
- PostgreSQL — primary database (courses, chapters, users, progress)
- Redis — caching + job queue
- Supabase Storage — file uploads

**Worker Layer** (Background)
- BullMQ workers listen on Redis queues
- Process chapter generation in parallel
- Handle retries and failed jobs
- Update database with completed content

---

## AI Content Generation Engine

### How Gemini is invoked for structured outputs

LearnForge uses Google Gemini's **structured JSON generation** feature to guarantee valid, schema-compliant responses. This eliminates the need to parse fragile markdown or handle malformed JSON.

**Why structured generation matters:**

1. **No hallucination disasters** — Gemini can't return text outside the schema
2. **Type safety** — Zod validates the response before it touches the database
3. **Fast parsing** — No regex or string manipulation needed
4. **Reliable retries** — If Gemini fails, we retry the exact same structured request

### The Generative Content Flow

```typescript
// src/lib/ai.ts

export async function generateStructured<T>(
  prompt: string,
  schema: z.ZodType<T>
): Promise<T> {
  const model = getClient().models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseSchema: zodToJsonSchema(schema),
      responseMimeType: "application/json"
    }
  });

  const response = await model;
  const json = JSON.parse(response.text());
  return schema.parse(json);  // Zod validation layer
}
```

### Four AI Calls Per Chapter

#### 1. Chapter Content Generation

```typescript
const ContentSchema = z.object({
  title: z.string(),
  introduction: z.string(),
  mainContent: z.array(z.object({
    heading: z.string(),
    body: z.string()
  })),
  keyTakeaways: z.array(z.string())
});

const content = await generateStructured(
  `
  Generate detailed educational content for a chapter titled "${chapter.title}".
  Context: ${course.topic} course at ${course.level} level.

  Structure the content with clear sections, examples, and explanations.
  Ensure all explanations are beginner-friendly yet technically accurate.
  
  Return ONLY valid JSON matching the schema.
  `,
  ContentSchema
);
```

**Response:**
```json
{
  "title": "Neural Networks: The Brain-Inspired Algorithm",
  "introduction": "Neural networks are computational systems inspired by biological neurons...",
  "mainContent": [
    {
      "heading": "How Neurons Work",
      "body": "In the brain, neurons fire electrochemical signals. In artificial neural networks..."
    },
    {
      "heading": "Layers and Activation",
      "body": "A neural network stacks layers of artificial neurons..."
    }
  ],
  "keyTakeaways": [
    "Neural networks learn by adjusting weights",
    "Activation functions introduce non-linearity",
    "..."
  ]
}
```

---

#### 2. Chapter Summary Generation

```typescript
const SummarySchema = z.object({
  summary: z.string().max(500),
  keyConceptsHighlight: z.array(z.string()),
  commonMisconceptions: z.array(z.object({
    misconception: z.string(),
    clarification: z.string()
  }))
});

const summary = await generateStructured(
  `
  Create a concise summary of this chapter content.
  Keep the summary under 500 words.
  Highlight the most important concepts.
  Address common student misconceptions.

  Chapter content:
  ${content}
  `,
  SummarySchema
);
```

---

#### 3. Quiz Question Generation

```typescript
const QuestionSchema = z.object({
  questions: z.array(z.object({
    question: z.string(),
    options: z.array(z.string()).length(4),
    correctOptionIndex: z.number().min(0).max(3),
    explanation: z.string()
  })).length(5)
});

const questions = await generateStructured(
  `
  Generate 5 multiple choice questions based on this chapter:
  Title: ${chapter.title}
  Content: ${chapter.content}

  Requirements:
  - Each question should test comprehension, not memorization
  - Mix difficulty levels (easy, medium, hard)
  - Options should be plausible but distinct
  - Provide explanations for the correct answer

  Return ONLY valid JSON with an array of exactly 5 questions.
  `,
  QuestionSchema
);
```

---

#### 4. Video Search Query Generation

```typescript
const VideoSearchSchema = z.object({
  queries: z.array(z.object({
    query: z.string(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"])
  })).length(3)
});

const searchQueries = await generateStructured(
  `
  Generate 3 YouTube search queries for learning about "${chapter.title}".
  One for each difficulty level: beginner, intermediate, advanced.
  
  Queries should be specific enough to find tutorials but broad enough
  to have many results.

  Example format:
  - "Neural Networks Tutorial Beginners"
  - "Deep Learning Neural Networks"
  - "Advanced CNN Architecture Research"
  `,
  VideoSearchSchema
);
```

---

## Prompt Engineering Strategy

### Design Principles

1. **Role-Based Prompting** — Tell Gemini to act as an educator
2. **Structured Output Prompting** — Explicitly request JSON schema matching
3. **Context Injection** — Include course topic, student level, chapter content
4. **Constraint Specification** — Word limits, section counts, difficulty calibration
5. **Example Provision** — Show desired format with examples

### System Prompts Used

#### Curriculum Generation System Prompt

```
You are an expert curriculum designer with 10+ years of experience creating
educational programs for diverse learners.

Your task is to create a structured learning curriculum for a given topic.

Requirements:
1. Organize learning into logical units (3-5 units maximum)
2. Each unit should have 2-3 chapters
3. Each chapter should build on previous concepts
4. Use Bloom's taxonomy: start with REMEMBER, progress to APPLY/ANALYZE
5. Include diverse learning approaches (theory, examples, practice)

Return ONLY valid JSON. Do not include markdown, explanations, or any text outside the JSON.
```

#### Content Generation System Prompt

```
You are an expert educator explaining complex technical concepts simply.

Your teaching style:
- Start with relatable real-world analogies
- Build up to technical definitions
- Provide concrete code examples where relevant
- Use analogies: if explaining backpropagation, compare to hiking downhill
- Anticipate common confusion points and address them proactively

For ${course.level} learners:
${level === "beginner" ? "- Avoid heavy math, focus on intuition" : ""}
${level === "intermediate" ? "- Assume basic understanding, include mathematical foundations" : ""}
${level === "advanced" ? "- Engage with state-of-the-art research, include recent developments" : ""}

Structure your explanation with:
1. Intuitive introduction
2. Concrete examples
3. Technical details
4. Real-world applications
5. Key takeaways for retention
```

#### Quiz Generation System Prompt

```
You are an expert assessment designer creating valid, fair quiz questions.

Your goal: assess understanding, not memorization.

Question quality standards:
1. Question stems are clear and unambiguous
2. Distractors are plausible but wrong (not silly)
3. Correct answer is defensible
4. Difficulty is appropriate for the course level
5. Each question tests one concept

Avoid:
- Trick questions
- Double negatives
- "All of the above" or "None of the above"
- Questions with multiple correct answers

Mix question types:
- Concept understanding (40%)
- Application (40%)
- Analysis/synthesis (20%)
```

---

## Quiz Generation Pipeline

### Architecture: From Content to Evaluated Answers

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. GENERATION PHASE (Backend/Worker)                            │
│                                                                 │
│ Chapter Content → Gemini (Structured) → 5 Questions            │
│ Schema validation (Zod)                                        │
│ Insert into DB: questions, options, correct_answer (hashed)    │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. DELIVERY PHASE (Frontend API)                                │
│                                                                 │
│ GET /api/quiz/[chapterId]                                       │
│ Returns: questions + options (correct_answer NOT sent to UI)    │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. USER SUBMISSION PHASE (Frontend)                             │
│                                                                 │
│ User selects answers → POST /api/quiz/submit                    │
│ { questionId, selectedOptionIndex }                             │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. EVALUATION PHASE (Backend - Protected Route)                 │
│                                                                 │
│ POST /api/quiz/submit                                           │
│ ├─ Verify user enrolled in course                              │
│ ├─ Fetch question + correct answer from DB                     │
│ ├─ Compare with submission                                     │
│ ├─ Calculate score                                             │
│ ├─ Store attempt in QuizAttempt table                           │
│ └─ Update user progress (ProgressTracker)                       │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
-- Questions table
CREATE TABLE Question (
  id UUID PRIMARY KEY,
  chapterId UUID NOT NULL REFERENCES Chapter(id),
  question TEXT NOT NULL,
  options JSON NOT NULL,              -- ["Option A", "Option B", ...]
  correctOptionIndex INT NOT NULL,
  explanation TEXT,
  difficulty ENUM('easy', 'medium', 'hard'),
  createdAt TIMESTAMP DEFAULT now()
);

-- Quiz attempts tracking
CREATE TABLE QuizAttempt (
  id UUID PRIMARY KEY,
  userId UUID NOT NULL REFERENCES User(id),
  chapterId UUID NOT NULL REFERENCES Chapter(id),
  responses JSON NOT NULL,            -- { questionId: selectedIndex, ... }
  score INT NOT NULL,                 -- 0-100 percentage
  passedAt TIMESTAMP,                 -- NULL if not passed
  attemptedAt TIMESTAMP DEFAULT now()
);

-- User progress tracking
CREATE TABLE ProgressTracker (
  id UUID PRIMARY KEY,
  userId UUID NOT NULL REFERENCES User(id),
  courseId UUID NOT NULL REFERENCES Course(id),
  chaptersCompleted INT DEFAULT 0,
  quizzesCompleted INT DEFAULT 0,
  averageScore DECIMAL(5,2),
  lastAccessedAt TIMESTAMP,
  UNIQUE(userId, courseId)
);
```

### Evaluation Logic

```typescript
// src/services/quiz.service.ts

export async function submitQuizAttempt(
  userId: string,
  chapterId: string,
  responses: Record<string, number>  // { questionId: selectedIndex }
) {
  // 1. Verify enrollment
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } }
  });

  if (!enrollment) throw new Error("Not enrolled");

  // 2. Fetch all questions for the chapter
  const questions = await db.question.findMany({
    where: { chapterId },
    select: { id: true, correctOptionIndex: true }
  });

  // 3. Score the responses
  let correctCount = 0;
  for (const question of questions) {
    const userAnswer = responses[question.id];
    if (userAnswer === question.correctOptionIndex) {
      correctCount++;
    }
  }

  const score = Math.round((correctCount / questions.length) * 100);
  const passed = score >= 70;  // 70% pass threshold

  // 4. Store attempt
  const attempt = await db.quizAttempt.create({
    data: {
      userId,
      chapterId,
      responses: JSON.stringify(responses),
      score,
      passedAt: passed ? new Date() : null
    }
  });

  // 5. Update progress
  await db.progressTracker.update({
    where: { userId_courseId: { userId, courseId } },
    data: {
      quizzesCompleted: { increment: 1 },
      averageScore: /* recalculate average */ average
    }
  });

  return { score, passed, attempt };
}
```

---

## YouTube Recommendation System

### Multi-Stage Filtering Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 1: Query Generation (AI)                                  │
│                                                                 │
│ Chapter Title: "Neural Networks"                               │
│ Course Level: "beginner"                                       │
│ Course Topic: "Machine Learning"                               │
│        ↓                                                        │
│ Gemini generates 3 search queries (beginner, intermediate, adv)│
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 2: YouTube API Search                                     │
│                                                                 │
│ Search: "Neural Networks Explained Beginners"                  │
│ Returns: ~500 results (videos, channels, playlists)            │
│ Filter: videosOnly, published > 2 years ago                    │
│ Limit: 20 results per query                                    │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 3: Transcript Fetching & Educational Relevance Check     │
│                                                                 │
│ For each video:                                                 │
│  ├─ Fetch transcript (youtube-transcript library)              │
│  ├─ Extract keywords (ML algorithms)                           │
│  ├─ Calculate relevance score to chapter topic                 │
│  ├─ Check video length (10-30 minutes preferred)               │
│  ├─ Verify language (English)                                  │
│  └─ Score: (relevance × length_fit × views_norm) / 3           │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 4: Ranking & Deduplication                                │
│                                                                 │
│ Sort by score (descending)                                     │
│ Remove duplicates (similar transcripts)                        │
│ Return top 3-5 videos                                          │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 5: Store in Database                                      │
│                                                                 │
│ INSERT YouTubeVideo:                                            │
│  - videoId, title, url, channelName, duration                  │
│  - relevanceScore, addedAt                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// src/lib/youtube.ts

export async function fetchAndRankYouTubeVideos(
  chapterTitle: string,
  courseTopic: string,
  courseLevel: "beginner" | "intermediate" | "advanced"
) {
  // 1. Generate search queries using Gemini
  const queries = await generateSearchQueries(chapterTitle, courseLevel);

  const allVideos = [];

  // 2. Search YouTube for each query
  for (const query of queries) {
    const searchResults = await youtube.search.list({
      part: "snippet",
      q: query,
      type: "video",
      maxResults: 20,
      order: "relevance",
      publishedAfter: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)
    });

    for (const result of searchResults.data.items || []) {
      try {
        // 3. Fetch video metadata
        const videoDetails = await youtube.videos.list({
          part: "contentDetails,statistics",
          id: result.id.videoId
        });

        const duration = parseDuration(videoDetails.data.items[0].contentDetails.duration);

        // Skip if too short or too long
        if (duration < 300 || duration > 3600) continue;

        // 4. Fetch transcript
        const transcript = await getTranscript(result.id.videoId);

        // 5. Calculate educational relevance
        const relevanceScore = calculateRelevance(
          transcript,
          courseTopic,
          chapterTitle
        );

        allVideos.push({
          videoId: result.id.videoId,
          title: result.snippet.title,
          url: `https://youtube.com/watch?v=${result.id.videoId}`,
          channelName: result.snippet.channelTitle,
          duration,
          relevanceScore,
          thumbnail: result.snippet.thumbnails.default.url
        });
      } catch (error) {
        // Skip videos where transcript fetch fails
        continue;
      }
    }
  }

  // 6. Rank and deduplicate
  const uniqueVideos = deduplicateByTranscriptSimilarity(allVideos);
  const rankedVideos = uniqueVideos
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5);

  return rankedVideos;
}

function calculateRelevance(
  transcript: string,
  courseTopic: string,
  chapterTitle: string
): number {
  const topicKeywords = extractKeywords(courseTopic);
  const chapterKeywords = extractKeywords(chapterTitle);
  const transcriptKeywords = extractKeywords(transcript);

  let score = 0;

  // Match topic keywords
  topicKeywords.forEach(kw => {
    if (transcriptKeywords.includes(kw)) score += 10;
  });

  // Match chapter keywords
  chapterKeywords.forEach(kw => {
    if (transcriptKeywords.includes(kw)) score += 15;
  });

  // Boost for exact phrase match
  if (transcript.toLowerCase().includes(chapterTitle.toLowerCase())) {
    score += 25;
  }

  return Math.min(score, 100);  // Normalize to 0-100
}
```

---

## Database Design

### Core Tables & Relationships

```
User
├─ id (UUID)
├─ email (String)
├─ name (String)
├─ image (String)
├─ role (enum: 'USER' | 'INSTRUCTOR' | 'ADMIN')
├─ googleId (String)
├─ createdAt (DateTime)
└─ updatedAt (DateTime)
    │
    ├── Enrollment (Many)
    ├── ProgressTracker (Many)
    ├── QuizAttempt (Many)
    └── Course (Many) -- creator

Course
├─ id (UUID)
├─ userId (FK) -- creator
├─ title (String)
├─ description (String)
├─ topic (String)
├─ level (enum: 'beginner' | 'intermediate' | 'advanced')
├─ image (String) -- from Unsplash
├─ status (enum: 'GENERATING' | 'ACTIVE' | 'ARCHIVED')
├─ publishedAt (DateTime)
├─ createdAt (DateTime)
└─ updatedAt (DateTime)
    │
    ├── Unit (Many)
    ├── Enrollment (Many)
    ├── ProgressTracker (Many)
    └── Chapter (Many) -- through Unit

Unit
├─ id (UUID)
├─ courseId (FK)
├─ title (String)
├─ description (String)
├─ order (Int)
└─ createdAt (DateTime)
    │
    └── Chapter (Many)

Chapter
├─ id (UUID)
├─ unitId (FK)
├─ title (String)
├─ description (String)
├─ content (Text) -- markdown or JSON
├─ summary (Text)
├─ status (enum: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED')
├─ videoUrl (String) -- optional: embedded video
├─ order (Int)
├─ createdAt (DateTime)
└─ updatedAt (DateTime)
    │
    ├── Question (Many)
    ├── YouTubeVideo (Many)
    ├── QuizAttempt (Many)
    └── Enrollment (Many) -- chapter-specific progress

Question
├─ id (UUID)
├─ chapterId (FK)
├─ question (String)
├─ options (JSON) -- ["Option A", "Option B", "Option C", "Option D"]
├─ correctOptionIndex (Int)
├─ explanation (String)
├─ difficulty (enum: 'easy' | 'medium' | 'hard')
├─ createdAt (DateTime)
└─ updatedAt (DateTime)
    │
    └── QuizAttempt (Many) -- through response

YouTubeVideo
├─ id (UUID)
├─ chapterId (FK)
├─ videoId (String) -- YouTube video ID
├─ title (String)
├─ url (String)
├─ channelName (String)
├─ duration (Int) -- seconds
├─ thumbnail (String) -- URL
├─ relevanceScore (Decimal) -- 0-100
├─ transcript (Text) -- cached
├─ addedAt (DateTime)
└─ updatedAt (DateTime)

Enrollment
├─ id (UUID)
├─ userId (FK)
├─ courseId (FK)
├─ enrolledAt (DateTime)
├─ completedAt (DateTime) -- NULL until finished
└─ UNIQUE(userId, courseId)

ProgressTracker
├─ id (UUID)
├─ userId (FK)
├─ courseId (FK)
├─ chaptersCompleted (Int)
├─ quizzesCompleted (Int)
├─ quizzesPassed (Int)
├─ averageScore (Decimal)
├─ lastAccessedAt (DateTime)
├─ completedAt (DateTime) -- NULL until all chapters done
└─ UNIQUE(userId, courseId)

QuizAttempt
├─ id (UUID)
├─ userId (FK)
├─ chapterId (FK)
├─ responses (JSON) -- { questionId: selectedIndex, ... }
├─ score (Int) -- 0-100
├─ passed (Boolean) -- score >= 70
├─ passedAt (DateTime) -- NULL if failed
├─ attemptedAt (DateTime)
└─ INDEX(userId, chapterId) -- find attempts by user for chapter
```

### ER Diagram (ASCII)

```
┌──────────┐
│   User   │
├──────────┤
│ id (PK)  │
│ email    │
│ name     │
│ googleId │
└────┬─────┘
     │
     ├─────────────────────────┬──────────────────┐
     │                         │                  │
     ▼                         ▼                  ▼
┌──────────┐          ┌──────────────┐      ┌────────────┐
│ Course   │          │ Enrollment   │      │ Progress   │
├──────────┤          ├──────────────┤      │ Tracker    │
│ id (PK)  │          │ id (PK)      │      ├────────────┤
│ userId   │◀─────────│ userId  (FK) │      │ id (PK)    │
│ title    │          │ courseId (FK)│      │ userId (FK)│
│ topic    │          └──────────────┘      │ courseId   │
│ status   │                                 └────────────┘
└────┬─────┘
     │
     ▼
┌──────────┐         ┌──────────┐        ┌──────────────┐
│  Unit    │         │Question  │        │YouTubeVideo  │
├──────────┤         ├──────────┤        ├──────────────┤
│ id (PK)  │         │ id (PK)  │        │ id (PK)      │
│ courseId │         │ chapterId│        │ chapterId    │
│ title    │         │ question │        │ videoId      │
└────┬─────┘         │ options  │        │ title        │
     │               │ answer   │        │ relevance    │
     ▼               └──────────┘        └──────────────┘
┌──────────┐
│ Chapter  │
├──────────┤
│ id (PK)  │
│ unitId   │
│ title    │
│ content  │
│ status   │
└────┬─────┘
     │
     ▼
┌──────────────┐
│  QuizAttempt │
├──────────────┤
│ id (PK)      │
│ userId (FK)  │
│ chapterId    │
│ responses    │
│ score        │
│ passed       │
└──────────────┘
```

---

## Authentication Flow

### Google OAuth + NextAuth Flow

```
┌─────────────────────────────────────────────────────────┐
│ User clicks "Sign in with Google" on frontend           │
│                    ↓                                    │
│ Redirected to: /api/auth/signin?callbackUrl=...         │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ NextAuth orchestrates Google OAuth flow                 │
│                                                         │
│ 1. User redirected to Google consent screen             │
│ 2. User grants permissions                              │
│ 3. Google redirects back with auth code                │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ NextAuth callback exchanges code for token              │
│ /api/auth/callback/google                              │
│                    ↓                                    │
│ Fetches user profile: { email, name, image, googleId } │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ Check if user exists in PostgreSQL                      │
│                                                         │
│ if (userExists) {                                       │
│   UPDATE User SET lastSignIn = now()                    │
│ } else {                                                │
│   INSERT INTO User (email, name, googleId, ...)        │
│ }                                                       │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ Create JWT session token                                │
│ Token includes: { userId, email, role }                │
│ Stored in signed httpOnly cookie                        │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ User redirected to callbackUrl (e.g., /dashboard)       │
│ Frontend now has valid session                          │
└─────────────────────────────────────────────────────────┘
```

### Protected Route Middleware

```typescript
// src/lib/auth.ts

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    })
  ],
  adapter: PrismaAdapter(prisma),
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
      }
      return session;
    }
  }
};

export const getServerSession = () =>
  auth.getServerSession(authOptions);
```

### API Route Protection

```typescript
// src/app/api/course/create/route.ts

export async function POST(req: Request) {
  // 1. Get session
  const session = await getServerSession();

  // 2. Verify session exists
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  const body = await req.json();

  // 3. Validate input
  const { topic, level } = CreateCourseSchema.parse(body);

  // 4. Create course in database
  const course = await prisma.course.create({
    data: {
      userId,
      topic,
      level,
      title: topic,  // Temporary
      status: "GENERATING"
    }
  });

  // 5. Queue curriculum generation
  await queueCurriculumGeneration(course.id);

  return NextResponse.json({ courseId: course.id });
}
```

---

## Queue Processing System

### BullMQ + Redis Architecture

```
┌──────────────────────────────────────────────┐
│ User creates course                          │
│ POST /api/course/create                      │
│          ↓                                   │
│ For each chapter, create job                 │
│ chapterQueue.add('generate-content', {...}) │
└──────────┬───────────────────────────────────┘
           │
           ▼
    ┌─────────────┐
    │    Redis    │
    ├─────────────┤
    │ Queue:      │
    │ chapter-    │
    │ generation  │
    │             │
    │ Jobs:       │
    │ [Job 1]     │
    │ [Job 2]     │
    │ [Job 3]     │
    │ [Job 4]     │
    └──────┬──────┘
           │
    ┌──────┴────────────────────┐
    │                           │
    ▼                           ▼
┌─────────────┐         ┌─────────────┐
│ Worker 1    │         │ Worker 2    │
├─────────────┤         ├─────────────┤
│ Processing  │         │ Processing  │
│ Job 1       │         │ Job 2       │
│             │         │             │
│ ├─ Generate │         │ ├─ Generate │
│ │ content   │         │ │ content   │
│ ├─ Generate │         │ ├─ Generate │
│ │ summary   │         │ │ summary   │
│ ├─ Generate │         │ ├─ Generate │
│ │ quiz      │         │ │ quiz      │
│ └─ Fetch    │         │ └─ Fetch    │
│   videos    │         │   videos    │
└──────┬──────┘         └──────┬──────┘
       │                       │
       ▼                       ▼
   ┌───────────────────────────────┐
   │ PostgreSQL Database           │
   │                               │
   │ UPDATE Chapter SET            │
   │   content = '...',            │
   │   summary = '...',            │
   │   status = 'COMPLETED',       │
   │   updatedAt = now()           │
   └───────────────────────────────┘
```

### Job Configuration

```typescript
// src/lib/queue.ts

import Queue from "bullmq";
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379")
});

export const chapterQueue = new Queue("chapter-generation", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000  // 2s initial, then 4s, 8s
    },
    removeOnComplete: true,
    removeOnFail: false  // Keep failed jobs for debugging
  }
});

// Job processor
chapterQueue.process(
  "generate-content",
  5,  // concurrency: 5 workers
  async (job) => {
    const { chapterId } = job.data;

    try {
      // Update progress
      job.updateProgress(20);

      // 1. Generate content (Gemini call)
      const content = await generateChapterContent(chapterId);
      job.updateProgress(40);

      // 2. Generate summary
      const summary = await generateChapterSummary(chapterId, content);
      job.updateProgress(60);

      // 3. Generate quiz
      const questions = await generateChapterQuestions(chapterId);
      job.updateProgress(80);

      // 4. Fetch videos
      const videos = await fetchYouTubeVideos(chapterId);
      job.updateProgress(90);

      // 5. Update database
      await updateChapter(chapterId, {
        content,
        summary,
        questions,
        videos,
        status: "COMPLETED"
      });

      job.updateProgress(100);
      return { success: true };
    } catch (error) {
      console.error(`Job failed for chapter ${chapterId}:`, error);
      throw error;  // BullMQ will retry
    }
  }
);

// Event listeners for monitoring
chapterQueue.on("completed", (job) => {
  console.log(`✓ Chapter ${job.data.chapterId} completed`);
});

chapterQueue.on("failed", (job, error) => {
  console.error(`✗ Chapter ${job.data.chapterId} failed:`, error.message);
});

chapterQueue.on("stalled", (job) => {
  console.warn(`⚠ Chapter ${job.data.chapterId} stalled, will retry`);
});
```

### Enqueueing Jobs from API

```typescript
// src/services/course.service.ts

export async function createCourseWithUnits(
  courseId: string,
  curriculum: CurriculumType
) {
  // 1. Save curriculum structure to database
  for (const unitData of curriculum.units) {
    const unit = await prisma.unit.create({
      data: {
        courseId,
        title: unitData.unitTitle,
        description: unitData.unitDescription,
        order: curriculum.units.indexOf(unitData)
      }
    });

    // 2. Create chapters under unit
    for (const chapterData of unitData.chapters) {
      const chapter = await prisma.chapter.create({
        data: {
          unitId: unit.id,
          title: chapterData.chapterTitle,
          description: chapterData.chapterDescription,
          status: "PENDING"
        }
      });

      // 3. Enqueue background job for each chapter
      await chapterQueue.add(
        "generate-content",
        {
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          courseContext: curriculum.courseTitle
        },
        {
          jobId: `chapter-${chapter.id}`,  // Unique job ID
          delay: 1000 * unitData.chapters.indexOf(chapterData),  // Stagger starts
          priority: 5  // Normal priority
        }
      );
    }
  }
}
```

### Retry & Failure Handling

BullMQ automatically retries failed jobs with exponential backoff:

**Attempt 1:** Immediate failure
**Attempt 2:** Wait 2 seconds, retry
**Attempt 3:** Wait 4 seconds, retry
**Attempt 4:** Wait 8 seconds, retry

If all 3 attempts fail:
- Job moves to "failed" state
- Admin notified (via email/Slack)
- User sees error in dashboard
- Manual retry available

---

## File-by-file walkthrough

### Frontend Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout, Providers wrapper
│   ├── page.tsx                # Landing page
│   │
│   ├── create/                 # Course creation flow
│   │   ├── page.tsx            # Create form
│   │   └── [courseId]/
│   │       └── page.tsx        # Monitor generation progress
│   │
│   ├── course/                 # Course viewer
│   │   └── [...slug]/
│   │       └── page.tsx        # Display course + chapters + quiz
│   │
│   ├── explore/                # Browse courses
│   │   └── page.tsx            # Gallery of courses
│   │
│   ├── quiz/                   # Quiz dashboard
│   │   └── page.tsx            # Start quiz, submit answers
│   │
│   ├── settings/               # User settings
│   │   └── page.tsx            # Profile, preferences
│   │
│   └── api/                    # Backend routes
│       ├── auth/[...nextauth]/
│       │   └── route.ts        # NextAuth handler
│       │
│       ├── course/
│       │   ├── create/
│       │   │   └── route.ts    # POST - create course
│       │   ├── createChapters/
│       │   │   └── route.ts    # POST - trigger curriculum generation
│       │   ├── getCourses/
│       │   │   └── route.ts    # GET - list user's courses
│       │   ├── [courseId]/
│       │   │   └── route.ts    # GET - course details
│       │   └── delete/
│       │       └── route.ts    # DELETE - remove course
│       │
│       ├── chapter/
│       │   ├── get/
│       │   │   └── route.ts    # GET - chapter content
│       │   └── getInfo/
│       │       └── route.ts    # GET - chapter summary
│       │
│       └── quiz/
│           └── submit/
│               └── route.ts    # POST - evaluate answers
│
├── components/
│   ├── ChapterCard.tsx         # Chapter display card
│   ├── ChapterClient.tsx       # Chapter viewer (interactive)
│   ├── ChapterContent.tsx      # Rendered chapter content
│   ├── ChapterSummary.tsx      # Summary display
│   ├── ChapterVideo.tsx        # YouTube embed
│   ├── ConfirmChapters.tsx     # Curriculum approval UI
│   ├── CourseSidebar.tsx       # Course navigation
│   ├── CreateCourseForm.tsx    # Input form for topic
│   ├── GalleryCourseCard.tsx   # Course gallery card
│   ├── MainVideoSummary.tsx    # Featured video
│   ├── Navbar.tsx              # Top navigation
│   ├── Providers.tsx           # Client-side providers (NextAuth, React Query)
│   ├── QuizCards.tsx           # Quiz question UI
│   ├── SigninButton.tsx        # Auth button
│   ├── SignOutButton.tsx       # Logout
│   ├── SubscriptionAction.tsx  # Premium features
│   ├── ThemeToggle.tsx         # Dark/light mode
│   ├── UserAccountNav.tsx      # User menu
│   ├── UserAvatar.tsx          # User profile pic
│   │
│   └── ui/                     # Shadcn UI components
│       ├── avatar.tsx
│       ├── button.tsx
│       ├── ChatperQuiz.tsx     # Quiz form component
│       ├── dropdown-menu.tsx
│       ├── form.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── progress.tsx        # Progress bar
│       ├── radio-group.tsx     # Quiz options
│       ├── separator.tsx
│       ├── sonner.tsx          # Toast notifications
│       ├── toast.ts            # Toast hook
│       └── toaster.tsx         # Toast container
│
├── lib/
│   ├── ai.ts                   # Gemini API wrapper + structured generation
│   ├── api.ts                  # API client (fetch wrappers)
│   ├── auth.ts                 # NextAuth configuration
│   ├── courseGeneration.ts     # Curriculum generation logic
│   ├── db.ts                   # Prisma client singleton
│   ├── env.ts                  # Environment variable validation
│   ├── errors.ts               # Custom error classes
│   ├── gemini.ts               # Gemini-specific helpers
│   ├── markdownToHtml.ts       # Markdown parser
│   ├── prompts.ts              # Prompt templates
│   ├── queue.ts                # BullMQ setup + job creation
│   ├── rateLimit.ts            # Rate limiting logic
│   ├── storage.ts              # Supabase file upload
│   ├── subscription.ts         # Premium feature checks
│   ├── unsplash.ts             # Image API
│   ├── utils.ts                # Utility functions
│   ├── youtube.ts              # YouTube search + transcript
│   │
│   └── ai/
│       └── gemini.ts           # Low-level Gemini API calls
│
├── repositories/
│   ├── chapter.repository.ts   # Chapter DB queries
│   └── course.repository.ts    # Course DB queries
│
├── services/
│   ├── chapter.service.ts      # Chapter business logic
│   └── course.service.ts       # Course business logic
│
├── types/
│   └── course.ts               # TypeScript interfaces
│
└── validators/
    └── course.ts               # Zod validation schemas
```

---

## API Reference

### Authentication

```
GET /api/auth/signin
  → Redirect to Google OAuth consent screen

GET /api/auth/callback/google
  → Google OAuth callback (handled by NextAuth)

POST /api/auth/signout
  → Sign out user, invalidate session

GET /api/auth/session
  → Returns current session or null
```

### Courses

```
POST /api/course/create
  Request:  { topic: string, level: "beginner" | "intermediate" | "advanced" }
  Response: { courseId: string, status: "GENERATING" }
  Auth:     Required

GET /api/course/getCourses
  Response: { courses: Course[] }
  Auth:     Required

GET /api/course/[courseId]
  Response: { course: Course, units: Unit[], chapters: Chapter[] }
  Auth:     Optional

DELETE /api/course/[courseId]
  Response: { success: true }
  Auth:     Required (owner only)

POST /api/course/createChapters
  Request:  { courseId: string }
  Response: { jobIds: string[] }
  Auth:     Required
  Note:     Queues chapter generation jobs
```

### Chapters

```
GET /api/chapter/get?chapterId=[id]
  Response: { chapter: Chapter, content: string, summary: string }
  Auth:     Required

GET /api/chapter/getInfo?chapterId=[id]
  Response: { summary: string, keyTakeaways: string[] }
  Auth:     Optional
```

### Quiz

```
GET /api/quiz/[chapterId]
  Response: { questions: Question[] }
  Auth:     Required
  Note:     Correct answers NOT included

POST /api/quiz/submit
  Request:  { chapterId: string, responses: { questionId: selectedIndex } }
  Response: { score: 0-100, passed: boolean, explanation: string[] }
  Auth:     Required
```

---

## Scalability & Performance

### Horizontal Scaling Strategy

1. **Stateless API servers** — Deploy multiple Next.js instances behind load balancer
2. **Database replicas** — PostgreSQL read replicas for query scaling
3. **Redis cluster** — Redis Sentinel for high availability and automatic failover
4. **Distributed workers** — BullMQ can scale to 100s of workers across multiple servers
5. **CDN for static assets** — Vercel/Cloudflare for images, videos, JS

### Caching Strategy

```typescript
// Cache Gemini responses (same topic = same curriculum)
const CACHE_KEY = `curriculum:${topic}:${level}`;
const cached = await redis.get(CACHE_KEY);
if (cached) return JSON.parse(cached);

// Cache YouTube videos (cheap, reusable)
const VIDEO_CACHE = `videos:${chapterTitle}`;
// TTL: 30 days (only update if videos become obsolete)

// Cache user progress (frequently accessed)
const PROGRESS_CACHE = `progress:${userId}:${courseId}`;
// TTL: 5 minutes (sync to DB periodically)
```

### Rate Limiting

```typescript
// Per-user rate limits
const limits = {
  createCourse: "5 courses per hour",
  generateContent: "1 request per second",
  submitQuiz: "10 attempts per minute"
};

// Implementation: Redis + token bucket algorithm
async function checkRateLimit(userId: string, action: string) {
  const key = `ratelimit:${userId}:${action}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }
  
  if (current > LIMIT) {
    throw new TooManyRequestsError();
  }
}
```

---

## Security

### Input Validation

All user inputs validated with Zod before reaching business logic:

```typescript
const CreateCourseSchema = z.object({
  topic: z.string().min(3).max(100),
  level: z.enum(["beginner", "intermediate", "advanced"])
});

// Validates before reaching service layer
const input = CreateCourseSchema.parse(req.body);
```

### Authentication

- Google OAuth 2.0 (federated)
- JWT tokens stored in signed httpOnly cookies (cannot be accessed by XSS)
- Session validated on every protected route

### Authorization

```typescript
// User can only see their own courses
const course = await db.course.findUnique({
  where: { id: courseId }
});

if (course.userId !== session.user.id) {
  throw new ForbiddenError();
}
```

### Rate Limiting

Redis-backed token bucket prevents brute force and DoS:

```
POST /api/quiz/submit
  Limit: 10 attempts per minute per user
```

### Database Security

- Prepared statements (Prisma ORM)
- No SQL injection possible
- Sensitive data (passwords, API keys) never logged

### API Key Management

- Gemini API key stored in environment variables
- Never exposed to frontend
- YouTube API key restricted by domain

---

## What's NOT in this demo (production considerations)

### What's in the demo → What it would be in production

| Demo | Production |
|------|------------|
| In-memory rate limiting | Redis distributed rate limiting |
| Single Redis instance | Redis Sentinel (HA) + Cluster |
| Synchronous Gemini calls | Queued with timeout/fallback |
| Files in Supabase | S3 with CloudFront CDN |
| Basic logging (console) | Structured logs to DataDog/Loggly |
| No caching | Multi-layer caching (Redis, CDN) |
| Single database | Primary + replicas + failover |
| Manual monitoring | Prometheus + Grafana + alerting |
| Hardcoded config | Feature flags (LaunchDarkly) |
| No backups | Automated backups + PITR |

---

## Future Improvements

### Phase 2: Adaptive Learning

```
- Track per-user learning patterns
- Adjust content difficulty dynamically
- Personalized quiz questions
- Spaced repetition scheduling
- Learning style adaptation (visual, kinesthetic, etc.)
```

### Phase 3: Advanced AI

```
- Voice-based tutoring (AI speaks the lesson)
- Live code coaching (correct student code)
- Interactive simulations for concepts
- AI-powered homework grading
- Student-teacher chat with AI moderator
```

### Phase 4: Community & Collaboration

```
- Course marketplace (creator economy)
- Study groups + peer learning
- Discussion forums with AI moderation
- Instructor dashboard
- Certificate generation (on-chain verification)
```

### Phase 5: Multimodal Learning

```
- Support for videos as input (auto-summarize)
- Interactive 3D visualizations
- AR for spatial concepts
- Video generation from text
- Podcast generation from courses
```

### Phase 6: Analytics & Intelligence

```
- Learning outcome predictions
- Skill gap analysis
- Career path recommendations
- Job market alignment
- Real-time dashboards
```

---

## Production Deployment

### Architecture: Vercel → PostgreSQL (Neon) → Redis → Gemini

```
┌──────────────────────────────────────────────────────┐
│ Vercel Edge Network                                  │
│ ├─ Next.js 15 deployment                            │
│ ├─ Automatic scaling                                │
│ ├─ Built-in HTTPS                                   │
│ └─ Geographic distribution                          │
└────────────┬─────────────────────────────────────────┘
             │
       ┌─────┴──────┐
       │            │
       ▼            ▼
┌────────────┐  ┌──────────────┐
│  Neon      │  │ Redis Cloud  │
│  PostgreSQL│  │              │
│  Serverless│  │ BullMQ Queue │
│  Database  │  │ Sessions     │
└────────────┘  └──────┬───────┘
       │                │
       └────────┬───────┘
                ▼
        ┌──────────────────┐
        │  BullMQ Workers  │
        │                  │
        │ (Fly.io compute) │
        │ - Generate       │
        │ - YouTube fetch  │
        │ - Quiz create    │
        └──────────────────┘
                │
                ▼
        ┌──────────────────┐
        │ External APIs    │
        │ - Gemini 2.5     │
        │ - YouTube API    │
        │ - Unsplash       │
        │ - Supabase       │
        └──────────────────┘
```

### Deployment Commands

```bash
# Deploy to Vercel
vercel deploy

# Run database migrations
npx prisma migrate deploy

# Deploy workers to Fly.io
fly deploy
```

---

## Why this project is interesting

### 1. Full-Stack Engineering

- **Frontend:** React 19, Next.js 15, TypeScript
- **Backend:** API routes, serverless functions, middleware
- **Database:** Relational + caching layers
- **DevOps:** Docker, environment config, secrets management

### 2. AI Engineering

- **Structured generation** — Gemini with schema validation
- **Prompt engineering** — Role-based, context-injected prompts
- **Multi-turn AI** — Content, summary, quiz, video search in sequence
- **Error handling** — Retries, fallbacks, graceful degradation

### 3. Distributed Systems

- **Asynchronous processing** — BullMQ queue system
- **Event-driven architecture** — Job lifecycle management
- **Rate limiting** — Redis token bucket
- **Session management** — JWT + cookies + database

### 4. Data Engineering

- **Schema design** — Normalized PostgreSQL schema
- **Validation layer** — Zod schemas for all inputs
- **Caching strategy** — Multi-tier (Redis, application, CDN)
- **Analytics tracking** — User progress, quiz attempts, engagement

### 5. UX/Product Design

- **Personalization** — Each learner gets unique content
- **Progressive disclosure** — Content loads as chapters complete
- **Responsive design** — Mobile-first Tailwind CSS
- **Accessibility** — WCAG compliance (Radix UI)

### Why recruiters and investors care

- **Demonstrates real-world thinking** — Not a toy app; production-grade architecture
- **Solves actual problem** — Education is broken; AI can fix it
- **Scalable from day one** — Can handle 10x users without rewrite
- **Technical depth** — Shows mastery of multiple domains (full-stack, AI, distributed systems)
- **Business potential** — Clear go-to-market (B2B with universities, B2C subscription)

---

## Quick Reference

| What | How |
|------|-----|
| Start dev server | `npm run dev` |
| Run tests | `npm test` |
| Build for production | `npm run build` |
| Generate database client | `npx prisma generate` |
| Run migrations | `npx prisma migrate dev` |
| View database | `npx prisma studio` |
| Lint code | `npm run lint` |

---

## License

MIT

---

**Built with Next.js, React, TypeScript, Prisma, PostgreSQL, Redis, BullMQ, Google Gemini, and ❤️**
