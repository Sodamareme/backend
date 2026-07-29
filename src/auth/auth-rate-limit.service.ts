import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

@Injectable()
export class AuthRateLimitService {
  private readonly attempts = new Map<string, RateLimitEntry>();

  consume(
    key: string,
    options: { limit: number; windowMs: number; message: string },
  ) {
    const now = Date.now();
    const current = this.attempts.get(key);

    if (!current || current.resetAt <= now) {
      this.attempts.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      this.cleanup(now);
      return;
    }

    if (current.count >= options.limit) {
      throw new HttpException(options.message, HttpStatus.TOO_MANY_REQUESTS);
    }

    current.count += 1;
    this.attempts.set(key, current);
    this.cleanup(now);
  }

  private cleanup(now: number) {
    if (this.attempts.size < 500) {
      return;
    }

    for (const [key, entry] of this.attempts.entries()) {
      if (entry.resetAt <= now) {
        this.attempts.delete(key);
      }
    }
  }
}
