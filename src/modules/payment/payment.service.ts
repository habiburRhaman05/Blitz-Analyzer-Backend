import { v7 as uuidv7 } from "uuid";
import { stripe } from "../../config/stripe";
import { PaymentStatus, UserRole } from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { uploadPdfBufferToCloudinary } from "../media/media.service";
import { generatePaymentInvoiceBuffer } from "./payment.utils";
import { emailQueue } from "../../queue/emailQueue";
import { envConfig } from "../../config/env";
import { getProfileCacheKey } from "../auth/auth.service";
import { redis } from "../../config/redis";


const handleStripePaymentSuccess = async (paymentId: string) => {
  console.log("receive request");
  
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
      include: { user: true, plan: true },

    });
    const wallet = await tx.creditWallet.upsert({
      where: { userId: payment.userId },
      update: { balance: { increment: payment.plan.credits } },
      create: { userId: payment.userId, balance: payment.plan.credits },
    });
    return { payment: updatedPayment, wallet };
  });

  const invoiceResult = await generateAndSendInvoice(result.payment);

  // reset user cache 
    const cacheKey = getProfileCacheKey(payment.user.userId, UserRole.USER);
    await redis.del(cacheKey);
  console.log(invoiceResult);

  return { result, invoiceResult }
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
    folder: "blitz-analyzer/invoices",
    resource_type: "raw",
    public_id: `invoice_${payment.id}`,
  });

  // Save invoice URL
  console.log("in", secure_url);

  await prisma.payment.update({ where: { id: payment.id }, data: { invoiceUrl: secure_url } });
  console.log("invoice url save ");


  await emailQueue.add(
    "payment-success",
    {
      user: {
        name: invoicePayload.userName,
        email: invoicePayload.userEmail,
      },
      transactionId: payment.id,
      amount: invoicePayload.amount,
      credit: payment.plan.credits,
      invoiceUrl: secure_url,
      dashboardUrl: `${envConfig.CLIENT_URL}/dashboard`
    },
    {
      attempts: 3, // retry if failed
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
      jobId: `payment-${payment.id}`, // 🔥 prevents duplicate emails
    }
  );
  console.log("patment success");

  return { secure_url };
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
    where: { id: userId }
  })

  if (!customer) {
    throw new AppError("Invalid or customer", 404);

  }
  console.log("planid", planId);

  // 2️⃣ Create pending payment record
  const payment = await prisma.payment.create({
    data: {
      userId: customer.id,
      planId: plan.id,
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
    success_url: `${successUrl}/${payment.id}`,
    cancel_url: `${cancelUrl}/${payment.id}`,
    metadata: {
      paymentId: payment.id,
      userId,
      planId,
    },
  });

   console.log("session created");

  return {
    checkoutUrl: session.url,
    paymentId: payment.id,
  };
};


const getAllTransactions = async (query: any) => {
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 10
  const skip = (page - 1) * limit

  const [result, total] = await Promise.all([
    prisma.payment.findMany({
      include: { plan: true, user: true },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.payment.count()
  ])

  const data = result.map((payment) => ({
    username: payment.user.name,
    email: payment.user.email,
    paymentId: payment.id,
    paymentTime: payment.createdAt,
    invoice_url: payment.invoiceUrl,
    paymentStatus: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    planName: payment.plan.name
  }))

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit)
    },
    data
  }
}


const getPaymentDetails = async (id) => {
  const payment = await prisma.payment.findUnique({
    where: {
      id: id
    },
    include: { plan: true, user: true }
  })
  return payment
}
const getUserPaymentHistory = async (id) => {
  console.log(id);

  const payments = await prisma.payment.findMany({
    where: {
      userId: id
    },

    include: { plan: true, user: true }
  })

  return payments
}

export const paymentServices = { handleStripePaymentSuccess, generateAndSendInvoice, createCreditPurchaseSession, getAllTransactions, getPaymentDetails, getUserPaymentHistory }



