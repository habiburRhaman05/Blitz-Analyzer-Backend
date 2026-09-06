import { CookieOptions, Response } from "express";

const setCookie = (res: Response, key: string, value: string, options: CookieOptions) => {
    res.cookie(key, value, options);
}

export const CookieUtils = {
    setCookie,
}