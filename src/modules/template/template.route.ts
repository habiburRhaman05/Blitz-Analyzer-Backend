import { Router } from "express";
import { authMiddleware, roleMiddleware } from "../../middleware/auth-middlewares";
import { templateControllers } from "./template.controller";
const templateRouter: Router = Router();

templateRouter.post(
  "/create",
  authMiddleware,
    roleMiddleware(["USER"]),
  
  //add validation
  templateControllers.createTemplateController
);
templateRouter.get(
  "/",
  authMiddleware,
    roleMiddleware(["USER"]),

  //add validation
  templateControllers.getAllTemplates
);
templateRouter.get(
  "/templateDetails/:id",
  authMiddleware,
    roleMiddleware(["USER"]),

  //add validation
  templateControllers.getTemplateDetails
);
export default templateRouter;