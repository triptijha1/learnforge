"use client";

import React from "react";
import { Form } from "./ui/form";
import { z } from "zod";
import { createChapterSchema } from "@/validators/course";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, FormItem, FormLabel, FormControl } from "./ui/form";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Plus, Trash } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "./ui/toast";
import { useRouter } from "next/navigation";

type FormInput = z.infer<typeof createChapterSchema>;

const CreateCourseForm = () => {
  const router = useRouter();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async ({ title, units }: FormInput) => {
      const response = await axios.post("/api/course/createChapters", {
        title,
        units,
      });
      return response.data;
    },
  });

  const { mutate: createChapters, isPending: isLoading } = createMutation;

  const form = useForm<FormInput>({
    resolver: zodResolver(createChapterSchema),
    defaultValues: {
      title: "",
      units: ["", "", ""],
    },
  });

  function onSubmit(data: FormInput) {
    if (data.units.some((unit) => unit.trim() === "")) {
      toast({
        title: "Error",
        description: "Please fill all the units",
        variant: "destructive",
      });
      return;
    }

    createChapters(data, {
      onSuccess: ({ course_id }) => {
        toast({
          title: "Success",
          description: "Course created successfully",
        });
        router.push(`/create/${course_id}`);
      },
      onError: (error: any) => {
        const message =
          error?.response?.status === 402
            ? "You have no credits left"
            : "Something went wrong";

        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      },
    });
  }

  return (
    <div className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full mt-4">
          {/* TITLE */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="flex flex-col items-start w-full sm:flex-row sm:items-center">
                <FormLabel className="flex-[1] text-xl">Title</FormLabel>
                <FormControl className="flex-[6]">
                  <Input placeholder="Enter the main topic" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          {/* UNITS */}
          <AnimatePresence>
            {form.watch("units").map((_, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <FormField
                  control={form.control}
                  name={`units.${index}`}
                  render={({ field }) => (
                    <FormItem className="flex flex-col items-start w-full sm:flex-row sm:items-center">
                      <FormLabel className="flex-[1] text-xl">
                        Unit {index + 1}
                      </FormLabel>
                      <FormControl className="flex-[6]">
                        <Input placeholder="Enter subtopic" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* ACTIONS */}
          <div className="flex justify-center mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                form.setValue("units", [...form.watch("units"), ""])
              }
            >
              Add Unit <Plus className="ml-2 w-4 h-4" />
            </Button>

            <Button
              type="button"
              variant="secondary"
              className="ml-2"
              onClick={() =>
                form.setValue("units", form.watch("units").slice(0, -1))
              }
            >
              Remove Unit <Trash className="ml-2 w-4 h-4" />
            </Button>
          </div>

          {/* SUBMIT */}
          <Button disabled={isLoading} type="submit" className="w-full mt-6">
            {isLoading ? "Creating..." : "Let’s Go!"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default CreateCourseForm;
