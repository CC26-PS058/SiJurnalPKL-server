const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.student.findFirst({
    where: { user: { username: '102301878' } }
  });
  
  if (!student) {
    console.log("Student not found");
    return;
  }
  
  const allLogs = await prisma.attendanceLog.findMany({
    where: { studentId: student.id },
    orderBy: { workDate: 'desc' },
    take: 10
  });
  
  console.log("LAST 10 LOGS:");
  allLogs.forEach(log => {
    console.log(`ID: ${log.id}, workDate: ${log.workDate.toISOString()}, status: ${log.statusAttendance}, checkIn: ${log.checkInTime ? log.checkInTime.toISOString() : 'null'}`);
  });

  const today = new Date();
  today.setHours(0,0,0,0);
  console.log("\nToday (Server Locale 00:00):", today.toISOString());
}

main().catch(console.error).finally(() => prisma.$disconnect());
