import { Router, Request, Response } from 'express';
import prisma from '../configs/db.js';
import { authMiddleware, requireRole, requireActivated } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateId } from '../utils/nanoid.js';

const router = Router();
router.use(authMiddleware, requireActivated, requireRole('TEACHER'));

// ============================================================
// GET /api/teacher/students — List students assigned to teacher
// ============================================================
router.get('/students', async (req: Request, res: Response) => {
  const { userId } = req.user!;

  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    include: { school: true },
  });

  if (!teacher) throw new AppError(404, 'TEACHER_NOT_FOUND', 'Data guru tidak ditemukan.');

  // Get all students from the same school
  const students = await prisma.student.findMany({
    where: { schoolId: teacher.schoolId },
    include: {
      user: { select: { name: true, username: true, whatsappNumber: true } },
      school: { select: { name: true } },
      placements: {
        include: { industry: { select: { name: true } } },
        orderBy: { startDate: 'desc' },
        take: 1,
      },
      finalAssessment: true,
    },
  });

  const result = students.map((s) => ({
    studentId: s.id,
    nis: s.nis.toString(),
    name: s.user.name,
    school: s.school.name,
    statusPkl: s.statusPkl,
    whatsappNumber: s.user.whatsappNumber,
    recommendedTitle: s.recommendedTitle,
    currentPlacement: s.placements[0] ? {
      industry: s.placements[0].industry.name,
      startDate: s.placements[0].startDate,
      endDate: s.placements[0].endDate,
      status: s.placements[0].status,
    } : null,
    hasFinalAssessment: !!s.finalAssessment,
  }));

  res.json({ success: true, data: result });
});

// ============================================================
// GET /api/teacher/analytics — Dashboard analytics
// ============================================================
router.get('/analytics', async (req: Request, res: Response) => {
  const { userId } = req.user!;

  const teacher = await prisma.teacher.findUnique({ where: { userId } });
  if (!teacher) throw new AppError(404, 'TEACHER_NOT_FOUND', 'Data guru tidak ditemukan.');

  const totalStudents = await prisma.student.count({
    where: { schoolId: teacher.schoolId },
  });

  const activePlacements = await prisma.student.count({
    where: { schoolId: teacher.schoolId, statusPkl: 'ACTIVE' },
  });

  const finishedPkl = await prisma.student.count({
    where: { schoolId: teacher.schoolId, statusPkl: 'FINISHED' },
  });

  // This week's attendance
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
  startOfWeek.setHours(0, 0, 0, 0);

  const weeklyAttendance = await prisma.attendanceLog.groupBy({
    by: ['statusAttendance'],
    where: {
      student: { schoolId: teacher.schoolId },
      workDate: { gte: startOfWeek },
    },
    _count: true,
  });

  const attendanceMap: Record<string, number> = {};
  weeklyAttendance.forEach((a) => { attendanceMap[a.statusAttendance] = a._count; });

  res.json({
    success: true,
    data: {
      totalStudents,
      activePlacements,
      finishedPkl,
      notStarted: totalStudents - activePlacements - finishedPkl,
      weeklyAttendance: attendanceMap,
    },
  });
});

// ============================================================
// POST /api/teacher/assessment — Submit final assessment
// ============================================================
router.post('/assessment', async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const { studentId, finalScore, recommendationStatus } = req.body;

  const teacher = await prisma.teacher.findUnique({ where: { userId } });
  if (!teacher) throw new AppError(404, 'TEACHER_NOT_FOUND', 'Data guru tidak ditemukan.');

  const assessment = await prisma.finalAssessment.upsert({
    where: { studentId },
    create: {
      id: generateId('assessment'),
      teacherId: teacher.id,
      studentId,
      finalScore,
      recommendationStatus,
      approvedAt: new Date(),
    },
    update: {
      finalScore,
      recommendationStatus,
      approvedAt: new Date(),
    },
  });

  res.json({ success: true, data: assessment });
});

export default router;
