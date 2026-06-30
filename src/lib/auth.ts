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

/* -------------------- SUPABASE SERVER CLIENT -------------------- */

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only
  );
}

/* -------------------- AUTH OPTIONS -------------------- */

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],

  callbacks: {
    async jwt({ token, account, profile }) {
      // Run only on sign-in
      if (account && profile) {
        const supabase = getSupabaseAdmin();
        const userId = profile.sub as string;

        token.id = userId;

        // Fetch credits
        const { data, error } = await supabase
          .from("User")
          .select("credits")
          .eq("id", userId)
          .single();

        // If user exists and has 0 credits → give starter credits
        if (!error && data) {
          if (data.credits === 0) {
            await supabase
              .from("User")
              .update({ credits: 10 })
              .eq("id", userId);

            token.credits = 10;
          } else {
            token.credits = data.credits;
          }
        } else {
          // Safe fallback
          token.credits = 0;
        }
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

/* -------------------- CREDIT HELPER -------------------- */

export async function getUserCredits(userId: string) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("User")
    .select("credits")
    .eq("id", userId)
    .single();

  if (error || !data) return 0;

  return data.credits;
}
