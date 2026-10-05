import { Global, Module } from '@nestjs/common';
import { ContractService } from './contract.service';

@Global()
@Module({
  providers: [ContractService],
  exports: [ContractService],
})
export class ContractModule {}
