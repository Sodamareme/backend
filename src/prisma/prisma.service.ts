import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';


@Injectable()
export class PrismaService extends PrismaClient<Prisma.PrismaClientOptions, 'beforeExit'> implements OnModuleInit, OnModuleDestroy {
  [x: string]: any;
  private readonly logger = new Logger(PrismaService.name);
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });

    // Add process event listener instead of Prisma beforeExit
    process.on('beforeExit', () => {
      this.logger.log('Process beforeExit event');
      this.$disconnect();
    });
  }

  async onModuleInit() {
    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        await this.$connect();
        this.logger.log('Successfully connected to database');
        return;
      } catch (error) {
        retries++;
        this.logger.error(
          `Failed to connect to database (attempt ${retries}/${this.maxRetries}):`,
          error
        );
        
        if (retries === this.maxRetries) {
          this.logger.error('Max retries reached. Unable to connect to database.');
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * retries));
      }
    }
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from database...');
    await this.$disconnect();
    this.logger.log('Successfully disconnected from database');
  }

  async healthCheck() {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }
}