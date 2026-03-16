import { Router } from "express";
import multer from "multer";
import { authMiddleware, roleMiddleware } from "../../middleware/auth-middlewares";
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
    roleMiddleware(["USER"]),
  
  upload.single("resume"),
  analyzerControllers.parseResumeController
);


analyzerRouter.post(
  "/analysis/:id",
  authMiddleware,
    roleMiddleware(["USER"]),

  analyzerControllers.completeAnalysesResumeResult
);


analyzerRouter.post(
  "/analysis/save/:id",
  authMiddleware,
    roleMiddleware(["USER"]),

  analyzerControllers.saveAnalysisController
);


analyzerRouter.post(
  "/resume/improve",
  authMiddleware,
    roleMiddleware(["USER"]),

  analyzerControllers.applyImprovementController
);



analyzerRouter.post(
  "/resume/ats-optimize",
  authMiddleware,
    roleMiddleware(["USER"]),

  analyzerControllers.makeAtsFriendlyController
);


analyzerRouter.post(
  "/resume/save",
  authMiddleware,
    roleMiddleware(["USER"]),

  analyzerControllers.saveResumeController
);

export default analyzerRouter;