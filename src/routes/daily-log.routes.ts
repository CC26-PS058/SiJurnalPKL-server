import { Router, Request, Response } from 'express';
import prisma from '../configs/db.js';
import { authMiddleware, requireActivated } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { getJakartaMonthRange } from '../utils/date.js';

const router = Router();
router.use(authMiddleware, requireActivated);

// ============================================================
// GET /api/daily-logs — List daily logs for current student
// ============================================================
router.get('/', async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const month = req.query.month as string; // YYYY-MM
  const studentId = req.query.studentId as string;

  let targetStudentId: string | undefined;

  if (role === 'STUDENT') {
    const student = await prisma.student.findUnique({ where: { userId } });
    targetStudentId = student?.id;
  } else if (studentId) {
    if (role === 'MENTOR') {
      const mentor = await prisma.mentor.findUnique({ where: { userId } });
      if (!mentor) {
        throw new AppError(404, 'MENTOR_NOT_FOUND', 'Data mentor tidak ditemukan.');
      }

      const allowed = await prisma.placement.findFirst({
        where: {
          studentId,
          industryId: mentor.industryId,
        },
        select: { id: true },
      });

      if (!allowed) {
        throw new AppError(403, 'FORBIDDEN', 'Anda tidak dapat mengakses jurnal siswa ini.');
      }
    }

    if (role === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({ where: { userId } });
      if (!teacher) {
        throw new AppError(404, 'TEACHER_NOT_FOUND', 'Data guru tidak ditemukan.');
      }

      const allowed = await prisma.student.findFirst({
        where: {
          id: studentId,
          schoolId: teacher.schoolId,
        },
        select: { id: true },
      });

      if (!allowed) {
        throw new AppError(403, 'FORBIDDEN', 'Anda tidak dapat mengakses jurnal siswa ini.');
      }
    }

    if (role === 'ADMIN') {
      const admin = await prisma.admin.findUnique({ where: { userId } });
      if (!admin) {
        throw new AppError(404, 'ADMIN_NOT_FOUND', 'Data admin tidak ditemukan.');
      }

      const allowed = await prisma.student.findFirst({
        where: {
          id: studentId,
          schoolId: admin.schoolId,
        },
        select: { id: true },
      });

      if (!allowed) {
        throw new AppError(403, 'FORBIDDEN', 'Anda tidak dapat mengakses jurnal siswa ini.');
      }
    }

    targetStudentId = studentId;
  }

  if (!targetStudentId) {
    throw new AppError(400, 'MISSING_STUDENT', 'Student ID required.');
  }

  const where: any = {
    attendance: { studentId: targetStudentId },
  };

  if (month) {
    const { startDate, endDate } = getJakartaMonthRange(month);
    where.attendance = {
      ...where.attendance,
      workDate: { gte: startDate, lte: endDate },
    };
  }

  const logs = await prisma.dailyLog.findMany({
    where,
    include: {
      attendance: {
        select: {
          workDate: true,
          checkInTime: true,
          checkOutTime: true,
          checkInPhotoUrl: true,
          checkOutPhotoUrl: true,
          statusAttendance: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    success: true,
    data: logs.map((log) => ({
      id: log.id,
      date: log.attendance.workDate,
      checkInTime: log.attendance.checkInTime,
      checkOutTime: log.attendance.checkOutTime,
      checkInPhotoUrl: log.attendance.checkInPhotoUrl,
      checkOutPhotoUrl: log.attendance.checkOutPhotoUrl,
      attendanceStatus: log.attendance.statusAttendance,
      rawText: log.rawText,
      processedText: log.processedText,
      photoUrl: log.photoUrl,
      skillTags: log.skillTags,
      aiStatus: log.aiStatus,
      approvalStatus: log.approvalStatus,
      createdAt: log.createdAt,
    })),
  });
});

export default router;
