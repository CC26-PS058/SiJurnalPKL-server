import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../configs/db.js';
import { authMiddleware, requireRole, requireActivated } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateId } from '../utils/nanoid.js';
import { isWithinRadius } from '../utils/geofencing.js';
import { getJakartaMonthRange, getJakartaWorkDate } from '../utils/date.js';
import fs from 'fs';
import path from 'path';

const router = Router();
router.use(authMiddleware, requireActivated);

// ============================================================
// POST /api/attendance/check-in
// ============================================================
const checkInSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  gpsAccuracy: z.number().optional(),
  photoBase64: z.string().min(1, 'Foto check-in wajib'),
  userAgent: z.string().optional(),
});

router.post('/check-in', requireRole('STUDENT'), async (req: Request, res: Response) => {
  const { latitude, longitude, gpsAccuracy, photoBase64, userAgent } = checkInSchema.parse(req.body);
  const { userId } = req.user!;

  // Find student + active placement
  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      placements: {
        where: { status: 'ACTIVE' },
        include: { industry: true },
      },
    },
  });

  if (!student || student.placements.length === 0) {
    throw new AppError(404, 'NO_ACTIVE_PLACEMENT', 'Tidak ada penempatan PKL aktif.');
  }

  const placement = student.placements[0];
  const industry = placement.industry;
  const today = getJakartaWorkDate();

  // Check duplicate
  const existing = await prisma.attendanceLog.findUnique({
    where: {
      placementId_workDate: {
        placementId: placement.id,
        workDate: today,
      },
    },
  });

  if (existing) {
    throw new AppError(409, 'ALREADY_CHECKED_IN', 'Anda sudah melakukan check-in hari ini.');
  }

  // Geofencing validation
  const geoResult = isWithinRadius(
    latitude, longitude,
    Number(industry.latitude), Number(industry.longitude),
    industry.radiusMeter
  );

  let gpsStatus: 'VALID' | 'WARNING' | 'INVALID' = 'VALID';
  if (!geoResult.within) {
    gpsStatus = 'INVALID';
    throw new AppError(422, 'OUTSIDE_RADIUS', `Anda berada di luar radius geofencing (${geoResult.distance}m dari lokasi, radius: ${industry.radiusMeter}m).`);
  }

  // Determine attendance status (PRESENT or LATE)
  let statusAttendance: 'PRESENT' | 'LATE' = 'PRESENT';
  if (industry.workHourType === 'FIXED_SHIFT' && industry.fixedCheckInTime) {
    const [h, m] = industry.fixedCheckInTime.split(':').map(Number);
    const checkInDeadline = new Date();
    checkInDeadline.setHours(h, m, 0, 0);
    if (new Date() > checkInDeadline) {
      statusAttendance = 'LATE';
    }
  }

  // Save photo to public/uploads
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'checkin');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const photoFileName = `${student.id}_${Date.now()}.jpg`;
  const photoPath = path.join(uploadsDir, photoFileName);
  const photoBuffer = Buffer.from(photoBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  fs.writeFileSync(photoPath, photoBuffer);
  const photoUrl = `/uploads/checkin/${photoFileName}`;

  // Create attendance log
  const attendanceLog = await prisma.attendanceLog.create({
    data: {
      id: generateId('attendance'),
      studentId: student.id,
      placementId: placement.id,
      workDate: today,
      checkInTime: new Date(),
      latitude,
      longitude,
      distanceFromIndustry: geoResult.distance,
      checkInPhotoUrl: photoUrl,
      gpsStatus,
      gpsAccuracy: gpsAccuracy || null,
      gpsAttemptCount: 1,
      userAgent: userAgent || null,
      statusAttendance,
    },
  });

  res.status(201).json({
    success: true,
    data: {
      attendanceId: attendanceLog.id,
      status: statusAttendance,
      distance: geoResult.distance,
      gpsStatus,
      checkInTime: attendanceLog.checkInTime,
    },
  });
});

// ============================================================
// POST /api/attendance/check-out
// ============================================================
const checkOutSchema = z.object({
  activityText: z.string().min(10, 'Deskripsi kegiatan minimal 10 karakter'),
  photoBase64: z.string().optional(),
  processedText: z.string().optional(),
  skillTags: z.array(z.string()).optional(),
});

