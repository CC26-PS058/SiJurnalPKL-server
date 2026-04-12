import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../configs/db.js';
import { authMiddleware, requireRole, requireActivated } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateId } from '../utils/nanoid.js';
import { getJakartaWorkDate } from '../utils/date.js';

const router = Router();
router.use(authMiddleware, requireActivated, requireRole('MENTOR'));

// ============================================================
// GET /api/mentor/students — List students in mentor's industry
// ============================================================
router.get('/students', async (req: Request, res: Response) => {
  const { userId } = req.user!;

  const mentor = await prisma.mentor.findUnique({
    where: { userId },
    include: { industry: true },
  });

  if (!mentor) throw new AppError(404, 'MENTOR_NOT_FOUND', 'Data mentor tidak ditemukan.');

  const placements = await prisma.placement.findMany({
    where: { industryId: mentor.industryId, status: 'ACTIVE' },
    include: {
      student: {
        include: {
          user: { select: { name: true, username: true, whatsappNumber: true } },
          school: { select: { name: true } },
        },
      },
    },
  });

  const students = await Promise.all(placements.map(async (p) => {
    const logs = await prisma.dailyLog.groupBy({
      by: ['approvalStatus'],
      where: { attendance: { placementId: p.id } },
      _count: { approvalStatus: true }
    });

    const pending = logs.find(l => l.approvalStatus === 'PENDING')?._count.approvalStatus || 0;
    const approved = logs.find(l => l.approvalStatus === 'APPROVED')?._count.approvalStatus || 0;
    const rejected = logs.find(l => l.approvalStatus === 'REJECTED')?._count.approvalStatus || 0;

    return {
      placementId: p.id,
      studentId: p.student.id,
      nis: p.student.nis.toString(),
      name: p.student.user.name,
      school: p.student.school.name,
      perusahaan: mentor.industry.name,
      whatsappNumber: p.student.user.whatsappNumber,
      startDate: p.startDate,
      endDate: p.endDate,
      stats: { pending, approved, rejected, total: pending + approved + rejected }
    };
  }));

  res.json({ success: true, data: students });
});

