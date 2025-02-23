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
  console.error('API Error:', error);
  
  if (error instanceof Error) {
    return {
      statusCode: 400,
      body: { error: error.message }
    };
  }
  
  return {
    statusCode: 500,
    body: { error: 'Internal server error' }
  };
} 