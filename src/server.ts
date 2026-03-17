import { startServer } from "./app";
import { connectToDatabase, prisma } from "./config/db";
import { UserRole } from "./generated/prisma/enums";
import { auth } from "./lib/auth";
import "./workers/emailWorker";

(async () => {
 
  await connectToDatabase();
  await startServer();

    
})();
