import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ClientService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: any, search?: string) {
    const where: Prisma.ClientWhereInput = {};
    
    if (user.role === 'CLIENTE') {
      where.email = { equals: user.email };
    } else if (search) {
      where.OR = [
        { name: { contains: search } },
        { document: { contains: search } },
        { email: { contains: search } },
      ];
    }
    
    return this.prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: any, id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: { usinas: true },
    });

    if (!client) return null;

    if (user.role === 'CLIENTE' && client.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException('Você não tem permissão para acessar os dados deste cliente.');
    }

    return client;
  }

  async create(data: any) {
    return this.prisma.client.create({
      data: {
        name: data.name,
        document: data.document,
        phone: data.phone,
        whatsapp: data.whatsapp || data.phone,
        email: data.email,
        zipCode: data.zipCode || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        installationDate: data.installationDate ? new Date(data.installationDate) : new Date(),
        status: data.status || 'ACTIVE',
        gpsLatitude: data.gpsLatitude !== undefined && data.gpsLatitude !== null ? Number(data.gpsLatitude) : null,
        gpsLongitude: data.gpsLongitude !== undefined && data.gpsLongitude !== null ? Number(data.gpsLongitude) : null,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.client.update({
      where: { id },
      data: {
        name: data.name,
        document: data.document,
        phone: data.phone,
        whatsapp: data.whatsapp,
        email: data.email,
        zipCode: data.zipCode,
        address: data.address,
        city: data.city,
        state: data.state,
        installationDate: data.installationDate ? new Date(data.installationDate) : undefined,
        status: data.status,
        gpsLatitude: data.gpsLatitude !== undefined && data.gpsLatitude !== null ? Number(data.gpsLatitude) : undefined,
        gpsLongitude: data.gpsLongitude !== undefined && data.gpsLongitude !== null ? Number(data.gpsLongitude) : undefined,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.client.delete({
      where: { id },
    });
  }
}
