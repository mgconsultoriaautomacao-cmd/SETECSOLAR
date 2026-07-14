import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DataloggerSupplierService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.dataloggerSupplier.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.dataloggerSupplier.findUnique({
      where: { id },
    });
    if (!supplier) {
      throw new NotFoundException('Fornecedor de datalogger não encontrado.');
    }
    return supplier;
  }

  async create(data: any) {
    return this.prisma.dataloggerSupplier.create({
      data: {
        name: data.name,
        type: data.type,
        token: data.token || null,
        appId: data.appId || null,
        appSecret: data.appSecret || null,
        username: data.username || null,
        password: data.password || null,
      },
    });
  }

  async update(id: string, data: any) {
    // Verifica se existe
    await this.findOne(id);

    return this.prisma.dataloggerSupplier.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        token: data.token !== undefined ? data.token : undefined,
        appId: data.appId !== undefined ? data.appId : undefined,
        appSecret: data.appSecret !== undefined ? data.appSecret : undefined,
        username: data.username !== undefined ? data.username : undefined,
        password: data.password !== undefined ? data.password : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.dataloggerSupplier.delete({
      where: { id },
    });
  }
}
