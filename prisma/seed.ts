import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { hashPassword } from '../src/utils/password.js';
import { generateId } from '../src/utils/nanoid.js';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create School
  const schoolId = generateId('school');
  const school = await prisma.school.upsert({
    where: { id: schoolId },
    update: {},
    create: {
      id: schoolId,
      name: 'SMKN 1 Cibinong',
      address: 'Jl. Karadenan No.7, Cibinong, Bogor, Jawa Barat 16913',
    },
  });
  console.log(`✅ School: ${school.name} (${school.id})`);

  // 2. Create Industry
  const industryId = generateId('industry');
  const industry = await prisma.industry.upsert({
    where: { id: industryId },
    update: {},
    create: {
      id: industryId,
      name: 'PT. Clevio',
      address: 'Jl. Raya Cibinong, Bogor, Jawa Barat',
      latitude: -6.457455,
      longitude: 106.842636,
      radiusMeter: 200,
      workHourType: 'FIXED_SHIFT',
      fixedCheckInTime: '08:00',
      fixedCheckOutTime: '17:00',
    },
  });
  console.log(`✅ Industry: ${industry.name} (${industry.id})`);

  // 3. Create Super Admin
  const adminUserId = generateId('user');
  const adminId = generateId('admin');
  const adminPasswordHash = await hashPassword('superadmin'); // Password = username
  await prisma.user.upsert({
    where: { id: adminUserId },
    update: {},
    create: {
      id: adminUserId,
      username: 'superadmin',
      name: 'Super Administrator',
      email: 'admin@smkn1cibinong.sch.id',
      whatsappNumber: '081234567890',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      activated: true, // Super admin already activated
    },
  });
  await prisma.admin.upsert({
    where: { id: adminId },
    update: {},
    create: {
      id: adminId,
      userId: adminUserId,
      schoolId: school.id,
    },
  });
  console.log(`✅ Admin: superadmin (activated, password: superadmin)`);

  // 4. Create Student
  const studentUserId = generateId('user');
  const studentId = generateId('student');
  const studentPassword = await hashPassword('102301878'); // Password = NISN
  await prisma.user.upsert({
    where: { id: studentUserId },
    update: {},
    create: {
      id: studentUserId,
      username: '102301878',
      name: 'Mohammad Jonah Setiawan',
      email: 'jonah@student.smkn1cibinong.sch.id',
      whatsappNumber: '081298765432',
      passwordHash: studentPassword,
      role: 'STUDENT',
      activated: false,
    },
  });
  await prisma.student.upsert({
    where: { id: studentId },
    update: {},
    create: {
      id: studentId,
      userId: studentUserId,
      nis: 102301878n,
      schoolId: school.id,
      statusPkl: 'ACTIVE',
    },
  });
  console.log(`✅ Student: 102301878 / Mohammad Jonah Setiawan (password: 102301878)`);

  // 5. Create Teacher
  const teacherUserId = generateId('user');
  const teacherId = generateId('teacher');
  const teacherPassword = await hashPassword('198501012010011002'); // Password = NIP
  await prisma.user.upsert({
    where: { id: teacherUserId },
    update: {},
    create: {
      id: teacherUserId,
      username: '198501012010011002',
      name: 'Budi Raharjo, M.Pd',
      email: 'budi@smkn1cibinong.sch.id',
      whatsappNumber: '081234567891',
      passwordHash: teacherPassword,
      role: 'TEACHER',
      activated: false,
    },
  });
  await prisma.teacher.upsert({
    where: { id: teacherId },
    update: {},
    create: {
      id: teacherId,
      userId: teacherUserId,
      schoolId: school.id,
    },
  });
  console.log(`✅ Teacher: 198501012010011002 / Budi Raharjo (password: 198501012010011002)`);

  // 6. Create Mentor
  const mentorUserId = generateId('user');
  const mentorId = generateId('mentor');
  const mentorPassword = await hashPassword('mentor01'); // Password = username
  await prisma.user.upsert({
    where: { id: mentorUserId },
    update: {},
    create: {
      id: mentorUserId,
      username: 'mentor01',
      name: 'Andi Wijaya',
      email: 'andi@clevio.com',
      whatsappNumber: '081234567892',
      passwordHash: mentorPassword,
      role: 'MENTOR',
      activated: false,
    },
  });
  await prisma.mentor.upsert({
    where: { id: mentorId },
    update: {},
    create: {
      id: mentorId,
      userId: mentorUserId,
      industryId: industry.id,
    },
  });
  console.log(`✅ Mentor: mentor01 / Andi Wijaya (password: mentor01)`);

  // 7. Create Placement (Student → PT. Clevio)
  const placementId = generateId('placement');
  await prisma.placement.upsert({
    where: { id: placementId },
    update: {},
    create: {
      id: placementId,
      studentId: studentId,
      industryId: industry.id,
      startDate: new Date('2025-10-01'),
      endDate: new Date('2026-03-31'),
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Placement: Student → PT. Clevio (ACTIVE, 2025-10-01 to 2026-03-31)`);

  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Login credentials:');
  console.log('  Admin:   superadmin / superadmin (already activated)');
  console.log('  Student: 102301878 / 102301878 (needs password change)');
  console.log('  Teacher: 198501012010011002 / 198501012010011002 (needs password change)');
  console.log('  Mentor:  mentor01 / mentor01 (needs password change)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
