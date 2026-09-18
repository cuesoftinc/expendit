import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { ReceiptsModule } from './receipts/receipts.module';

@Module({
  imports: [ReceiptsModule],
  controllers: [HealthController],
})
export class AppModule {}
