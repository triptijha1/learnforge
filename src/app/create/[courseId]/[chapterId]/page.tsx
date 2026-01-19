import ChapterClient from "@/components/ChapterClient";

type Props = {
  params: {
    courseId: string;
    chapterId: string;
  };
};

export default function ChapterPage({ params }: Props) {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <ChapterClient chapterId={params.chapterId} />
    </div>
  );
}
