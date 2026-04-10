import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../configs/db.js';
import { authMiddleware, requireRole, requireActivated } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateId } from '../utils/nanoid.js';

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

  const students = placements.map((p) => ({
    placementId: p.id,
    studentId: p.student.id,
    nis: p.student.nis.toString(),
    name: p.student.user.name,
    school: p.student.school.name,
    whatsappNumber: p.student.user.whatsappNumber,
    startDate: p.startDate,
    endDate: p.endDate,
  }));

  res.json({ success: true, data: students });
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

  const mentor = await prisma.mentor.findUnique({ where: { userId } });
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

  const results = await Promise.all(
    logs.map(async ({ dailyLogId, action }) => {
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
