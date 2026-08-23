import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.ticket.findMany({
        include: {
          client: { select: { name: true, phone: true, whatsapp: true, address: true, city: true, state: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      return await this.prisma.rest.get('Ticket', 'select=*,client:Client(name,phone,whatsapp,address,city,state)&order=createdAt.desc');
    }
  }

  async findOne(id: string) {
    try {
      return await this.prisma.ticket.findUnique({
        where: { id },
        include: {
          client: { select: { name: true, phone: true, whatsapp: true, address: true, city: true, state: true } },
        },
      });
    } catch (err) {
      const res = await this.prisma.rest.get('Ticket', `id=eq.${id}&select=*,client:Client(name,phone,whatsapp,address,city,state)`);
      return res && res.length > 0 ? res[0] : null;
    }
  }

  async create(data: any) {
    const payload = {
      clientId: data.clientId,
      category: data.category,
      title: data.title,
      description: data.description,
      status: data.status || 'OPEN',
    };

    try {
      return await this.prisma.ticket.create({
        data: payload,
        include: {
          client: { select: { name: true, phone: true, whatsapp: true, address: true, city: true, state: true } },
        },
      });
    } catch (err) {
      return await this.prisma.rest.post('Ticket', payload);
    }
  }

  async update(id: string, data: any) {
    const payload = {
      category: data.category,
      title: data.title,
      description: data.description,
      status: data.status,
      resolution: data.resolution,
      workOrderId: data.workOrderId,
    };

    try {
      return await this.prisma.ticket.update({
        where: { id },
        data: payload,
        include: {
          client: { select: { name: true, phone: true, whatsapp: true, address: true, city: true, state: true } },
        },
      });
    } catch (err) {
      return await this.prisma.rest.patch('Ticket', id, payload);
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.ticket.delete({ where: { id } });
    } catch (err) {
      return await this.prisma.rest.delete('Ticket', id);
    }
  }
}
