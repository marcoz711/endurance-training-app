import rateLimit from 'express-rate-limit';
import { NextApiRequest, NextApiResponse } from 'next';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  keyGenerator: (request: NextApiRequest) => {
    return request.headers['x-forwarded-for']?.toString() || 
           request.socket?.remoteAddress || 
           'unknown-ip';
  },
  skip: (request: NextApiRequest) => {
    return !request.headers['x-forwarded-for'] && !request.socket?.remoteAddress;
  }
});

export function withRateLimit(handler: Function) {
  return async function(req: NextApiRequest, res: NextApiResponse) {
    return new Promise((resolve, reject) => {
      apiLimiter(req, res, (result: any) => {
        if (result instanceof Error) {
          return reject(result);
        }
        return resolve(handler(req, res));
      });
    });
  };
} 