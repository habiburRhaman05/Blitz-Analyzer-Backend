import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../middleware/auth-middlewares";
import { analyzerControllers } from "./analyzer.controller";

const analyzerRouter: Router = Router();



const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});


analyzerRouter.post(
  "/parse-resume",
  authMiddleware,
  upload.single("resume"),
  analyzerControllers.parseResumeController
);


analyzerRouter.post(
  "/analysis/:id",
  authMiddleware,
  analyzerControllers.completeAnalysesResumeResult
);


analyzerRouter.post(
  "/analysis/save/:id",
  authMiddleware,
  analyzerControllers.saveAnalysisController
);


analyzerRouter.post(
  "/resume/improve",
  authMiddleware,
  analyzerControllers.applyImprovementController
);



analyzerRouter.post(
  "/resume/ats-optimize",
  authMiddleware,
  analyzerControllers.makeAtsFriendlyController
);


analyzerRouter.post(
  "/resume/save",
  authMiddleware,
  analyzerControllers.saveResumeController
);

export default analyzerRouter;