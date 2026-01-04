export interface AppError extends Error {
  body?: {
    message: string;
    code?: string;
  };
}

export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as AppError).message === "string"
  );
}
