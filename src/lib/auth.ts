import { DefaultSession, NextAuthOptions } from "next-auth";
import { prisma } from "./db";
import { getServerSession } from "next-auth/next";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      credits: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    credits?: number;
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },

  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],

  callbacks: {
    jwt: async ({ token }) => {
      // Fetch user only once
      if (!token.id && token.email) {
        const db_user = await prisma.user.findUnique({
          where: {
            email: token.email,
          },
        });

        if (db_user) {
          token.id = db_user.id;
          token.credits = db_user.credits;
        }
      }
      return token;
    },

    session: ({ session, token }) => {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.picture as string;
        session.user.credits = token.credits as number;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET as string,
};

export const getAuthSession = () => {
  return getServerSession(authOptions);
};
