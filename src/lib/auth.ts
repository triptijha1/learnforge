import { DefaultSession, NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth/next";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@supabase/supabase-js";

/* -------------------- TYPES -------------------- */

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

/* -------------------- AUTH OPTIONS -------------------- */

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt", // ✅ no database
  },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],

  callbacks: {
    async jwt({ token, account, profile }) {
      // Runs on first login
      if (account && profile) {
        token.id = profile.sub as string; // Google user id
        token.credits = 0; // default (can be fetched later)
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.credits = token.credits ?? 0;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET as string,
};

/* -------------------- SERVER SESSION -------------------- */

export const getAuthSession = () => {
  return getServerSession(authOptions);
};

// ---------------------------------------------
// OPTIONAL helper: fetch user credits on demand
// ---------------------------------------------
export async function getUserCredits(userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only
  );

  const { data, error } = await supabase
    .from("User")
    .select("credits")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return 0; // safe fallback
  }

  return data.credits;
}
