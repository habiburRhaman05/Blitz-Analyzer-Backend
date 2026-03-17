import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import { paymentServices } from "./payment.service";
import { BuyCreditInput, StripeWebhookInput } from "./payment.interface";
import { buyCreditSchema, stripeWebhookSchema } from "./payment.validation";

// ✅ User buys credits (creates pending payment + stripe session)
export const buyCredits = asyncHandler(async (req: Request, res: Response) => {
  const { planId, successUrl, cancelUrl } = req.body;

  const userId = res.locals.auth.userId; // assuming auth middleware sets req.user

  const { checkoutUrl, paymentId } = await paymentServices.createCreditPurchaseSession(
    userId,
    planId,
    successUrl,
    cancelUrl
  );

  return sendSuccess(res, {
    message: "Checkout session created",
    data: { checkoutUrl, paymentId },
  });
});

// ✅ Stripe webhook: mark payment complete
export const stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const { paymentId } = stripeWebhookSchema.parse(req.body) as StripeWebhookInput;

  const result = await paymentServices.handleStripePaymentSuccess(paymentId);

  return sendSuccess(res, {
    message: "Payment processed successfully",
    data: result,
  });
});