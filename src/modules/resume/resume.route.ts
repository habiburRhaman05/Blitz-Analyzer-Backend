import { Router } from "express";
import { authMiddleware } from "../../middleware/auth-middlewares";
import { resumeControllers } from "./resume.controller";
const resumeRouter: Router = Router();

resumeRouter.post(
  "/create-resume",
  authMiddleware,
  //add validation
  resumeControllers.createResumeController
);

resumeRouter.post(
  "/initlize-resume",
  authMiddleware,
  //add validation
  resumeControllers.initlizeResume
);
export default resumeRouter;