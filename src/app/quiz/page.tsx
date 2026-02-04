"use client";

import { useEffect, useState } from "react";

type MCQ = {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
};

const QuizPage = ({ params }: { params: { chapterId: string } }) => {
  const { chapterId } = params;

  const [quiz, setQuiz] = useState<MCQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetch("/api/chapter/generateQuiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chapterId }),
        });

        if (!res.ok) throw new Error("Failed to load quiz");

        const data = await res.json();
        setQuiz(data.quiz);
      } catch (err) {
        setError("Unable to generate quiz");
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [chapterId]);

  if (loading) {
    return <div className="text-center mt-20">Generating quiz...</div>;
  }

  if (error) {
    return <div className="text-red-500 mt-20 text-center">{error}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto my-16 space-y-8">
      <h1 className="text-3xl font-bold">Quiz</h1>

      {quiz.map((q, index) => (
        <div key={index} className="p-4 border rounded space-y-3">
          <h2 className="font-semibold">
            {index + 1}. {q.question}
          </h2>

          <ul className="space-y-1">
            {q.options.map((opt, i) => (
              <li
                key={i}
                className="p-2 border rounded hover:bg-secondary cursor-pointer"
              >
                {opt}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default QuizPage;
