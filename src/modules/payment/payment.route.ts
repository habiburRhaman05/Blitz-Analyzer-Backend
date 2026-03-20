import { Router } from "express";
import { buyCredits } from "./payment.controller";
import { authMiddleware, roleMiddleware } from "../../middleware/auth-middlewares";
import { validateRequest } from "../../middleware/validateRequest";
import { buyCreditSchema } from "./payment.validation";

const paymentRouter = Router();

// ✅ Buy credits (User)
paymentRouter.post(
  "/buy-credit",
  authMiddleware, 
  roleMiddleware(["USER"]),
  validateRequest(buyCreditSchema),
  buyCredits
);


export default paymentRouter;