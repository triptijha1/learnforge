"use client";

import { cn } from "@/lib/utils";
import type { Chapter } from "@prisma/client";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import React from "react";
import { useToast } from "./ui/toast";
import { Loader2 } from "lucide-react";

type Props = {
  chapter: Chapter;
  chapterIndex: number;
  completedChapters: Set<string>;
  setCompletedChapters: React.Dispatch<React.SetStateAction<Set<string>>>;
};

export type ChapterCardHandler = {
  triggerLoad: () => void;
};

type ChapterInfoResponse = {
  youtubeVideoId?: string;
};

const ChapterCard = React.forwardRef<ChapterCardHandler, Props>(
  ({ chapter, setCompletedChapters }, ref) => {
    const { toast } = useToast();
    const [success, setSuccess] = React.useState<boolean | null>(null);

    const mutation = useMutation<ChapterInfoResponse, Error, void>({
      mutationFn: async () => {
        const res = await axios.post("/api/chapter/getInfo", {
          chapterId: chapter.id,
        });
        return res.data;
      },
    });

    const isLoading = mutation.isPending;

    const addChapterIdToSet = React.useCallback(() => {
      setCompletedChapters((prev) => {
        const newSet = new Set(prev);
        newSet.add(chapter.id);
        return newSet;
      });
    }, [chapter.id, setCompletedChapters]);

    React.useEffect(() => {
      if (chapter.youtubeVideoId) {
        setSuccess(true);
        addChapterIdToSet();
      }
    }, [chapter.youtubeVideoId, addChapterIdToSet]);

    React.useImperativeHandle(ref, () => ({
      triggerLoad() {
        if (chapter.youtubeVideoId) {
          addChapterIdToSet();
          return;
        }

        mutation.mutate(undefined, {
          onSuccess: () => {
            setSuccess(true);
            addChapterIdToSet();
          },
          onError: () => {
            setSuccess(false);
            toast({
              title: "Error",
              description: "Failed to load chapter",
              variant: "destructive",
            });
            addChapterIdToSet();
          },
        });
      },
    }));

    return (
      <div
        className={cn(
          "px-4 py-2 mt-2 rounded flex justify-between items-center",
          {
            "bg-secondary": success === null,
            "bg-red-500": success === false,
            "bg-green-500": success === true,
          }
        )}
      >
        <h5>{chapter.name}</h5>
        {isLoading && <Loader2 className="animate-spin" />}
      </div>
    );
  }
);

ChapterCard.displayName = "ChapterCard";
export default ChapterCard;
