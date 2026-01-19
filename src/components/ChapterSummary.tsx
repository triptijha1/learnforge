// components/ChapterSummary.tsx
export default function ChapterSummary({ summary }: { summary: string }) {
  return (
    <section
      style={{
        padding: "16px",
        borderRadius: "12px",
        background: "#0f172a",
        marginBottom: "32px",
      }}
    >
      <h3 style={{ fontWeight: 600, marginBottom: "8px" }}>
        Quick Summary
      </h3>

      <div
        style={{
          fontSize: "0.95rem",
          lineHeight: 1.6,
          color: "#cbd5f5",
          whiteSpace: "pre-wrap",
        }}
      >
        {summary || "Summary will appear here."}
      </div>
    </section>
  );
}
