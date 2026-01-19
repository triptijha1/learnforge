import type { Chapter } from "@prisma/client";

type Props = {
  chapter: Chapter;
  contentHtml: string;
  summaryHtml: string;
};

const MainVideoSummary = ({
  chapter,
  contentHtml,
  summaryHtml,
}: Props) => {
  return (
    <section className="space-y-10 flex-[2]">
      {/* ================= VIDEO ================= */}
      {chapter.youtubeVideoId && (
        <div className="aspect-video rounded-xl overflow-hidden border">
          <iframe
            src={`https://www.youtube.com/embed/${chapter.youtubeVideoId}`}
            className="w-full h-full"
            allowFullScreen
          />
        </div>
      )}

      {/* ================= CONTENT ================= */}
      <div>
        <h2 className="text-2xl font-bold mb-4">
          {chapter.name}
        </h2>

        {contentHtml ? (
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        ) : (
          <p className="text-muted-foreground">
            Content is being generated…
          </p>
        )}
      </div>

      {/* ================= SUMMARY ================= */}
      {summaryHtml && (
        <div className="bg-muted/40 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-2">
            Summary
          </h3>
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: summaryHtml }}
          />
        </div>
      )}
    </section>
  );
};

export default MainVideoSummary;
