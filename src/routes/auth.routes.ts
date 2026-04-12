import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../configs/db.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyToken, authMiddleware, type JwtPayload } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// ============================================================
// POST /api/auth/login
// ============================================================
const loginSchema = z.object({
  username: z.string().min(1, 'Username/NISN/NIP wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      student: true,
      mentor: { include: { industry: true } },
      teacher: { include: { school: true } },
      admin: { include: { school: true } },
    },
  });

  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Username atau password salah.');
  }

  const passwordValid = await comparePassword(password, user.passwordHash);
  if (!passwordValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Username atau password salah.');
  }

  const payload: JwtPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    activated: user.activated,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Build profile based on role
  const profile: Record<string, any> = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    activated: user.activated,
    whatsappNumber: user.whatsappNumber,
  };

  if (user.student) {
    profile.nis = user.student.nis.toString();
    profile.studentId = user.student.id;
    profile.statusPkl = user.student.statusPkl;
    profile.recommendedTitle = user.student.recommendedTitle;
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

  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      requiresPasswordChange: !user.activated,
      user: profile,
    },
  });
});

// ============================================================
// POST /api/auth/change-password
// ============================================================
const changePasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password minimal 6 karakter'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Konfirmasi password tidak cocok',
  path: ['confirmPassword'],
});

router.post('/change-password', authMiddleware, async (req: Request, res: Response) => {
  const { newPassword } = changePasswordSchema.parse(req.body);
  const userId = req.user!.userId;

  const newHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newHash,
      activated: true,
    },
  });

  // Generate new tokens with activated=true
  // NOTE: Must construct payload explicitly — do NOT spread req.user
  // because it contains JWT metadata (iat, exp) that conflicts with jwt.sign
  const payload: JwtPayload = {
    userId: req.user!.userId,
    username: req.user!.username,
    role: req.user!.role,
    activated: true,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      message: 'Password berhasil diubah.',
    },
  });
});

// ============================================================
// POST /api/auth/refresh
// ============================================================
router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError(400, 'MISSING_TOKEN', 'Refresh token required.');
  }

  try {
    const decoded = verifyToken(refreshToken);
    
    // Fetch latest user state
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      throw new AppError(401, 'USER_NOT_FOUND', 'User tidak ditemukan.');
    }

    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      activated: user.activated,
    };

    const newAccessToken = generateAccessToken(payload);

    res.json({
      success: true,
      data: { accessToken: newAccessToken },
    });
  } catch {
    throw new AppError(401, 'TOKEN_INVALID', 'Invalid refresh token.');
  }
});

// ============================================================
// POST /api/auth/logout
// ============================================================
router.post('/logout', (_req: Request, res: Response) => {
  // Client-side token removal (stateless JWT — no server-side invalidation)
  res.json({
    success: true,
    data: { message: 'Logged out successfully.' },
  });
});

export default router;
