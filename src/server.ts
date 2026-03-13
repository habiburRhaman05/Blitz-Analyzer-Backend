import { startServer } from "./app";
import { connectToDatabase } from "./config/db";
import "./workers/emailWorker";

(async () => {
 
  await connectToDatabase();
  await startServer();
})();
