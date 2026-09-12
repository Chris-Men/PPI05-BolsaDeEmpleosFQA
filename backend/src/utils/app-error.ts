/** Expected application failure whose localized message is safe for clients. */
export class AppError extends Error {
  /** Creates an explicitly classified HTTP failure without retaining input data. */
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
