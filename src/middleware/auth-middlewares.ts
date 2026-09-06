import { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { prisma } from "../lib/prisma";
import { auth } from "../lib/auth";
import { sendError } from "../utils/apiResponse";
import { UserRole } from "../generated/prisma/client";

// Single source of truth for auth: better-auth's own session check.
// Calling it (instead of a raw Session table lookup) is what makes
// better-auth's rolling renewal and cookie cache actually work, so any
// renewed cookie it returns must be relayed back to the client.
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { headers, response } = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
      returnHeaders: true,
    });

    const renewedCookies = headers.getSetCookie?.() ?? [];
    if (renewedCookies.length > 0) {
      res.setHeader("Set-Cookie", renewedCookies);
    }

    if (!response?.user) {
      return sendError(res, {
        message: "Unauthorized: No session token provided",
        statusCode: 401
      });
    }

    const sessionUser = response.user as any;

    if (
      sessionUser.status === "BANNED" ||
      sessionUser.status === "DELETED" ||
      sessionUser.isDeleted
    ) {
      return sendError(res, {
        message: `Unauthorized: Account is ${String(sessionUser.status).toLowerCase()}`,
        statusCode: 403
      });
    }

    const role = sessionUser.role as UserRole;

    const profile = role === UserRole.USER
      ? await prisma.customerProfile.findUnique({ where: { userId: sessionUser.id } })
      : role === UserRole.MANAGER
        ? await prisma.manager.findUnique({ where: { userId: sessionUser.id } }) as any
        : await prisma.admin.findUnique({ where: { userId: sessionUser.id } }) as any;

    if (!profile) {
      return sendError(res, {
        message: "Unauthorized: Profile not found",
        statusCode: 401
      });
    }

    res.locals.auth = {
      userId: sessionUser.id,
      role,
      email: sessionUser.email,
    };
    res.locals.user = profile;

    return next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error during authentication"
    });
  }
}

export function roleMiddleware(allowedRoles: ("ADMIN" | "USER" | "MANAGER")[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = res.locals.auth;

    if (!auth || !allowedRoles.includes(auth.role)) {
      return sendError(res,{
          errors: true,
        message: "Forbidden: You do not have permission to perform this action",
      statusCode:403
      })
    }

    next();
  };
}
