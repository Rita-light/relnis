import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

// Global : les autres modules reçoivent PrismaService sans l'importer.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
