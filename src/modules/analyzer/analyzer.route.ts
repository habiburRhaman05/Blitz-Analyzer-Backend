import { Router } from "express";
import multer from "multer";
import { authMiddleware, roleMiddleware } from "../../middleware/auth-middlewares";
import { analyzerControllers } from "./analyzer.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { completeAnalysisSchema, parseResumeSchema, saveAnalysisSchema } from "./analyzer.validation";

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
  validateRequest(parseResumeSchema),
  analyzerControllers.parseResumeController
);


analyzerRouter.post(
  "/analysis/:id",
  authMiddleware,
    roleMiddleware(["USER"]),
 validateRequest(completeAnalysisSchema),
  analyzerControllers.completeAnalysesResumeResult
);


analyzerRouter.post(
  "/analysis/save/:id",
  authMiddleware,
    roleMiddleware(["USER"]),
    validateRequest(saveAnalysisSchema),
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

export default analyzerRouter;