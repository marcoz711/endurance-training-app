export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: { error: error.message, code: error.code }
    };
  }

  console.error('Unhandled error:', error);
  return {
    statusCode: 500,
    body: { 
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    }
  };
} 