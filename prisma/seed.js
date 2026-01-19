const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Explore courses...");

  // 1️⃣ Create / reuse a dedicated SEED user (Explore-only courses)
  const seedUser = await prisma.user.upsert({
    where: { email: "seed@learnforge.dev" },
    update: {},
    create: {
      email: "seed@learnforge.dev",
      name: "LearnForge Seed",
    },
  });

  // 2️⃣ Clean old seeded courses (optional but recommended)
  await prisma.course.deleteMany({
    where: {
      userId: seedUser.id,
    },
  });

  const img = (url) => `${url}?w=800&auto=format&fit=crop`;

  // 3️⃣ Seed course data
  const courses = [
    {
      name: "Machine Learning Fundamentals",
      image:
        "https://images.unsplash.com/photo-1677442136019-21780ecad995",
      category: "AI",
      units: [
        {
          name: "Introduction to Machine Learning",
          chapters: [
            "What is Machine Learning?",
            "Types of Machine Learning",
          ],
        },
        {
          name: "Core Concepts",
          chapters: [
            "Supervised Learning",
            "Unsupervised Learning",
          ],
        },
      ],
    },

    {
      name: "Deep Learning with Neural Networks",
      image:
        "https://images.unsplash.com/photo-1534751516642-a1af1ef26a56",
      category: "AI",
      units: [
        {
          name: "Neural Networks Basics",
          chapters: [
            "Perceptron Model",
            "Activation Functions",
          ],
        },
      ],
    },

    {
      name: "Data Science Bootcamp",
      image:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71",
      category: "Data Science",
      units: [
        {
          name: "Data Analysis",
          chapters: [
            "Data Cleaning",
            "Exploratory Data Analysis",
          ],
        },
      ],
    },

    {
      name: "Python for Beginners",
      image:
        "https://images.unsplash.com/photo-1526379095098-d400fd0bf935",
      category: "Programming",
      units: [
        {
          name: "Python Basics",
          chapters: [
            "Variables & Data Types",
            "Loops & Conditions",
          ],
        },
      ],
    },

    {
      name: "Web Development with React",
      image:
        "https://images.unsplash.com/photo-1555066931-4365d14bab8c",
      category: "Web Development",
      units: [
        {
          name: "React Fundamentals",
          chapters: [
            "Components & JSX",
            "Props & State",
          ],
        },
      ],
    },

    {
      name: "Next.js Full Stack Development",
      image:
        "https://images.unsplash.com/photo-1618477247222-acbdb0e159b3",
      category: "Web Development",
      units: [
        {
          name: "Next.js Core",
          chapters: [
            "Routing & Pages",
            "Server Components",
          ],
        },
      ],
    },

    {
      name: "Business Strategy Essentials",
      image:
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf",
      category: "Business",
      units: [
        {
          name: "Strategy Basics",
          chapters: [
            "Competitive Advantage",
            "Market Analysis",
          ],
        },
      ],
    },

    {
      name: "Startup & Entrepreneurship",
      image:
        "https://images.unsplash.com/photo-1559136555-9303baea8ebd",
      category: "Business",
      units: [
        {
          name: "Startup Foundations",
          chapters: [
            "Idea Validation",
            "MVP Building",
          ],
        },
      ],
    },

    {
      name: "Political Science 101",
      image:
        "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620",
      category: "Politics",
      units: [
        {
          name: "Political Systems",
          chapters: [
            "Democracy",
            "Authoritarianism",
          ],
        },
      ],
    },

    {
      name: "Indian Constitution Explained",
      image:
        "https://images.unsplash.com/photo-1604357209793-fca5dca89f97",
      category: "Politics",
      units: [
        {
          name: "Constitution Basics",
          chapters: [
            "Fundamental Rights",
            "Directive Principles",
          ],
        },
      ],
    },

    {
      name: "World History: Ancient Civilizations",
      image:
        "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1",
      category: "History",
      units: [
        {
          name: "Early Civilizations",
          chapters: [
            "Indus Valley",
            "Mesopotamia",
          ],
        },
      ],
    },

    {
      name: "Modern World History",
      image:
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
      category: "History",
      units: [
        {
          name: "20th Century",
          chapters: [
            "World War I",
            "World War II",
          ],
        },
      ],
    },

    {
      name: "Economics for Beginners",
      image:
        "https://images.unsplash.com/photo-1544378730-8b5104b18790",
      category: "Economics",
      units: [
        {
          name: "Microeconomics",
          chapters: [
            "Supply & Demand",
            "Market Structures",
          ],
        },
      ],
    },

    {
      name: "Financial Markets & Trading",
      image:
        "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3",
      category: "Finance",
      units: [
        {
          name: "Markets",
          chapters: [
            "Stocks & Bonds",
            "Derivatives",
          ],
        },
      ],
    },

    {
      name: "Cyber Security Fundamentals",
      image:
        "https://images.unsplash.com/photo-1510511459019-5dda7724fd87",
      category: "Cyber Security",
      units: [
        {
          name: "Security Basics",
          chapters: [
            "Network Security",
            "Common Attacks",
          ],
        },
      ],
    },
  ];

  // 4️⃣ Insert courses
  for (const course of courses) {
    await prisma.course.create({
      data: {
        name: course.name,
        image: course.image,
        category: course.category,
        userId: seedUser.id,
        units: {
          create: course.units.map((unit) => ({
            name: unit.name,
            chapters: {
              create: unit.chapters.map((chapterName) => ({
                name: chapterName,
                youtubeSearchQuery: chapterName,
              })),
            },
          })),
        },
      },
    });
  }

  console.log("✅ Explore courses seeded successfully!");
}

main()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
