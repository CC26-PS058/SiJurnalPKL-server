import "dotenv/config";
import { PrismaClient } from "../../generated/prisma/index.js";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

export { prisma };
export default prisma;
