import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { handlePrismaError } from '../utils/handlePrismaError';

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction): void => {
  // Default error values
  let statusCode = 500;
  let stack = "unTracked error";
  let message = "Internal Server Error";
  const errorMessages = err.message;

  console.error("❌ Error Logs:", err);

  // Handle custom application errors (e.g., 404, 401)
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } 
  
  // Handle Prisma specific database errors
  else if (err.constructor.name.startsWith('Prisma')) {
    const prismaError = handlePrismaError(err);
    statusCode = prismaError.statusCode;
    message = prismaError.message;
    stack = prismaError.stack
  }

  // Send final response
  res.status(statusCode).json({
    success: false,
    message:errorMessages || message,
    errorDetails: {
      originalMessage: process.env.NODE_ENV === "development" ? errorMessages : undefined,
    },
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};