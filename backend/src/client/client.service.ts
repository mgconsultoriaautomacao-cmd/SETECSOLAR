import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ClientService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: any, search?: string) {
    try {
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

      return await this.prisma.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      let query = 'select=*&order=createdAt.desc';
      if (user.role === 'CLIENTE') {
        query += `&email=eq.${encodeURIComponent(user.email)}`;
      }
      const clients = await this.prisma.rest.get('Client', query);
      if (search) {
        const s = search.toLowerCase();
        return clients.filter((c: any) =>
          (c.name && c.name.toLowerCase().includes(s)) ||
          (c.document && c.document.toLowerCase().includes(s)) ||
          (c.email && c.email.toLowerCase().includes(s))
        );
      }
      return clients;
    }
  }

  async findOne(user: any, id: string) {
    try {
      const client = await this.prisma.client.findUnique({
        where: { id },
        include: { usinas: true },
      });

      if (!client) return null;

      if (user.role === 'CLIENTE' && client.email.toLowerCase() !== user.email.toLowerCase()) {
        throw new ForbiddenException('Você não tem permissão para acessar os dados deste cliente.');
      }

      return client;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      const res = await this.prisma.rest.get('Client', `id=eq.${id}&select=*,usinas:Usina(*)`);
      const client = res && res.length > 0 ? res[0] : null;
      if (!client) return null;
      if (user.role === 'CLIENTE' && client.email.toLowerCase() !== user.email.toLowerCase()) {
        throw new ForbiddenException('Você não tem permissão para acessar os dados deste cliente.');
      }
      return client;
    }
  }

  async create(data: any) {
    const payload = {
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
    };

    try {
      return await this.prisma.client.create({ data: payload });
    } catch (err) {
      return await this.prisma.rest.post('Client', payload);
    }
  }

  async update(id: string, data: any) {
    const payload = {
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
    };

    try {
      return await this.prisma.client.update({
        where: { id },
        data: payload,
      });
    } catch (err) {
      return await this.prisma.rest.patch('Client', id, payload);
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.client.delete({
        where: { id },
      });
    } catch (err) {
      return await this.prisma.rest.delete('Client', id);
    }
  }
}
