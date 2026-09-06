import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import helmet from "helmet";
import hpp from "hpp";
import { rateLimit } from "express-rate-limit";
import { corsConfig } from "../config/cors";
import { httpLogger } from "../utils/logger";

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/health",
});

// Stricter limiter for AI-consuming routes, keyed by authenticated user
// instead of IP so one user can't exhaust the Groq quota for everyone.
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request, res: Response) => res.locals?.auth?.userId ?? req.ip,
});

export const applyMiddleware = (app: Express): void => {
  app.use(cors(corsConfig));

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    })
  );
  app.use(hpp());
  app.use(apiLimiter);
  app.use(httpLogger);
  app.use(compression());
  app.use(cookieParser());

  app.use(express.json({
  verify: (req:any, res, buf) => {
   if (req.originalUrl.includes('/stripe/webhook')) {
      req.rawBody = buf;
    }
  }
}));
};
