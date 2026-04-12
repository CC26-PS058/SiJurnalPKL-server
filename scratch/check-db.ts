import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.student.findFirst({
    where: { user: { username: '102301878' } }
  });
  
  if (!student) {
    console.log("Student not found");
    return;
  }
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const logs = await prisma.attendanceLog.findMany({
    where: { studentId: student.id, workDate: { gte: today } }
  });
  
  console.log("Attendance logs for today and beyond:", JSON.stringify(logs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
