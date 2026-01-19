// components/ChapterContent.tsx
export default function ChapterContent({ content }: { content: string }) {
  return (
    <section style={{ marginBottom: "32px" }}>
      <h2 style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: "12px" }}>
        Learning Content
      </h2>

      <div
        style={{
          lineHeight: 1.7,
          fontSize: "1rem",
          color: "#d1d5db",
          whiteSpace: "pre-wrap",
        }}
      >
        {content || "Content will be generated here."}
      </div>
    </section>
  );
}
