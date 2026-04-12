import { Router, Request, Response } from 'express';
import prisma from '../configs/db.js';
import { authMiddleware, requireRole, requireActivated } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateId } from '../utils/nanoid.js';
import { getJakartaWeekRange } from '../utils/date.js';

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

  // Weekly attendance array construction
  const now = new Date();
  const { startDate: startOfWeek, endDate: endOfWeek } = getJakartaWeekRange(now);

  const logsThisWeek = await prisma.attendanceLog.findMany({
    where: {
      student: { schoolId: teacher.schoolId },
      workDate: { gte: startOfWeek, lte: endOfWeek },
    },
    select: { workDate: true, statusAttendance: true },
  });

  const daysOfWeek = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];
  const initialWeekly = [
    { day: 'SEN', hadir: 0, izinSakit: 0, alpha: 0 },
    { day: 'SEL', hadir: 0, izinSakit: 0, alpha: 0 },
    { day: 'RAB', hadir: 0, izinSakit: 0, alpha: 0 },
    { day: 'KAM', hadir: 0, izinSakit: 0, alpha: 0 },
    { day: 'JUM', hadir: 0, izinSakit: 0, alpha: 0 },
    { day: 'SAB', hadir: 0, izinSakit: 0, alpha: 0 },
    { day: 'MIN', hadir: 0, izinSakit: 0, alpha: 0 },
  ];

  logsThisWeek.forEach((log) => {
    const dayName = daysOfWeek[log.workDate.getDay()];
    const index = initialWeekly.findIndex(w => w.day === dayName);
    if (index !== -1) {
      if (log.statusAttendance === 'PRESENT' || log.statusAttendance === 'LATE') initialWeekly[index].hadir += 1;
      else if (log.statusAttendance === 'SICK' || log.statusAttendance === 'EXCUSED') initialWeekly[index].izinSakit += 1;
      else if (log.statusAttendance === 'ABSENT' || log.statusAttendance === 'ALPHA') initialWeekly[index].alpha += 1;
    }
  });

  // Overall attendance ratio
  const overallAttendance = await prisma.attendanceLog.groupBy({
    by: ['statusAttendance'],
    where: { student: { schoolId: teacher.schoolId } },
    _count: true,
  });

  const attendanceRatioMap: Record<string, number> = {
    Hadir: 0,
    Izin: 0,
    Sakit: 0,
    Alpha: 0,
  };

  overallAttendance.forEach(a => {
    if (a.statusAttendance === 'PRESENT' || a.statusAttendance === 'LATE') attendanceRatioMap['Hadir'] += a._count;
    else if (a.statusAttendance === 'EXCUSED') attendanceRatioMap['Izin'] += a._count;
    else if (a.statusAttendance === 'SICK') attendanceRatioMap['Sakit'] += a._count;
    else if (a.statusAttendance === 'ABSENT' || a.statusAttendance === 'ALPHA') attendanceRatioMap['Alpha'] += a._count;
  });

  // PKL Akan Selesai (next 30 days)
  const in30Days = new Date();
  in30Days.setDate(now.getDate() + 30);

  const endingPlacements = await prisma.placement.findMany({
    where: {
      student: { schoolId: teacher.schoolId },
      status: 'ACTIVE',
      endDate: { gte: now, lte: in30Days }
    },
    include: {
      student: { include: { user: true } },
      industry: true,
    },
    orderBy: { endDate: 'asc' },
    take: 5
  });

  const pklEndingSoon = endingPlacements.map(p => ({
    id: p.id,
    nama: p.student.user.name,
    perusahaan: p.industry.name,
    tanggalSelesai: p.endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    avatarColor: '#4B48EC'
  }));

  res.json({
    success: true,
    data: {
      totalStudents,
      activePlacements,
      finishedPkl,
      notStarted: totalStudents - activePlacements - finishedPkl,
      weeklyAttendance: initialWeekly,
      attendanceRatio: attendanceRatioMap,
      pklEndingSoon,
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
