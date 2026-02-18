import { Module } from '@nestjs/common';
import { WhaleDiscoveryService } from './whale-discovery.service';

@Module({
  providers: [WhaleDiscoveryService],
  exports: [WhaleDiscoveryService]
})
export class WhaleDiscoveryModule {}
