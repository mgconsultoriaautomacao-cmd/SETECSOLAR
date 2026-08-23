import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DataloggerSupplierService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.dataloggerSupplier.findMany({
        orderBy: { name: 'asc' },
      });
    } catch (err) {
      return await this.prisma.rest.get('DataloggerSupplier', 'select=*&order=name.asc');
    }
  }

  async findOne(id: string) {
    try {
      const supplier = await this.prisma.dataloggerSupplier.findUnique({
        where: { id },
      });
      if (!supplier) {
        throw new NotFoundException('Fornecedor de datalogger não encontrado.');
      }
      return supplier;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      const res = await this.prisma.rest.get('DataloggerSupplier', `id=eq.${id}`);
      const supplier = res && res.length > 0 ? res[0] : null;
      if (!supplier) {
        throw new NotFoundException('Fornecedor de datalogger não encontrado.');
      }
      return supplier;
    }
  }

  async create(data: any) {
    const payload = {
      name: data.name,
      type: data.type,
      token: data.token || null,
      appId: data.appId || null,
      appSecret: data.appSecret || null,
      username: data.username || null,
      password: data.password || null,
    };

    try {
      return await this.prisma.dataloggerSupplier.create({ data: payload });
    } catch (err) {
      return await this.prisma.rest.post('DataloggerSupplier', payload);
    }
  }

  async update(id: string, data: any) {
    const payload = {
      name: data.name,
      type: data.type,
      token: data.token !== undefined ? data.token : undefined,
      appId: data.appId !== undefined ? data.appId : undefined,
      appSecret: data.appSecret !== undefined ? data.appSecret : undefined,
      username: data.username !== undefined ? data.username : undefined,
      password: data.password !== undefined ? data.password : undefined,
    };

    try {
      await this.findOne(id);
      return await this.prisma.dataloggerSupplier.update({
        where: { id },
        data: payload,
      });
    } catch (err) {
      return await this.prisma.rest.patch('DataloggerSupplier', id, payload);
    }
  }

  async remove(id: string) {
    try {
      await this.findOne(id);
      return await this.prisma.dataloggerSupplier.delete({
        where: { id },
      });
    } catch (err) {
      return await this.prisma.rest.delete('DataloggerSupplier', id);
    }
  }
}
