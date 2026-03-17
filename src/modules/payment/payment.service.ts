import { prisma } from "../../lib/prisma";
import { PaymentStatus } from "../../generated/prisma/enums";
import { AppError } from "../../utils/AppError";
import { generatePaymentInvoiceBuffer } from "./payment.utils";
import { v7 as uuidv7 } from "uuid";
import { uploadPdfBufferToCloudinary } from "../media/media.service";
import { emailQueue } from "../../queue/emailQueue";
import { stripe } from "../../config/stripe";

 const handleStripePaymentSuccess = async (paymentId: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { user: true, plan: true },
  });

  if (!payment) throw new AppError("Payment record not found", 404);

  if (payment.status === PaymentStatus.SUCCESS) {
    return { message: "Payment already processed", payment };
  }

  // Transaction: update payment + credit wallet
  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.SUCCESS, updatedAt: new Date() },
    });

    const wallet = await tx.creditWallet.upsert({
      where: { userId: payment.userId },
      update: { balance: { increment: payment.plan.credits } },
      create: { userId: payment.userId, balance: payment.plan.credits },
    });

    return { payment: updatedPayment, wallet };
  });

  return result;
};

/**
 * Generate invoice, upload to cloud, and send email.
 */
 const generateAndSendInvoice = async (payment: any) => {
  const invoicePayload = {
    status: payment.status,
    invoiceNumber: uuidv7(),
    userName: payment.user?.name || "User",
    userEmail: payment.user?.email || "Not provided",
    paymentTime: new Date().toLocaleString(),
    paymentMethod: "card",
    planName: payment.plan?.name,
    credits: payment.plan?.credits,
    amount: payment.amount,
    message: "✔ Payment Successful! Credits added to your account.",
  };

  const invoiceBuffer = await generatePaymentInvoiceBuffer(invoicePayload);
  console.log("invoice done");
  
  const { secure_url } = await uploadPdfBufferToCloudinary(invoiceBuffer, "Invoice", {
    folder: "resume-saas/invoices",
    resource_type: "raw",
    public_id: `invoice_${payment.id}`,
  });

  // Save invoice URL
  await prisma.payment.update({ where: { id: payment.id }, data: { invoiceUrl: secure_url } });

  // Queue email
  // await emailQueue.add("payment-success", { ...invoicePayload, invoiceUrl: secure_url });

  return {secure_url};
};

 const createCreditPurchaseSession = async (
  userId: string,
  planId: string,
  successUrl: string,
  cancelUrl: string
) => {
  // 1️⃣ Check plan
  const plan = await prisma.pricingPlan.findUnique({
    where: { id: planId },
  });

  if (!plan || !plan.isActive) {
    throw new AppError("Invalid or inactive plan", 404);
  }

  const customer = await prisma.customerProfile.findUnique({
    where:{userId:userId}
  })

  if(!customer){
    throw new AppError("Invalid or customer", 404);
     
  }
console.log("planid",planId);

  // 2️⃣ Create pending payment record
  const payment = await prisma.payment.create({
    data: {
      userId:customer.id,
      planId:plan.id,
      amount: plan.price,
      currency: plan.currency,
      status: PaymentStatus.PENDING,
      paymentMethod: "STRIPE", // demo
    },
  });

  // 3️⃣ Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: plan.currency.toLowerCase(),
          product_data: { name: `${plan.name} - ${plan.credits} credits` },
          unit_amount: plan.price * 100, // Stripe expects cents
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    customer_email: customer.email, // optional: fetch user email if available
    success_url: `${successUrl}?paymentId=${payment.id}`,
    cancel_url: cancelUrl,
    metadata: {
      paymentId: payment.id,
      userId,
      planId,
    },
  });
  

  return {
    checkoutUrl: session.url,
    paymentId: payment.id,
  };
};

export const paymentServices = {handleStripePaymentSuccess,generateAndSendInvoice,createCreditPurchaseSession}



/**
 * Handle Stripe webhook: mark payment COMPLETE and credit user
 */

