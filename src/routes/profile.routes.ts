import { Router, Request, Response } from 'express';
import prisma from '../configs/db.js';
import { authMiddleware, requireActivated } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

router.use(authMiddleware);

// ============================================================
// GET /api/profile
// ============================================================
router.get('/', async (req: Request, res: Response) => {
  const { userId, role } = req.user!;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: {
        include: {
          school: true,
          placements: {
            where: { status: 'ACTIVE' },
            include: { industry: true },
          },
        },
      },
      mentor: { include: { industry: true } },
      teacher: { include: { school: true } },
      admin: { include: { school: true } },
    },
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User tidak ditemukan.');
  }

  const profile: Record<string, any> = {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    whatsappNumber: user.whatsappNumber,
    role: user.role,
    activated: user.activated,
    createdAt: user.createdAt,
  };

  if (user.student) {
    profile.nis = user.student.nis.toString();
    profile.studentId = user.student.id;
    profile.statusPkl = user.student.statusPkl;
    profile.school = user.student.school;
    profile.recommendedTitle = user.student.recommendedTitle;
    profile.placement = user.student.placements[0] || null;
  }
  if (user.mentor) {
    profile.mentorId = user.mentor.id;
    profile.industry = user.mentor.industry;
  }
  if (user.teacher) {
    profile.teacherId = user.teacher.id;
    profile.school = user.teacher.school;
  }
  if (user.admin) {
    profile.adminId = user.admin.id;
    profile.school = user.admin.school;
  }

  res.json({ success: true, data: profile });
});

// ============================================================
// PATCH /api/profile
// ============================================================
router.patch('/', requireActivated, async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const { name, email, whatsappNumber } = req.body;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name && { name }),
      ...(email && { email }),
      ...(whatsappNumber && { whatsappNumber }),
    },
  });

  res.json({
    success: true,
    data: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      whatsappNumber: updatedUser.whatsappNumber,
    },
  });
});

export default router;
