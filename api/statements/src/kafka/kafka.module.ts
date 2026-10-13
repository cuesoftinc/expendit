import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { KafkaProducerService } from './kafka-producer.service';
import { WakeService } from './wake.service';

@Module({
  imports: [StorageModule],
  providers: [KafkaProducerService, WakeService],
  exports: [KafkaProducerService, WakeService],
})
export class KafkaModule {}
