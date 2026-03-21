import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { walletServices } from "./wallet.service";

// ✅ Get wallet balance
const getMyWallet = asyncHandler(async (req: Request, res: Response) => {
  const userId = res.locals.user.id; // custome rprofle id

  const wallet = await walletServices.getMyWallet(userId);

  return sendSuccess(res, {
    message: "Wallet fetched successfully",
    data: wallet,
  });
});

// ✅ Get wallet with transactions
const getWalletTransactions = asyncHandler(async (req: Request, res: Response) => {
  const userId = res.locals.user.id; // custome rprofle id


  const wallet = await walletServices.getWalletWithTransactions(userId);

  return sendSuccess(res, {
    message: "Wallet transactions fetched",
    data: wallet,
  });
});


// ✅ Get wallet with transactions
const claimFreeCredit = asyncHandler(async (req: Request, res: Response) => {
  const userId = res.locals.user.id; // customer profle id


  const result = await walletServices.claimFreeCredit(userId);

  return sendSuccess(res, {
    message: "Your Free Credit Claim Successfully - Check Wallet",
    data: result,
  });
});

export const walletControllers = {
  getMyWallet,
  getWalletTransactions,
  claimFreeCredit
};