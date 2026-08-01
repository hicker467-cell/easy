import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.googleEmail = profile.email;
        token.googleName = profile.name;
        token.googlePicture = profile.picture;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.googleEmail = token.googleEmail;
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
});
