import { Router } from "express";
import { authMiddleware, roleMiddleware } from "../../middleware/auth-middlewares";
import { resumeControllers } from "./resume.controller";
const resumeRouter: Router = Router();

resumeRouter.post(
  "/:resumeId/update-resume",
  authMiddleware,
  roleMiddleware(["USER"]),
  //add validation
  resumeControllers.updateResume
);
resumeRouter.delete(
  "/:resumeId/delete-resume",
  authMiddleware,
  roleMiddleware(["USER"]),
  //add validation
  resumeControllers.deleteResume
);

resumeRouter.post(
  "/initlize-resume",
  authMiddleware,
  roleMiddleware(["USER"]),

  //add validation
  resumeControllers.initlizeResume
);
resumeRouter.post(
  "/:id/generate-download",
  authMiddleware,
  roleMiddleware(["USER"]),

  //add validation
  resumeControllers.generateResumeForDownload
);
resumeRouter.get(
  "/",
  authMiddleware,
  roleMiddleware(["USER"]),
  //add validation
  resumeControllers.getAllResumeById
);
export default resumeRouter;