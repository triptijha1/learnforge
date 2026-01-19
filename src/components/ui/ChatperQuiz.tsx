// components/ChapterQuiz.tsx
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function ChapterQuiz() {
  return (
    <section
      style={{
        padding: "20px",
        borderRadius: "12px",
        background: "#020617",
      }}
    >
      <h3 style={{ fontWeight: 600, marginBottom: "16px" }}>
        Concept Check
      </h3>

      <p style={{ marginBottom: "12px" }}>
        Quiz will be generated for this chapter.
      </p>

      <RadioGroup disabled>
        <div style={{ opacity: 0.6 }}>MCQs coming soon…</div>
      </RadioGroup>
    </section>
  );
}
