import * as courseRepo from "@/repositories/course.repository";

export async function createCourseWithUnits(
  title: string,
  units: string[],
  userId: string
) {
  const course = await courseRepo.createCourse({
    title,
    userId,
  });

  await courseRepo.createUnits(course.id, units);

  return course;
}

export async function fetchCourses(userId: string) {
  return courseRepo.getCourses(userId);
}