import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '🐋 Whal-E Backend API - AI-Powered Whale Tracking & Copy Trading';
  }
}
