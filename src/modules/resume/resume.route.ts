import { Router } from "express";
import { authMiddleware, roleMiddleware } from "../../middleware/auth-middlewares";
import { resumeControllers } from "./resume.controller";
const resumeRouter: Router = Router();

resumeRouter.post(
  "/update-resume",
  authMiddleware,
  roleMiddleware(["USER"]),
  //add validation
  resumeControllers.updateResume
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
export default resumeRouter;