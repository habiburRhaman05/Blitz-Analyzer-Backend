import { Router } from "express";
import { authMiddleware, roleMiddleware } from "../../middleware/auth-middlewares";
import { resumeControllers } from "./resume.controller";
const resumeRouter: Router = Router();

resumeRouter.post(
  "/create-resume",
  authMiddleware,
  roleMiddleware(["USER"]),
  //add validation
  resumeControllers.createResumeController
);

resumeRouter.post(
  "/initlize-resume",
  authMiddleware,
  roleMiddleware(["USER"]),

  //add validation
  resumeControllers.initlizeResume
);
export default resumeRouter;