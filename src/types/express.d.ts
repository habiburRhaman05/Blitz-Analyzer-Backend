
import { User, Session } from "better-auth";
import { UserRole } from "../generated/prisma/enums";

declare global {
  namespace Express {
    interface Locals {
    user:User
      auth: {
        userId: string;
        email: string;
        role: UserRole
      }
    }
  }
}