import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GooglePlacesClient } from './clients/google-places.client.js';

@Module({
  imports: [HttpModule],
  providers: [GooglePlacesClient],
  exports: [GooglePlacesClient],
})
export class GoogleModule {}
