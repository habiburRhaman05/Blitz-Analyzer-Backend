import { Router } from "express";
import { authMiddleware } from "../../middleware/auth-middlewares";
import { templateControllers } from "./template.controller";
const templateRouter: Router = Router();

templateRouter.post(
  "/create",
  authMiddleware,
  //add validation
  templateControllers.createTemplateController
);
templateRouter.get(
  "/",
  authMiddleware,
  //add validation
  templateControllers.getAllTemplates
);
templateRouter.get(
  "/templateDetails/:id",
  authMiddleware,
  //add validation
  templateControllers.getTemplateDetails
);
export default templateRouter;