import Stripe from "stripe";
import { envConfig } from "../../config/env";
import { stripe } from "../../config/stripe";
import { sendError, sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import status from "http-status";
import { AppError } from "../../utils/AppError";
import { paymentServices } from "../payment/payment.service"
import { prisma } from "../../lib/prisma";

export const handleStripeWebhookController = asyncHandler(async (req, res) => {
  console.log("receive webhook");

  const endpointSecret = envConfig.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    const signature = req.headers["stripe-signature"];
    if (!signature || !endpointSecret) {
      throw new AppError("Missing Stripe signature or webhook secret", status.BAD_REQUEST);
    }

    event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret);


  } catch (err: any) {
    console.log("error", err);

    throw new AppError("stripe failed to data parse", status.BAD_REQUEST);

  }

  const session = (event.data.object as any) || {};

  const userId = session.metadata?.userId;
  const paymentId = session.metadata?.paymentId;

  if (!userId || !paymentId) {
    return sendError(res, { statusCode: 400, message: "Missing userId or paymentId in session metadata" });
  }

  switch (event.type) {

    case "checkout.session.completed": {
      console.log("receive payment_intent complete");
      if (session.payment_status !== "paid") break;
      console.log("payment processing start");
      await paymentServices.handleStripePaymentSuccess(paymentId);
      console.log("payemnt processinng done");
      break;
    }
    case "payment_intent.payment_failed": {
      console.warn(`Payment ${paymentId} failed or expired`);

      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "FAILED" },
      });
      console.warn(`Payment ${paymentId} failed or expired`);
      break;
    }

    default:
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }

  return sendSuccess(res, { message: `Stripe webhook event ${event.id} processed successfully.` });
});