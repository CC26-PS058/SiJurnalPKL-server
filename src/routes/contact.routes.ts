import { Router, Request, Response } from 'express';
import prisma from '../configs/db.js';
import { authMiddleware, requireRole, requireActivated } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authMiddleware, requireActivated, requireRole('STUDENT'));

// ============================================================
// GET /api/contacts — Get pembimbing, mentor, and technisi info
// ============================================================
router.get('/', async (req: Request, res: Response) => {
  const { userId } = req.user!;

  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      school: true,
      placements: {
        where: { status: 'ACTIVE' },
        include: {
          industry: {
            include: {
              mentors: {
                include: {
                  user: { select: { name: true, whatsappNumber: true, email: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!student) throw new AppError(404, 'STUDENT_NOT_FOUND', 'Data siswa tidak ditemukan.');

  // Get teachers from same school
  const teachers = await prisma.teacher.findMany({
    where: { schoolId: student.schoolId },
    include: {
      user: { select: { name: true, whatsappNumber: true, email: true } },
    },
  });

  const placement = student.placements[0];
  const mentors = placement?.industry?.mentors?.map((m) => ({
    name: m.user.name,
    whatsappNumber: m.user.whatsappNumber,
    email: m.user.email,
    waLink: m.user.whatsappNumber
      ? `https://wa.me/${m.user.whatsappNumber.replace(/^0/, '62').replace(/^\+/, '')}`
      : null,
    industry: placement.industry.name,
  })) || [];

  const teacherContacts = teachers.map((t) => ({
    name: t.user.name,
    whatsappNumber: t.user.whatsappNumber,
    email: t.user.email,
    waLink: t.user.whatsappNumber
      ? `https://wa.me/${t.user.whatsappNumber.replace(/^0/, '62').replace(/^\+/, '')}`
      : null,
    school: student.school.name,
  }));

  res.json({
    success: true,
    data: {
      mentors,
      teachers: teacherContacts,
      school: student.school,
      industry: placement?.industry ? {
        name: placement.industry.name,
        address: placement.industry.address,
      } : null,
    },
  });
});

export default router;
