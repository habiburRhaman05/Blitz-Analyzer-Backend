import { startServer } from "./app";
import { configureCloudinary } from "./config/cloudinary.config";
import { connectToDatabase, prisma } from "./config/db";
import { BlogStatus, UserRole } from "./generated/prisma/enums";
import { auth } from "./lib/auth";
import "./workers/emailWorker";
import "./workers/analysisWorker";
import  slugify  from "slugify";
(async () => {
 



  await connectToDatabase();




  await configureCloudinary()
  await startServer();

    
})();
