import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../configs/db.js';
import { authMiddleware, requireRole, requireActivated } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateId } from '../utils/nanoid.js';
import { hashPassword } from '../utils/password.js';
import { Role } from '../../generated/prisma/client.js';

const router = Router();
router.use(authMiddleware, requireActivated, requireRole('ADMIN'));

// ============================================================
// GET /api/admin/users — List users with optional role filter
// ============================================================
router.get('/users', async (req: Request, res: Response) => {
  const role = req.query.role as string | undefined;
  const search = req.query.search as string | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const where: any = {};
  if (role) where.role = role;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        student: { include: { school: true, placements: { include: { industry: true }, take: 1 } } },
        mentor: { include: { industry: true } },
        teacher: { include: { school: true } },
        admin: { include: { school: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  const mapped = users.map((u) => {
    const base: Record<string, any> = {
      id: u.id,
      username: u.username,
      name: u.name,
      email: u.email,
      whatsappNumber: u.whatsappNumber,
      role: u.role,
      activated: u.activated,
      createdAt: u.createdAt,
    };
    if (u.student) {
      base.nis = u.student.nis.toString();
      base.school = u.student.school?.name;
      base.statusPkl = u.student.statusPkl;
      base.industry = u.student.placements[0]?.industry?.name;
    }
    if (u.mentor) base.industry = u.mentor.industry?.name;
    if (u.teacher) base.school = u.teacher.school?.name;
    if (u.admin) base.school = u.admin.school?.name;
    return base;
  });

  res.json({
    success: true,
    data: {
      users: mapped,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
});

// ============================================================
// POST /api/admin/users — Create user
// ============================================================
const createUserSchema = z.object({
  username: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(['STUDENT', 'MENTOR', 'TEACHER', 'ADMIN']),
  email: z.string().email().optional(),
  whatsappNumber: z.string().optional(),
  // Role-specific fields
  nis: z.string().optional(),        // for STUDENT
  schoolId: z.string().optional(),   // for STUDENT, TEACHER, ADMIN
  industryId: z.string().optional(), // for MENTOR
});

router.post('/users', async (req: Request, res: Response) => {
  const data = createUserSchema.parse(req.body);

  // Default password = username (NISN for student, NIP for teacher, etc.)
  const defaultPassword = data.username;
  const passwordHash = await hashPassword(defaultPassword);

  const userId = generateId('user');

  const user = await prisma.user.create({
    data: {
      id: userId,
      username: data.username,
      name: data.name,
      email: data.email || null,
      whatsappNumber: data.whatsappNumber || null,
      passwordHash,
      role: data.role as Role,
      activated: false,
    },
  });

  // Create role-specific record
  switch (data.role) {
    case 'STUDENT':
      if (!data.nis || !data.schoolId) {
        throw new AppError(400, 'MISSING_FIELDS', 'NIS dan schoolId wajib untuk siswa.');
      }
      await prisma.student.create({
        data: {
          id: generateId('student'),
          userId,
          nis: BigInt(data.nis),
          schoolId: data.schoolId,
          statusPkl: 'NOT_STARTED',
        },
      });
      break;
    case 'MENTOR':
      if (!data.industryId) {
        throw new AppError(400, 'MISSING_FIELDS', 'industryId wajib untuk mentor.');
      }
      await prisma.mentor.create({
        data: {
          id: generateId('mentor'),
          userId,
          industryId: data.industryId,
        },
      });
      break;
    case 'TEACHER':
      if (!data.schoolId) {
        throw new AppError(400, 'MISSING_FIELDS', 'schoolId wajib untuk guru.');
      }
      await prisma.teacher.create({
        data: {
          id: generateId('teacher'),
          userId,
          schoolId: data.schoolId,
        },
      });
      break;
    case 'ADMIN':
      if (!data.schoolId) {
        throw new AppError(400, 'MISSING_FIELDS', 'schoolId wajib untuk admin.');
      }
      await prisma.admin.create({
        data: {
          id: generateId('admin'),
          userId,
          schoolId: data.schoolId,
        },
      });
      break;
  }

  res.status(201).json({
    success: true,
    data: {
      ...user,
      defaultPassword,
      message: `User berhasil dibuat. Password default: ${defaultPassword}`,
    },
  });
});

// ============================================================
// PATCH /api/admin/users/:id — Update user
// ============================================================
router.patch('/users/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { name, email, whatsappNumber } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(email !== undefined && { email }),
      ...(whatsappNumber !== undefined && { whatsappNumber }),
    },
  });

  res.json({ success: true, data: user });
});

// ============================================================
// DELETE /api/admin/users/:id — Delete user
// ============================================================
router.delete('/users/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;

  // Delete role-specific records first
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User tidak ditemukan.');

  // Cascade delete based on role
  switch (user.role) {
    case 'STUDENT': await prisma.student.deleteMany({ where: { userId: id } }); break;
    case 'MENTOR': await prisma.mentor.deleteMany({ where: { userId: id } }); break;
    case 'TEACHER': await prisma.teacher.deleteMany({ where: { userId: id } }); break;
    case 'ADMIN': await prisma.admin.deleteMany({ where: { userId: id } }); break;
  }

  await prisma.user.delete({ where: { id } });
  res.json({ success: true, data: { message: 'User berhasil dihapus.' } });
});

