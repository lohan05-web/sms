import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { healthRouter } from '../modules/health/health.routes';
import { usersRouter } from '../modules/users/users.routes';
import { studentsRouter } from '../modules/students/students.routes';
import { teachersRouter } from '../modules/teachers/teachers.routes';
import { guardiansRouter } from '../modules/guardians/guardians.routes';
import { classesRouter } from '../modules/classes/classes.routes';
import { subjectsRouter } from '../modules/subjects/subjects.routes';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/students', studentsRouter);
apiRouter.use('/teachers', teachersRouter);
apiRouter.use('/guardians', guardiansRouter);
apiRouter.use('/classes', classesRouter);
apiRouter.use('/subjects', subjectsRouter);
