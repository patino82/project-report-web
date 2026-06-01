import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// Recommendation: use "jwt" for mobile-first or stateless workloads.
// The app currently uses server-side Prisma calls; using "jwt" reduces DB calls.
// If you need server-side sessions persisted across devices, switch to "database".

export const handler = NextAuth({
  adapter: PrismaAdapter(prisma as any),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  // Recommend "jwt" for this project (mobile-first / fewer DB roundtrips).
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token, user }) {
      // Attach user id and role from the database to the session object
      if (session.user && (user as any)?.id) {
        session.user.id = (user as any).id;
        session.user.role = (user as any).role;
      } else if (session.user && token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = (user as any).id;
        // include role on token when available
        if ((user as any).role) token.role = (user as any).role;
      }
      return token;
    },
  },
  pages: {
    signIn: "/", // fallback to home; update if you add a custom sign-in page
  },
});

export { handler as GET, handler as POST };
