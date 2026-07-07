import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.ticket.findMany({
      include: {
        client: { select: { name: true, phone: true, whatsapp: true, address: true, city: true, state: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.ticket.findUnique({
      where: { id },
      include: {
        client: { select: { name: true, phone: true, whatsapp: true, address: true, city: true, state: true } },
      },
    });
  }

  async create(data: any) {
    return this.prisma.ticket.create({
      data: {
        clientId: data.clientId,
        category: data.category,
        title: data.title,
        description: data.description,
        status: data.status || 'OPEN',
      },
      include: {
        client: { select: { name: true, phone: true, whatsapp: true, address: true, city: true, state: true } },
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.ticket.update({
      where: { id },
      data: {
        category: data.category,
        title: data.title,
        description: data.description,
        status: data.status,
        resolution: data.resolution,
        workOrderId: data.workOrderId,
      },
      include: {
        client: { select: { name: true, phone: true, whatsapp: true, address: true, city: true, state: true } },
      },
    });
  }

  async remove(id: string) {
    return this.prisma.ticket.delete({ where: { id } });
  }
}
