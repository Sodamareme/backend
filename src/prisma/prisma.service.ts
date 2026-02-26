import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    // ✅ Retry au démarrage — Neon peut mettre quelques secondes à se réveiller
    let retries = 5;
    while (retries > 0) {
      try {
        await this.$connect();
        this.logger.log('✅ Database connected');
        return;
      } catch (error: any) {
        retries--;
        this.logger.warn(`⚠️ DB not ready, retrying in 3s... (${retries} attempts left)`);
        if (retries === 0) {
          // ✅ Ne pas crasher l'app — continuer sans connexion initiale
          this.logger.error('❌ Could not connect at startup, will retry on first request');
          return;
        }
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }

  // ✅ Retry automatique pour toutes les requêtes
  async executeWithRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    for (let i = 1; i <= retries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        const isNetworkError =
          error?.message?.includes("Can't reach database") ||
          error?.message?.includes('connect ECONNREFUSED') ||
          error?.code === 'P1001' ||
          error?.code === 'P1002';

        if (isNetworkError && i < retries) {
          this.logger.warn(`⚠️ Neon unreachable, retry ${i}/${retries} in ${i * 2}s...`);
          await new Promise(r => setTimeout(r, i * 2000));
          try {
            await this.$disconnect();
            await this.$connect();
          } catch {}
          continue;
        }
        throw error;
      }
    }
    throw new Error('DB unreachable after retries');
  }
}