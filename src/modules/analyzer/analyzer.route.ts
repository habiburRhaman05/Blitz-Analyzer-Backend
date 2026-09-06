import { Router } from "express";
import multer from "multer";
import { authMiddleware, roleMiddleware } from "../../middleware/auth-middlewares";
import { analyzerControllers } from "./analyzer.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { completeAnalysisSchema, parseResumeSchema } from "./analyzer.validation";
import { aiLimiter } from "../../middleware";

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
  aiLimiter,
  upload.single("resume"),
  validateRequest(parseResumeSchema),
  analyzerControllers.parseResumeController
);
analyzerRouter.post(
  "/job-matcher",
  authMiddleware,
    roleMiddleware(["USER"]),
  aiLimiter,
  upload.single("resume"),
  analyzerControllers.jobMatcherController
);


analyzerRouter.post(
  "/analysis/:id",
  authMiddleware,
    roleMiddleware(["USER"]),
  aiLimiter,
 validateRequest(completeAnalysisSchema),
  analyzerControllers.completeAnalysesResumeResult
);


// polling for any analysisQueue job, not rate-limited like the AI routes
// since it's a cheap Redis/queue lookup, not a Groq call
analyzerRouter.get(
  "/job-status/:id",
  authMiddleware,
    roleMiddleware(["USER"]),
  analyzerControllers.getJobStatus
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
  aiLimiter,
  analyzerControllers.applyImprovementController
);



analyzerRouter.post(
  "/resume/ats-optimize",
  authMiddleware,
    roleMiddleware(["USER"]),
  aiLimiter,
  analyzerControllers.makeAtsFriendlyController
);


// analyzerRouter.post(
//   "/resume/save",
//   authMiddleware,
//     roleMiddleware(["USER"]),
//   analyzerControllers.saveResumeController
// );
analyzerRouter.get(
  "/get-analysis-history",
  authMiddleware,
    roleMiddleware(["USER"]),
  analyzerControllers.getAllAnalysisHistory
);
analyzerRouter.delete(
  "/analysis/delete/:id",
  authMiddleware,
    roleMiddleware(["USER"]),
  analyzerControllers.deleteAnalysis
);
analyzerRouter.post(
  "/analysis/generate-report/:id",
  authMiddleware,
    roleMiddleware(["USER"]),
  analyzerControllers.generateAnalysisReport
);

export default analyzerRouter;