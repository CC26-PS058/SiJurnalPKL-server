import { Router, Request, Response } from 'express';
import prisma from '../configs/db.js';
import { authMiddleware, requireActivated } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

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
    targetStudentId = studentId;
  }

  if (!targetStudentId) {
    throw new AppError(400, 'MISSING_STUDENT', 'Student ID required.');
  }

  const where: any = {
    attendance: { studentId: targetStudentId },
  };

  if (month) {
    const [year, m] = month.split('-').map(Number);
    const startDate = new Date(year, m - 1, 1);
    const endDate = new Date(year, m, 0);
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