// ============================================================
// GET /api/mentor/analytics — High-level statistics
// ============================================================
router.get('/analytics', async (req: Request, res: Response) => {
  const { userId } = req.user!;

  const mentor = await prisma.mentor.findUnique({ where: { userId } });
  if (!mentor) throw new AppError(404, 'MENTOR_NOT_FOUND', 'Data mentor tidak ditemukan.');

  const placements = await prisma.placement.findMany({
    where: { industryId: mentor.industryId, status: 'ACTIVE' },
    select: { id: true },
  });
  const placementIds = placements.map(p => p.id);

  const totalStudents = placementIds.length;

  const today = getJakartaWorkDate();
  
  const presentToday = await prisma.attendanceLog.count({
    where: {
      placementId: { in: placementIds },
      workDate: { gte: today },
      statusAttendance: { in: ['PRESENT', 'LATE'] }
    }
  });

  const pendingApprovals = await prisma.dailyLog.count({
    where: {
      attendance: { placementId: { in: placementIds } },
      approvalStatus: 'PENDING'
    }
  });

  res.json({
    success: true,
    data: {
      totalStudents,
      presentToday,
      pendingApprovals
    }
  });
});
// ============================================================
// GET /api/mentor/daily-logs — Daily logs of students
// ============================================================
router.get('/daily-logs', async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const status = req.query.status as string;
  const studentId = req.query.studentId as string;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const mentor = await prisma.mentor.findUnique({ 
    where: { userId },
    include: { industry: true }
  });
  if (!mentor) throw new AppError(404, 'MENTOR_NOT_FOUND', 'Data mentor tidak ditemukan.');

  // Get placement IDs in this mentor's industry
  const placements = await prisma.placement.findMany({
    where: { industryId: mentor.industryId, status: 'ACTIVE' },
    select: { id: true },
  });
  const placementIds = placements.map((p) => p.id);

  const where: any = {
    attendance: { placementId: { in: placementIds } },
  };
  if (status) where.approvalStatus = status;
  if (studentId) where.attendance = { ...where.attendance, studentId };

  const [logs, total] = await Promise.all([
    prisma.dailyLog.findMany({
      where,
      include: {
        attendance: {
          include: {
            student: {
              include: { user: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.dailyLog.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      logs: logs.map((log) => ({
        id: log.id,
        date: log.attendance.workDate,
        studentName: log.attendance.student.user.name,
        studentId: log.attendance.studentId,
        rawText: log.rawText,
        processedText: log.processedText,
        photoUrl: log.photoUrl,
        skillTags: log.skillTags,
        aiStatus: log.aiStatus,
        approvalStatus: log.approvalStatus,
        createdAt: log.createdAt,
        checkInTime: log.attendance.checkInTime,
        checkOutTime: log.attendance.checkOutTime,
        statusAttendance: log.attendance.statusAttendance,
        perusahaan: mentor.industry.name,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
});

// ============================================================
// POST /api/mentor/approve-batch — Approve/reject daily logs
// ============================================================
const approveBatchSchema = z.object({
  logs: z.array(z.object({
    dailyLogId: z.string(),
    action: z.enum(['APPROVED', 'REJECTED']),
  })),
});

router.post('/approve-batch', async (req: Request, res: Response) => {
  const { logs } = approveBatchSchema.parse(req.body);
  const { userId } = req.user!;

  const mentor = await prisma.mentor.findUnique({ where: { userId } });
  if (!mentor) throw new AppError(404, 'MENTOR_NOT_FOUND', 'Data mentor tidak ditemukan.');

  const placementIds = new Set(
    (
      await prisma.placement.findMany({
        where: { industryId: mentor.industryId },
        select: { id: true },
      })
    ).map((placement) => placement.id)
  );

  const results = await Promise.all(
    logs.map(async ({ dailyLogId, action }) => {
      const existing = await prisma.dailyLog.findUnique({
        where: { id: dailyLogId },
        include: {
          attendance: {
            select: { placementId: true },
          },
        },
      });

      if (!existing || !placementIds.has(existing.attendance.placementId)) {
        throw new AppError(403, 'FORBIDDEN', 'Anda tidak dapat memproses jurnal ini.');
      }

      const updated = await prisma.dailyLog.update({
        where: { id: dailyLogId },
        data: {
          approvalStatus: action,
          approvedBy: mentor.id,
          approvedAt: new Date(),
        },
      });
      return { id: updated.id, status: updated.approvalStatus };
    })
  );

  res.json({
    success: true,
    data: { updated: results.length, results },
  });
});

// ============================================================
// POST /api/mentor/evaluation — Submit industry evaluation
// ============================================================
const evaluationSchema = z.object({
  placementId: z.string(),
  disciplineScore: z.number().min(1).max(100),
  technicalScore: z.number().min(1).max(100),
  communicationScore: z.number().min(1).max(100),
  teamworkScore: z.number().min(1).max(100),
  notes: z.string().min(1),
});

router.post('/evaluation', async (req: Request, res: Response) => {
  const data = evaluationSchema.parse(req.body);
  const { userId } = req.user!;

  const mentor = await prisma.mentor.findUnique({ where: { userId } });
  if (!mentor) throw new AppError(404, 'MENTOR_NOT_FOUND', 'Data mentor tidak ditemukan.');

  const evaluation = await prisma.industryEvaluation.upsert({
    where: {
      mentorId_placementId: {
        mentorId: mentor.id,
        placementId: data.placementId,
      },
    },
    create: {
      id: generateId('evaluation'),
      mentorId: mentor.id,
      ...data,
      submittedAt: new Date(),
    },
    update: {
      ...data,
      submittedAt: new Date(),
    },
  });

  res.json({ success: true, data: evaluation });
});


export default router;
