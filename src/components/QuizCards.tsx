"use client";

import { cn } from "@/lib/utils";
import type { Chapter, Question } from "@prisma/client";
import React from "react";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { ChevronRight } from "lucide-react";

type Props = {
  chapter: Chapter & {
    questions: Question[];
  };
};

const QuizCards = ({ chapter }: Props) => {
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [questionState, setQuestionState] = React.useState<
    Record<string, boolean>
  >({});
  const [checked, setChecked] = React.useState(false);

  const checkAnswers = () => {
    const newState: Record<string, boolean> = {};

    chapter.questions.forEach((question) => {
      const userAnswer = answers[question.id];
      newState[question.id] = userAnswer === question.answer;
    });

    setQuestionState(newState);
    setChecked(true);
  };

  if (chapter.questions.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 rounded-2xl border bg-card p-8">
      <h2 className="text-xl font-semibold mb-6">
        Concept Check
      </h2>

      <div className="space-y-6">
        {chapter.questions.map((question) => {
          const options = JSON.parse(question.options) as string[];
          const isCorrect = questionState[question.id];

          return (
            <div
              key={question.id}
              className={cn(
                "p-4 border rounded-lg transition-colors",
                checked &&
                  (isCorrect
                    ? "bg-green-600/20 border-green-600"
                    : "bg-red-600/20 border-red-600")
              )}
            >
              <h3 className="font-medium">
                {question.question}
              </h3>

              <RadioGroup
                disabled={checked}
                onValueChange={(value) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [question.id]: value,
                  }))
                }
                className="mt-3 space-y-2"
              >
                {options.map((option, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <RadioGroupItem
                      value={option}
                      id={`${question.id}-${idx}`}
                    />
                    <Label htmlFor={`${question.id}-${idx}`}>
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          );
        })}
      </div>

      {!checked ? (
        <Button className="w-full mt-6" size="lg" onClick={checkAnswers}>
          Check Answers
          <ChevronRight className="ml-2 w-4 h-4" />
        </Button>
      ) : (
        <div className="mt-6 text-center text-lg font-semibold">
          You scored{" "}
          {Object.values(questionState).filter(Boolean).length} /{" "}
          {chapter.questions.length}
        </div>
      )}
    </section>
  );
};

export default QuizCards;