router.post('/check-out', requireRole('STUDENT'), async (req: Request, res: Response) => {
  const { activityText, photoBase64, processedText, skillTags } = checkOutSchema.parse(req.body);
  const { userId } = req.user!;

  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      placements: {
        where: { status: 'ACTIVE' },
        include: { industry: true },
      },
    },
  });

  if (!student || student.placements.length === 0) {
    throw new AppError(404, 'NO_ACTIVE_PLACEMENT', 'Tidak ada penempatan PKL aktif.');
  }

  const placement = student.placements[0];
  const today = getJakartaWorkDate();

  // Find today's attendance
  const attendance = await prisma.attendanceLog.findUnique({
    where: {
      placementId_workDate: {
        placementId: placement.id,
        workDate: today,
      },
    },
    include: {
      dailyLog: true,
    },
  });

  if (!attendance) {
    throw new AppError(404, 'NOT_CHECKED_IN', 'Anda belum check-in hari ini.');
  }
  if (attendance.checkOutTime && attendance.dailyLog) {
    throw new AppError(409, 'ALREADY_CHECKED_OUT', 'Anda sudah check-out hari ini.');
  }

  // Save check-out photo if provided
  let checkOutPhotoUrl: string | null = null;
  if (photoBase64) {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'checkout');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const photoFileName = `${student.id}_${Date.now()}.jpg`;
    const photoPath = path.join(uploadsDir, photoFileName);
    const photoBuffer = Buffer.from(photoBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    fs.writeFileSync(photoPath, photoBuffer);
    checkOutPhotoUrl = `/uploads/checkout/${photoFileName}`;
  }

  const isRecovery = !!attendance.checkOutTime && !attendance.dailyLog;
  const effectiveCheckOutPhotoUrl = checkOutPhotoUrl || attendance.checkOutPhotoUrl || null;

  const dailyLog = await prisma.$transaction(async (tx) => {
    if (!attendance.checkOutTime) {
      await tx.attendanceLog.update({
        where: { id: attendance.id },
        data: {
          checkOutTime: new Date(),
          checkOutPhotoUrl: effectiveCheckOutPhotoUrl,
        },
      });
    } else if (checkOutPhotoUrl && checkOutPhotoUrl !== attendance.checkOutPhotoUrl) {
      await tx.attendanceLog.update({
        where: { id: attendance.id },
        data: {
          checkOutPhotoUrl,
        },
      });
    }

    if (attendance.dailyLog) {
      return attendance.dailyLog;
    }

    return tx.dailyLog.create({
      data: {
        id: generateId('dailyLog'),
        attendanceId: attendance.id,
        rawText: activityText,
        processedText: processedText || null,
        photoUrl: effectiveCheckOutPhotoUrl,
        skillTags: skillTags || [],
        aiStatus: processedText ? 'SUCCESS' : 'PENDING',
        approvalStatus: 'PENDING',
      },
    });
  });

  res.status(201).json({
    success: true,
    data: {
      dailyLogId: dailyLog.id,
      checkOutTime: attendance.checkOutTime || new Date(),
      message: isRecovery ? 'Jurnal harian berhasil dilengkapi.' : 'Check-out berhasil.',
    },
  });
});

// ============================================================
// GET /api/attendance/summary
// ============================================================
router.get('/summary', requireRole('STUDENT'), async (req: Request, res: Response) => {
  const { userId } = req.user!;

  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      placements: { where: { status: 'ACTIVE' } },
    },
  });

  if (!student || student.placements.length === 0) {
    throw new AppError(404, 'NO_ACTIVE_PLACEMENT', 'Tidak ada penempatan PKL aktif.');
  }

  const placementId = student.placements[0].id;

  const counts = await prisma.attendanceLog.groupBy({
    by: ['statusAttendance'],
    where: { placementId },
    _count: true,
  });

  const summary: Record<string, number> = {
    PRESENT: 0, LATE: 0, ABSENT: 0, LEAVE: 0, ALPHA: 0,
  };
  counts.forEach((c) => { summary[c.statusAttendance] = c._count; });

  // Today's attendance status
  const today = getJakartaWorkDate();
  const todayAttendance = await prisma.attendanceLog.findUnique({
    where: {
      placementId_workDate: {
        placementId,
        workDate: today,
      },
    },
    include: {
      dailyLog: {
        select: { id: true },
      },
    },
  });

  res.json({
    success: true,
    data: {
      summary,
      total: Object.values(summary).reduce((a, b) => a + b, 0),
      today: todayAttendance ? {
        status: todayAttendance.statusAttendance,
        checkInTime: todayAttendance.checkInTime,
        checkOutTime: todayAttendance.checkOutTime,
        hasCheckedIn: true,
        hasCheckedOut: !!todayAttendance.checkOutTime,
        hasReported: !!todayAttendance.dailyLog,
      } : {
        hasCheckedIn: false,
        hasCheckedOut: false,
        hasReported: false,
      },
    },
  });
});

// ============================================================
// GET /api/attendance/history
// ============================================================
router.get('/history', requireRole('STUDENT', 'MENTOR', 'TEACHER'), async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const studentId = req.query.studentId as string;
  const month = req.query.month as string; // format: YYYY-MM

  let targetStudentId: string | undefined;

  if (role === 'STUDENT') {
    const student = await prisma.student.findUnique({ where: { userId } });
    targetStudentId = student?.id;
  } else if (studentId) {
    targetStudentId = studentId;
  }

  const where: any = {};
  if (targetStudentId) where.studentId = targetStudentId;

  if (month) {
    const { startDate, endDate } = getJakartaMonthRange(month);
    where.workDate = { gte: startDate, lte: endDate };
  }

  const [logs, total] = await Promise.all([
    prisma.attendanceLog.findMany({
      where,
      include: {
        dailyLog: true,
        placement: { include: { industry: true } },
      },
      orderBy: { workDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.attendanceLog.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

export default router;
