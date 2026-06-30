"use client";

import type { Chapter, Question } from "@prisma/client";
import React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChevronRight } from "lucide-react";

type Props = { chapter: Chapter & { questions?: Question[] } };

function getOptions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export default function QuizCards({ chapter }: Props) {
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [questionState, setQuestionState] = React.useState<Record<string, boolean>>({});
  const [checked, setChecked] = React.useState(false);

  if (!chapter.questions?.length) return null;

  function checkAnswers() {
    setQuestionState(
      Object.fromEntries(
        chapter.questions!.map((question) => [
          question.id,
          answers[question.id] === question.answer,
        ])
      )
    );
    setChecked(true);
  }

  return (
    <section className="mt-12 rounded-2xl border bg-card p-8">
      <h2 className="text-xl font-semibold mb-6">Concept Check</h2>
      <div className="space-y-6">
        {chapter.questions.map((question) => {
          const options = getOptions(question.options);
          const isCorrect = questionState[question.id];
          return (
            <div
              key={question.id}
              className={cn("p-4 border rounded-lg transition-colors", checked &&
                (isCorrect ? "bg-green-600/20 border-green-600" : "bg-red-600/20 border-red-600"))}
            >
              <h3 className="font-medium">{question.question}</h3>
              <RadioGroup
                disabled={checked}
                onValueChange={(value) => setAnswers((previous) => ({ ...previous, [question.id]: value }))}
                className="mt-3 space-y-2"
              >
                {options.map((option, index) => (
                  <div key={option} className="flex items-center gap-2">
                    <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                    <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          );
        })}
      </div>
      {!checked ? (
        <Button className="w-full mt-6" size="lg" onClick={checkAnswers}>
          Check Answers <ChevronRight className="ml-2 w-4 h-4" />
        </Button>
      ) : (
        <div className="mt-6 text-center text-lg font-semibold">
          You scored {Object.values(questionState).filter(Boolean).length} / {chapter.questions.length}
        </div>
      )}
    </section>
  );
}
