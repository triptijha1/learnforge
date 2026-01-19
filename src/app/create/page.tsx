import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { InfoIcon } from "lucide-react";
import CreateCourseForm from "@/components/CreateCourseForm";

const CreatePage = async () => {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/gallery");
  }

  return (
    <div className="flex flex-col items-start max-w-xl px-8 mx-auto my-16 sm:px-0">
      <h1 className="self-center text-3xl font-bold text-center sm:text-6xl">
        Create a course with LearnForge
      </h1>

      <div className="flex p-4 mt-5 border-none bg-secondary">
        <InfoIcon className="w-12 h-12 mr-3 text-blue-400" />
        <div>
          Enter a course title or topic, then list the units you want to learn.
          Our AI will generate a complete course for you.
        </div>
      </div>

      <CreateCourseForm />
    </div>
  );
};

export default CreatePage;
