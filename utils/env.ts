import { z } from 'zod';

const envSchema = z.object({
  GOOGLE_CLIENT_EMAIL: z.string().email().optional(),
  GOOGLE_PRIVATE_KEY: z.string().optional(),
  GOOGLE_SHEETS_ID: z.string().optional(),
  NEXT_PUBLIC_BASE_URL: z.string().optional(),
  FITNESSSYNCER_CLIENT_ID: z.string().optional(),
  FITNESSSYNCER_CLIENT_SECRET: z.string().optional(),
  FITNESSSYNCER_REDIRECT_URI: z.string().optional(),
});

export function validateEnv() {
  try {
    const parsed = envSchema.safeParse(process.env);
    
    if (!parsed.success) {
      console.error('Environment validation errors:', parsed.error.errors);
      return false;
    }

    // Check if required variables are present in production
    if (process.env.NODE_ENV === 'production') {
      const requiredVars = [
        'GOOGLE_CLIENT_EMAIL',
        'GOOGLE_PRIVATE_KEY',
        'GOOGLE_SHEETS_ID',
      ];

      const missingVars = requiredVars.filter(
        (varName) => !process.env[varName]
      );

      if (missingVars.length > 0) {
        console.error('Missing required environment variables:', missingVars);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error validating environment variables:', error);
    return false;
  }
} 