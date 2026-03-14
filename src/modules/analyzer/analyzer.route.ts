
import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../middleware/auth-middlewares";
import { analyzerControllers } from "./analyzer.controller";

const analyzerRouter: Router = Router();
const upload = multer({ storage: multer.memoryStorage() });
analyzerRouter.post(
  "/analysis/:id",
//   add validation input, 
 authMiddleware,
 analyzerControllers.completeAnalysesResumeResult
);
analyzerRouter.post(
  "/parse-resume",
  upload.single("resume"),
//   add validation input, 
//  authMiddleware,
 analyzerControllers.parseResumeController
);


export default analyzerRouter;
