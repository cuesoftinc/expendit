import { Module } from '@nestjs/common';
import { KafkaModule } from '../kafka/kafka.module';
import { StorageModule } from '../storage/storage.module';
import { TicketService } from '../ticket/ticket.service';
import { TicketUploadInterceptor } from './ticket-upload.interceptor';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [KafkaModule, StorageModule],
  controllers: [UploadController],
  providers: [UploadService, TicketService, TicketUploadInterceptor],
})
export class UploadModule {}
