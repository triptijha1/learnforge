import { prisma } from "@/lib/db";

export async function createCourse(data: {
  title: string;
  userId: string;
}) {
  return prisma.course.create({
    data: {
      name: data.title,
      image: "/default-course.jpg",   // add this line
      userId: data.userId,
    },
  });
}

export async function createUnits(
  courseId: string,
  units: string[]
) {
  return prisma.unit.createMany({
    data: units.map((unit) => ({
      name: unit,
      courseId,
    })),
  });
}

export async function getCourses(userId: string) {
  return prisma.course.findMany({
    where: { userId },
    include: { units: true },
  });
}