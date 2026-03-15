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
export default resumeRouter;