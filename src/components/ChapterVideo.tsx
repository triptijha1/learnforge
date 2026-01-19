// components/ChapterVideo.tsx
export default function ChapterVideo({ youtubeId }: { youtubeId: string }) {
  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "16 / 9",
        borderRadius: "12px",
        overflow: "hidden",
        background: "#111",
        marginBottom: "24px",
      }}
    >
      <iframe
        src={`https://www.youtube.com/embed/${youtubeId}`}
        title="Chapter video"
        allowFullScreen
        style={{ width: "100%", height: "100%", border: "none" }}
      />
    </div>
  );
}
