import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { createApp } from "./app";

dotenv.config();

const prisma = new PrismaClient();
const app = createApp(prisma);
const PORT = parseInt(process.env.PORT || "3000", 10);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
