import type { FastifyInstance, FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../shared/app-error.js";
import { getRequestContext } from "./request-context.js";

export const registerErrorHandler = (app: FastifyInstance): void => {
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    const context = getRequestContext(request);

    if (error.validation) {
      request.log.warn(
        {
          event: "http.validation_failed",
          ...context,
          method: request.method,
          url: request.url,
          validation: error.validation,
        },
        "request validation failed",
      );
      reply.status(400).send({
        error: "Bad Request",
        message: "Request validation failed",
        code: "validation.request_invalid",
        category: "validation",
        requestId: request.id,
        details: error.validation,
      });
      return;
    }

    const appError = error instanceof AppError ? error : null;
    const statusCode = appError?.statusCode ?? (error.statusCode && error.statusCode >= 400 ? error.statusCode : 500);
    const category =
      appError?.category ??
      (statusCode >= 500 ? "internal" : statusCode === 404 ? "not_found" : statusCode === 409 ? "conflict" : "validation");
    const code =
      appError?.code ??
      (statusCode >= 500 ? "internal.unhandled_error" : statusCode === 404 ? "not_found.resource_missing" : "conflict.request_error");
    const details = appError?.details;

    const logPayload = {
      event: "http.unhandled_error",
      ...context,
      method: request.method,
      url: request.url,
      statusCode,
      category,
      code,
      errorName: error.name,
      errorMessage: error.message,
      errorCode: error.code,
      details,
    };
    if (statusCode >= 500) {
      request.log.error(logPayload, "unhandled request error");
    } else {
      request.log.warn(logPayload, "request error");
    }
    reply.status(statusCode).send({
      error: statusCode >= 500 ? "Internal Server Error" : "Request Error",
      message: error.message,
      code,
      category,
      requestId: request.id,
      ...(details ? { details } : {}),
    });
  });
};
