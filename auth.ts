import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { verifyPassword } from '@/lib/password';
import prisma from '@/lib/prisma.server';
import { evaluateStaffAccess, getAuthPolicy } from '@/lib/auth-policy.server';
import { isStaffLikeRole } from '@/lib/roles';

const appUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? process.env.APP_URL;
const authRedirectBaseUrl = appUrl?.replace(/\/$/, '');

export const { handlers, signIn, signOut, auth } = NextAuth({
  pages: {
    signIn: '/',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        approvalRequestId: {},
      },
      authorize: async (credentials) => {
        const email = typeof credentials.email === 'string' ? credentials.email.trim().toLowerCase() : '';
        const password = typeof credentials.password === 'string' ? credentials.password : '';
        const approvalRequestId = typeof credentials.approvalRequestId === 'string' ? credentials.approvalRequestId : '';

        if (!email || !password) {
          throw new Error('Invalid credentials.');
        }
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.active || !verifyPassword(password, user.password)) {
          throw new Error('Invalid credentials.');
        }

        if (isStaffLikeRole(user.role)) {
          const policy = await getAuthPolicy();
          const access = evaluateStaffAccess(policy);
          if (!access.allowed) {
            throw new Error('Staff access is restricted at this time.');
          }
          if (!approvalRequestId) {
            throw new Error('Staff login requires admin approval.');
          }

          const approval = await prisma.staffLoginApproval.findUnique({
            where: { id: approvalRequestId },
          });

          if (
            !approval ||
            approval.userId !== user.id ||
            approval.status !== 'approved' ||
            approval.consumedAt ||
            approval.expiresAt.getTime() <= Date.now()
          ) {
            throw new Error('Staff login approval is missing or expired.');
          }

          await prisma.staffLoginApproval.update({
            where: { id: approval.id },
            data: { consumedAt: new Date() },
          });
        }

        const loginAt = Date.now();
        await prisma.user.update({
          where: { id: user.id },
          data: {
            isLoggedIn: true,
            lastLoginAt: new Date(loginAt),
            lastLogoutAt: null,
          },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active,
          isTempPassword: user.isTempPassword,
          loginAt,
        };
      },
    }),
  ],
  callbacks: {
    redirect({ url, baseUrl }) {
      const redirectBaseUrl = process.env.NODE_ENV === "production" ? authRedirectBaseUrl ?? baseUrl : baseUrl;
      console.log("redirectBaseUrl", redirectBaseUrl, "url", url, baseUrl)
      if (url.startsWith('/')) {
        return `${redirectBaseUrl}${url}`;
      }

      try {
        if (new URL(url).origin === redirectBaseUrl) {
          return url;
        }
      } catch {
        return redirectBaseUrl;
      }

      return redirectBaseUrl;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.active = user.active;
        token.isTempPassword = user.isTempPassword;
        token.loginAt = user.loginAt;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.active = token.active as boolean;
        session.user.isTempPassword = token.isTempPassword as boolean;
        session.user.loginAt = token.loginAt as number;
      }
      return session;
    },
  },
});
