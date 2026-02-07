export class HttpError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}
