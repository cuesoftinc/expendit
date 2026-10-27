import { Module } from '@nestjs/common';
import { KafkaModule } from '../kafka/kafka.module';
import { StorageModule } from '../storage/storage.module';
import { HealthController } from './health.controller';

@Module({
  imports: [KafkaModule, StorageModule],
  controllers: [HealthController],
})
export class HealthModule {}
