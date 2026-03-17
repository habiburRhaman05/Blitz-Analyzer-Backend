import { Router } from "express";
import { pricingPlanControllers } from "./pricingPlan.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { pricingPlanValidationsSchema } from "./pricingPlan.validation";
import {
  authMiddleware,
  roleMiddleware,
} from "../../middleware/auth-middlewares";

const pricingPlanRouter = Router();

// ✅ Public routes
pricingPlanRouter.get("/", pricingPlanControllers.getPlans);

pricingPlanRouter.get(
  "/:slug",
  validateRequest(pricingPlanValidationsSchema.getPlanSchema),
  pricingPlanControllers.getPlan
);

// ✅ Admin routes
pricingPlanRouter.post(
  "/",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  validateRequest(pricingPlanValidationsSchema.createPricingPlanSchema),
  pricingPlanControllers.createPlan
);

pricingPlanRouter.patch(
  "/:id",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  validateRequest(pricingPlanValidationsSchema.updatePricingPlanSchema),
  pricingPlanControllers.updatePlan
);

pricingPlanRouter.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  validateRequest(pricingPlanValidationsSchema.planIdSchema),
  pricingPlanControllers.deactivatePlan
);

export default pricingPlanRouter;