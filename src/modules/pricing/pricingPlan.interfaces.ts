export interface ICreatePricingPlan {
  name: string;
  slug: string;
  price: number;
  currency?: string;
  credits: number;
}

export interface IUpdatePricingPlan {
  name?: string;
  price?: number;
  currency?: string;
  credits?: number;
  isActive?: boolean;
}

export interface IGetPlanParams {
  slug: string;
}

export interface IPlanIdParam {
  id: string;
}