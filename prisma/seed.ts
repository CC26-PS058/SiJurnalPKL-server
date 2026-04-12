import { PrismaClient } from '../generated/prisma/index.js';
import { hashPassword } from '../src/utils/password.js';
import { generateId } from '../src/utils/nanoid.js';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create School
  const schoolName = 'SMKN 1 Cibinong';
  let school = await prisma.school.findFirst({ where: { name: schoolName } });
  if (!school) {
    school = await prisma.school.create({
      data: {
        id: generateId('school'),
        name: schoolName,
        address: 'Jl. Karadenan No.7, Cibinong, Bogor, Jawa Barat 16913',
      },
    });
  }
  console.log(`✅ School: ${school.name} (${school.id})`);

  // 2. Create Industry
  const industryName = 'PT. Clevio';
  let industry = await prisma.industry.findFirst({ where: { name: industryName } });
  if (!industry) {
    industry = await prisma.industry.create({
      data: {
        id: generateId('industry'),
        name: industryName,
        address: 'Jl. Raya Cibinong, Bogor, Jawa Barat',
        latitude: -6.457455,
        longitude: 106.842636,
        radiusMeter: 200,
        workHourType: 'FIXED_SHIFT',
        fixedCheckInTime: '08:00',
        fixedCheckOutTime: '17:00',
      },
    });
  }
  console.log(`✅ Industry: ${industry.name} (${industry.id})`);

  // Helper for user upsert
  async function upsertUser(username: string, name: string, email: string, whatsapp: string, role: 'STUDENT' | 'TEACHER' | 'MENTOR' | 'ADMIN', activated: boolean = true) {
    const passwordHash = await hashPassword(username);
    return await prisma.user.upsert({
      where: { username },
      update: { name, email, whatsappNumber: whatsapp, role, activated },
      create: {
        id: generateId('user'),
        username,
        name,
        email,
        whatsappNumber: whatsapp,
        passwordHash,
        role,
        activated,
      },
    });
  }

  // 3. Create Super Admin
  const adminUser = await upsertUser('superadmin', 'Super Administrator', 'admin@smkn1cibinong.sch.id', '081234567890', 'ADMIN');
  const admin = await prisma.admin.upsert({
    where: { userId: adminUser.id },
    update: { schoolId: school.id },
    create: { id: generateId('admin'), userId: adminUser.id, schoolId: school.id },
  });
  console.log(`✅ Admin: superadmin (activated)`);

  // 4. Create Student
  const studentUsername = '102301878';
  const studentUser = await upsertUser(studentUsername, 'Mohammad Jonah Setiawan', 'jonah@student.smkn1cibinong.sch.id', '081298765432', 'STUDENT', true);
  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: { nis: BigInt(studentUsername), schoolId: school.id, statusPkl: 'ACTIVE' },
    create: { id: generateId('student'), userId: studentUser.id, nis: BigInt(studentUsername), schoolId: school.id, statusPkl: 'ACTIVE' },
  });
  console.log(`✅ Student: 102301878 / Mohammad Jonah Setiawan`);

  // 5. Create Teacher
  const teacherUsername = '198501012010011002';
  const teacherUser = await upsertUser(teacherUsername, 'Budi Raharjo, M.Pd', 'budi@smkn1cibinong.sch.id', '081234567891', 'TEACHER', true);
  const teacher = await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: { schoolId: school.id },
    create: { id: generateId('teacher'), userId: teacherUser.id, schoolId: school.id },
  });
  console.log(`✅ Teacher: 198501012010011002 / Budi Raharjo`);

  // 6. Create Mentor
  const mentorUsername = 'mentor01';
  const mentorUser = await upsertUser(mentorUsername, 'Andi Wijaya', 'andi@clevio.com', '081234567892', 'MENTOR', true);
  const mentor = await prisma.mentor.upsert({
    where: { userId: mentorUser.id },
    update: { industryId: industry.id },
    create: { id: generateId('mentor'), userId: mentorUser.id, industryId: industry.id },
  });
  console.log(`✅ Mentor: mentor01 / Andi Wijaya`);

  // 7. Create Placement (Student → PT. Clevio)
  // Ensure the student has an active placement in PT. Clevio
  const existingPlacement = await prisma.placement.findFirst({
    where: { studentId: student.id, industryId: industry.id }
  });

  if (!existingPlacement) {
    const placementId = generateId('placement');
    await prisma.placement.create({
      data: {
        id: placementId,
        studentId: student.id,
        industryId: industry.id,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2026-04-30'),
        status: 'ACTIVE',
      },
    });
    console.log(`✅ Placement Created: Student → PT. Clevio`);
  } else {
    await prisma.placement.update({
      where: { id: existingPlacement.id },
      data: {
        endDate: new Date('2026-04-30'),
        status: 'ACTIVE',
      },
    });
    console.log(`✅ Placement Exists: Student → PT. Clevio`);
  }
  
  // 8. Create Sample Daily Logs
  const activePlacement = await prisma.placement.findFirst({
    where: { studentId: student.id, status: 'ACTIVE' }
  });

  if (activePlacement) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // CLEANUP: Ensure today's attendance is empty for demo
    // First, delete daily logs associated with today's attendance to avoid FK constraint issues
    await prisma.dailyLog.deleteMany({
      where: {
        attendance: {
          placementId: activePlacement.id,
          workDate: today
        }
      }
    });

    // ─── Reset Today's Attendance for Demo ───────────────
    // Pastikan hari ini (D-0) bersih dari presensi agar bisa didemokan lancar
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    // Hapus DailyLog terkait hari ini dulu (Constraint FK)
    await prisma.dailyLog.deleteMany({
      where: {
        attendance: {
            studentId: student.id,
            workDate: {
              gte: startOfToday,
              lte: endOfToday
            }
        }
      }
    });

    await prisma.attendanceLog.deleteMany({
      where: {
        studentId: student.id,
        workDate: {
            gte: startOfToday,
            lte: endOfToday
        }
      }
    });

    const logs = [
      {
        raw: "Melakukan troubleshooting jaringan dan konfigurasi VLAN.",
        proc: "Berhasil melakukan troubleshooting pada infrastruktur jaringan kantor, termasuk konfigurasi VLAN pada switch Cisco untuk mengoptimalkan segmentasi traffic antar departemen.",
        skills: ['Networking', 'Troubleshooting', 'Cisco Configuration']
      },
      {
        raw: "Optimasi database dan manajemen backup.",
        proc: "Melakukan optimasi query SQL pada database PostgreSQL yang mempercepat waktu respon aplikasi sebesar 30%, serta memastikan sistem backup otomatis berjalan dengan valid.",
        skills: ['Database Optimization', 'PostgreSQL', 'Data Recovery']
      },
      {
        raw: "Pengembangan komponen UI dashboard.",
        proc: "Mengembangkan komponen dashboard interaktif menggunakan Next.js dan Tailwind CSS, memastikan desain responsif dan ramah pengguna di berbagai perangkat.",
        skills: ['Frontend Development', 'React', 'Tailwind CSS']
      },
      {
        raw: "Audit keamanan sistem dan update SSL.",
        proc: "Melakukan audit keamanan rutin pada server produksi, memperbarui sertifikat SSL, dan mengonfigurasi firewall untuk menutup celah port yang tidak digunakan.",
        skills: ['Cyber Security', 'Server Management', 'SSL/TLS']
      },
      {
        raw: "Instalasi dan maintenance workstation karyawan.",
        proc: "Memberikan dukungan IT support teknis kepada 5 karyawan baru, melakukan instalasi sistem operasi Linux, serta konfigurasi perangkat lunak standar perusahaan.",
        skills: ['IT Support', 'Linux', 'Technical Documentation']
      }
    ];

    for (let i = 0; i < logs.length; i++) {
        const workDate = new Date(today);
        workDate.setDate(today.getDate() - (i + 1)); // Start from yesterday (i=1)
        workDate.setHours(0, 0, 0, 0);

        const attendance = await prisma.attendanceLog.upsert({
            where: { placementId_workDate: { placementId: activePlacement.id, workDate } },
            update: {},
            create: {
                id: generateId('attendance'),
                studentId: student.id,
                placementId: activePlacement.id,
                workDate,
                checkInTime: new Date(new Date(workDate).setHours(8, 0, 0)),
                checkOutTime: new Date(new Date(workDate).setHours(17, 0, 0)),
                checkInPhotoUrl: 'https://placehold.co/600x400?text=CheckIn',
                gpsStatus: 'VALID',
                statusAttendance: 'PRESENT',
            }
        });

        await prisma.dailyLog.upsert({
            where: { attendanceId: attendance.id },
            update: {
                processedText: logs[i].proc,
                skillTags: logs[i].skills,
                approvalStatus: 'APPROVED',
                approvedBy: mentor.id,
                approvedAt: new Date(),
            },
            create: {
                id: generateId('dailyLog'),
                attendanceId: attendance.id,
                rawText: logs[i].raw,
                processedText: logs[i].proc,
                skillTags: logs[i].skills,
                aiStatus: 'SUCCESS',
                approvalStatus: 'APPROVED',
                approvedBy: mentor.id,
                approvedAt: new Date(),
            }
        });
    }
    console.log(`✅ Seeded 5 High-Quality Logs (Yesterday & Older) for student 102301878`);
    console.log(`⚠️ Today's attendance record was REMOVED to allow for demo presentation.`);
  }

  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Login credentials:');
  console.log('  Admin:   superadmin / superadmin (already activated)');
  console.log(`  Student: ${studentUsername} / ${studentUsername} (needs password change)`);
  console.log(`  Teacher: ${teacherUsername} / ${teacherUsername} (needs password change)`);
  console.log(`  Mentor:  ${mentorUsername} / ${mentorUsername} (needs password change)`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
