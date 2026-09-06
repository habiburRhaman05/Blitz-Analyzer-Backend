import { Response } from "express";
import { CookieUtils } from "./cookie";

const isProduction = process.env.NODE_ENV === "production";

const setBetterAuthSessionCookie = (res: Response, token: string) => {
    CookieUtils.setCookie(res, "better-auth.session_token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        path: '/',
        maxAge: 60 * 60 * 1000, // 60 minutes in milliseconds
    });
}

export const tokenUtils = {
    setBetterAuthSessionCookie,
}
