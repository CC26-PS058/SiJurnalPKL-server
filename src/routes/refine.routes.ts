import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../configs/db.js';
import { authMiddleware, requireRole, requireActivated } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authMiddleware, requireActivated);

const N8N_REFINE_URL = process.env.N8N_REFINE_WEBHOOK_URL || '';
const N8N_TITLE_URL = process.env.N8N_TITLE_WEBHOOK_URL || '';

// ============================================================
// POST /api/refine — AI refine text + image via n8n
// ============================================================
const refineSchema = z.object({
  activityText: z.string().min(5, 'Teks kegiatan minimal 5 karakter'),
  imageBase64: z.string().optional(),
});

router.post('/', requireRole('STUDENT'), async (req: Request, res: Response) => {
  const { activityText, imageBase64 } = refineSchema.parse(req.body);

  if (!N8N_REFINE_URL) {
    throw new AppError(503, 'AI_SERVICE_UNAVAILABLE', 'AI service not configured.');
  }

  try {
    // Synchronous: send to n8n webhook and wait for response
    const n8nResponse = await fetch(N8N_REFINE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity_text: activityText,
        image_base64: imageBase64 || null,
      }),
    });

    if (!n8nResponse.ok) {
      throw new Error(`n8n responded with ${n8nResponse.status}`);
    }

    const result = await n8nResponse.json();

    res.json({
      success: true,
      data: {
        processedText: result.processed_text || result.processedText || activityText,
        skillTags: result.skill_tags || result.skillTags || [],
      },
    });
  } catch (error) {
    console.error('[AI Refine Error]', error);
    // Fallback: return original text if AI fails
    res.json({
      success: true,
      data: {
        processedText: activityText,
        skillTags: [],
        warning: 'AI service unavailable. Teks asli dikembalikan.',
      },
    });
  }
});

// ============================================================
// POST /api/refine/title — Generate PKL report title
// ============================================================
router.post('/title', requireRole('STUDENT'), async (req: Request, res: Response) => {
  const { userId } = req.user!;

  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      user: true,
      placements: {
        include: {
          industry: true,
          attendanceLogs: {
            include: { dailyLog: true },
            orderBy: { workDate: 'asc' },
          },
        },
      },
    },
  });

  if (!student) {
    throw new AppError(404, 'STUDENT_NOT_FOUND', 'Data siswa tidak ditemukan.');
  }

  // Collect all daily logs across all placements
  const allLogs = student.placements.flatMap((p) =>
    p.attendanceLogs
      .filter((a) => a.dailyLog)
      .map((a) => ({
        date: a.workDate,
        text: a.dailyLog!.processedText || a.dailyLog!.rawText,
        skills: a.dailyLog!.skillTags,
      }))
  );

  if (allLogs.length < 5) {
    throw new AppError(400, 'INSUFFICIENT_LOGS', 'Minimal 5 jurnal harian diperlukan untuk generate judul.');
  }

  const companyName = student.placements[0]?.industry?.name || 'Perusahaan';

  if (!N8N_TITLE_URL) {
    throw new AppError(503, 'AI_SERVICE_UNAVAILABLE', 'AI title service not configured.');
  }

  try {
    const n8nResponse = await fetch(N8N_TITLE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_name: student.user.name,
        company_name: companyName,
        daily_logs: allLogs,
      }),
    });

    if (!n8nResponse.ok) {
      throw new Error(`n8n responded with ${n8nResponse.status}`);
    }

    const result = await n8nResponse.json();

    res.json({
      success: true,
      data: {
        titles: result.titles || [],
      },
    });
  } catch (error) {
    console.error('[AI Title Error]', error);
    throw new AppError(503, 'AI_SERVICE_ERROR', 'Gagal generate judul. Coba lagi nanti.');
  }
});

// ============================================================
// POST /api/refine/save-title — Save selected title
// ============================================================
router.post('/save-title', requireRole('STUDENT'), async (req: Request, res: Response) => {
  const { title } = req.body;
  const { userId } = req.user!;

  if (!title) {
    throw new AppError(400, 'MISSING_TITLE', 'Judul wajib diisi.');
  }

  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) {
    throw new AppError(404, 'STUDENT_NOT_FOUND', 'Data siswa tidak ditemukan.');
  }

  await prisma.student.update({
    where: { id: student.id },
    data: { recommendedTitle: title },
  });

  res.json({
    success: true,
    data: { message: 'Judul laporan berhasil disimpan.', title },
  });
});

export default router;
