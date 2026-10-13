import type { Role } from '@smartschool/shared';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
        schoolId: string | null;
      };
    }
  }
}

export {};
