import status from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

const getAllPlans = async () => {
  return await prisma.pricingPlan.findMany({
    where: { isActive: true },
    orderBy: { price: "asc" },
  });
};

const getPlanBySlug = async (id: string) => {
  const plan = await prisma.pricingPlan.findUnique({
    where: { id },
  });

  if (!plan || !plan.isActive) {
    throw new AppError("Plan not found or inactive",status.NOT_FOUND);
  }

  return plan;
};

const createPlan = async (payload: {
  name: string;
  slug: string;
  price: number;
  currency?: string;
  credits: number;
}) => {
  const existing = await prisma.pricingPlan.findUnique({
    where: { slug: payload.slug },
  });

  if (existing) {
    throw new AppError("Plan slug already exists",status.BAD_REQUEST);
  }

  return await prisma.pricingPlan.create({
    data: {
      name: payload.name,
      slug: payload.slug,
      price: payload.price,
      currency: payload.currency || "USD",
      credits: payload.credits,
    },
  });
};

const updatePlan = async (
  id: string,
  payload: Partial<{
    name: string;
    price: number;
    currency: string;
    credits: number;
    isActive: boolean;
  }>
) => {
  const plan = await prisma.pricingPlan.findUnique({
    where: { id },
  });

  if (!plan) {
    throw new AppError("Plan not found",status.NOT_FOUND);
  }

  return await prisma.pricingPlan.update({
    where: { id },
    data: payload,
  });
};

const deactivatePlan = async (id: string) => {
  return await prisma.pricingPlan.update({
    where: { id },
    data: { isActive: false },
  });
};

const getPlanForPurchase = async (planId: string) => {
  const plan = await prisma.pricingPlan.findUnique({
    where: { id: planId },
  });

  if (!plan || !plan.isActive) {
    throw new AppError("Invalid plan",status.BAD_REQUEST);
  }

  return plan;
};

export const pricingPlanServices = {
  getAllPlans,
  getPlanBySlug,
  createPlan,
  updatePlan,
  deactivatePlan,
  getPlanForPurchase,
};