import { Router } from "express";
import { walletControllers } from "./wallet.controller";
import { authMiddleware, roleMiddleware } from "../../middleware/auth-middlewares";

const router = Router();

// ✅ Get wallet balance
router.get(
  "/my-blance",
  authMiddleware,
  roleMiddleware(["USER"]),
  walletControllers.getMyWallet
);

// ✅ Get wallet transactions
router.get(
  "/transactions",
  authMiddleware,
  roleMiddleware(["USER"]),
  walletControllers.getWalletTransactions
);

export default router;