// ============================================================
// INDUSTRY CRUD
// ============================================================
router.get('/industries', async (req: Request, res: Response) => {
  const search = req.query.search as string | undefined;
  const where: any = {};
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  const industries = await prisma.industry.findMany({
    where,
    include: {
      _count: { select: { placements: true, mentors: true } },
    },
    orderBy: { name: 'asc' },
  });

  res.json({ success: true, data: industries });
});

const industrySchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  radiusMeter: z.number().min(50).max(5000),
  workHourType: z.enum(['FIXED_SHIFT', 'MINIMUM_HOURS']),
  minimumHours: z.number().optional(),
  fixedCheckInTime: z.string().optional(),
  fixedCheckOutTime: z.string().optional(),
});

router.post('/industries', async (req: Request, res: Response) => {
  const data = industrySchema.parse(req.body);

  const industry = await prisma.industry.create({
    data: {
      id: generateId('industry'),
      ...data,
    },
  });

  res.status(201).json({ success: true, data: industry });
});

router.patch('/industries/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const data = industrySchema.partial().parse(req.body);

  const industry = await prisma.industry.update({
    where: { id },
    data,
  });

  res.json({ success: true, data: industry });
});

router.delete('/industries/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await prisma.industry.delete({ where: { id } });
  res.json({ success: true, data: { message: 'Perusahaan berhasil dihapus.' } });
});

// ============================================================
// SCHOOL CRUD
// ============================================================
router.get('/schools', async (_req: Request, res: Response) => {
  const schools = await prisma.school.findMany({
    include: { _count: { select: { students: true, teachers: true } } },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: schools });
});

router.post('/schools', async (req: Request, res: Response) => {
  const { name, address } = req.body;
  const school = await prisma.school.create({
    data: { id: generateId('school'), name, address },
  });
  res.status(201).json({ success: true, data: school });
});

// ============================================================
// PLACEMENT CRUD
// ============================================================
router.get('/placements', async (req: Request, res: Response) => {
  const placements = await prisma.placement.findMany({
    include: {
      student: { include: { user: { select: { name: true } } } },
      industry: { select: { name: true } },
    },
    orderBy: { startDate: 'desc' },
  });
  res.json({ success: true, data: placements });
});

const placementSchema = z.object({
  studentId: z.string(),
  industryId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
});

router.post('/placements', async (req: Request, res: Response) => {
  const data = placementSchema.parse(req.body);

  const placement = await prisma.placement.create({
    data: {
      id: generateId('placement'),
      studentId: data.studentId,
      industryId: data.industryId,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      status: 'ACTIVE',
    },
  });

  // Update student PKL status
  await prisma.student.update({
    where: { id: data.studentId },
    data: { statusPkl: 'ACTIVE' },
  });

  res.status(201).json({ success: true, data: placement });
});

// ============================================================
// ACTIVITY LOG — for admin dashboard
// ============================================================
router.get('/activity-log', async (_req: Request, res: Response) => {
  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { name: true, role: true, createdAt: true, activated: true },
  });

  res.json({ success: true, data: recentUsers });
});

export default router;
