import { Request, Response } from "express";
import { pricingPlanServices } from "./pricingPlan.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import httpStatus from "http-status";

// ✅ GET ALL PLANS
 const getPlans = asyncHandler(async (_req: Request, res: Response) => {
  const plans = await pricingPlanServices.getAllPlans();

  return sendSuccess(res, {
    message: "Pricing plans fetched successfully",
    data: plans,
  });
});

// ✅ GET PLAN BY SLUG
 const getPlan = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  const plan = await pricingPlanServices.getPlanBySlug(slug);

  return sendSuccess(res, {
    message: "Pricing plan fetched successfully",
    data: plan,
  });
});

// ✅ CREATE PLAN (ADMIN)
 const createPlan = asyncHandler(async (req: Request, res: Response) => {
  const plan = await pricingPlanServices.createPlan(req.body);

  return sendSuccess(res, {
    message: "Pricing plan created successfully",
    data: plan,
    statusCode: httpStatus.CREATED,
  });
});

// ✅ UPDATE PLAN
 const updatePlan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const updatedPlan = await pricingPlanServices.updatePlan(id as string, req.body);

  return sendSuccess(res, {
    message: "Pricing plan updated successfully",
    data: updatedPlan,
  });
});

// ✅ DEACTIVATE PLAN
 const deactivatePlan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await pricingPlanServices.deactivatePlan(id);

  return sendSuccess(res, {
    message: "Pricing plan deactivated successfully",
  });
});

// ✅ GET PLAN FOR PURCHASE (SECURE)
 const getPlanForPurchase = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const plan = await pricingPlanServices.getPlanForPurchase(id);

  return sendSuccess(res, {
    message: "Plan ready for purchase",
    data: plan,
  });
});

export const pricingPlanControllers = {
    getPlan,getPlans,getPlanForPurchase,deactivatePlan,updatePlan,createPlan
}