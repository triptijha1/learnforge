export class NoCreditsError extends Error {
  constructor() {
    super("No course-generation credits remaining");
    this.name = "NoCreditsError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}
