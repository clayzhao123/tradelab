export type ErrorCategory = "validation" | "risk" | "conflict" | "not_found" | "internal";

export type AppErrorOptions = {
  statusCode: number;
  category: ErrorCategory;
  code: string;
  details?: unknown;
  cause?: unknown;
};

export class AppError extends Error {
  readonly statusCode: number;
  readonly category: ErrorCategory;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, options: AppErrorOptions) {
    super(message);
    this.name = "AppError";
    this.statusCode = options.statusCode;
    this.category = options.category;
    this.code = options.code;
    this.details = options.details;
    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export const notFoundError = (code: string, message: string, details?: unknown): AppError =>
  new AppError(message, { statusCode: 404, category: "not_found", code, details });

export const conflictError = (code: string, message: string, details?: unknown): AppError =>
  new AppError(message, { statusCode: 409, category: "conflict", code, details });

export const riskError = (code: string, message: string, details?: unknown): AppError =>
  new AppError(message, { statusCode: 409, category: "risk", code, details });
