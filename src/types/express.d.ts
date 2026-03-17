
import { User, Session } from "better-auth";
import { UserRole } from "../generated/prisma/enums";
import { CustomerProfile } from "../generated/prisma/client";

declare global {
  namespace Express {
    interface Locals {
    user:CustomerProfile,
      auth: {
        userId: string;
        email: string;
        role: UserRole
      
      }
    }
  }
}