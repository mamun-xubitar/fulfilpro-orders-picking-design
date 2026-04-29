import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      active: boolean;
      isTempPassword: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    role: string;
    active: boolean;
    isTempPassword: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    active: boolean;
    isTempPassword: boolean;
  }
}
