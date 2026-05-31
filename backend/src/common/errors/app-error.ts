export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: number;

  constructor(message: string, statusCode = 400, code = statusCode) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}
