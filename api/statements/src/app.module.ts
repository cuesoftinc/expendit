import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { ContractModule } from './contract/contract.module';
import { HealthModule } from './health/health.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [ConfigModule, ContractModule, HealthModule, UploadModule],
})
export class AppModule {}
