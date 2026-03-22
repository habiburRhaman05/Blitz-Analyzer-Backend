import { Router } from "express";
import { buyCredits, getAllTransactions } from "./payment.controller";
import { authMiddleware, roleMiddleware } from "../../middleware/auth-middlewares";
import { validateRequest } from "../../middleware/validateRequest";
import { buyCreditSchema } from "./payment.validation";
import { UserRole } from "../../generated/prisma/enums";

const paymentRouter = Router();

// ✅ Buy credits (User)
paymentRouter.post(
  "/buy-credit",
  authMiddleware, 
  roleMiddleware(["USER"]),
  validateRequest(buyCreditSchema),
  buyCredits
);
// ✅ Buy credits (User)
paymentRouter.get(
  "/get-all-transactions",
  authMiddleware, 
  roleMiddleware([UserRole.ADMIN]),
  getAllTransactions
);


export default paymentRouter;