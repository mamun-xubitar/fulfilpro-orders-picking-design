import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { verifyPassword } from '@/lib/password';
import prisma from '@/lib/prisma.server';

type SettingsForAccess = {
  staffAccessDays: string[];
  staffAccessStart: string;
  staffAccessEnd: string;
};

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
      },
      authorize: async (credentials) => {
        const email = typeof credentials.email === 'string' ? credentials.email.trim().toLowerCase() : '';
        const password = typeof credentials.password === 'string' ? credentials.password : '';

        if (!email || !password) {
          throw new Error('Invalid credentials.');
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.active || !verifyPassword(password, user.password)) {
          throw new Error('Invalid credentials.');
        }

        if (user.role === 'staff') {
          const settings = await getSettingsForAccess();
          if (!isWithinStaffAccess(settings)) {
            throw new Error('Staff access is restricted at this time.');
          }
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active,
          isTempPassword: user.isTempPassword,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.active = user.active;
        token.isTempPassword = user.isTempPassword;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.active = token.active as boolean;
        session.user.isTempPassword = token.isTempPassword as boolean;
      }
      return session;
    },
  },
});

async function getSettingsForAccess(): Promise<SettingsForAccess> {
  const settings = await prisma.appSettings.findUnique({ where: { id: 'default' } });

  return {
    staffAccessDays: normalizeDays(settings?.staffAccessDays),
    staffAccessStart: settings?.staffAccessStart ?? '08:00',
    staffAccessEnd: settings?.staffAccessEnd ?? '16:00',
  };
}

function isWithinStaffAccess(settings: SettingsForAccess) {
  const now = new Date();
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = parseTime(settings.staffAccessStart);
  const end = parseTime(settings.staffAccessEnd);

  return settings.staffAccessDays.includes(day) && minutes >= start && minutes < end;
}

function parseTime(value: string) {
  const [hours = '0', minutes = '0'] = value.split(':');
  return Number(hours) * 60 + Number(minutes);
}

function normalizeDays(value: unknown) {
  if (!Array.isArray(value)) return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  return value.filter((day): day is string => typeof day === 'string');
}
