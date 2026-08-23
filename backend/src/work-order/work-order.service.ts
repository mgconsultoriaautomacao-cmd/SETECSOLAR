import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkOrderService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.workOrder.findMany({
        include: {
          client: { select: { name: true, phone: true, address: true, city: true, state: true } },
          usina: { select: { name: true, address: true, gpsLatitude: true, gpsLongitude: true } },
          technician: { select: { name: true, phone: true } },
          parts: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      return await this.prisma.rest.get('WorkOrder', 'select=*,client:Client(name,phone,address,city,state),usina:Usina(name,address,gpsLatitude,gpsLongitude),technician:User(name,phone),parts:WorkOrderPart(*)&order=createdAt.desc');
    }
  }

  async findOne(id: string) {
    try {
      return await this.prisma.workOrder.findUnique({
        where: { id },
        include: {
          client: { select: { name: true, phone: true, address: true, city: true, state: true } },
          usina: { select: { name: true, address: true, gpsLatitude: true, gpsLongitude: true } },
          technician: { select: { name: true, phone: true } },
          parts: true,
        },
      });
    } catch (err) {
      const res = await this.prisma.rest.get('WorkOrder', `id=eq.${id}&select=*,client:Client(name,phone,address,city,state),usina:Usina(name,address,gpsLatitude,gpsLongitude),technician:User(name,phone),parts:WorkOrderPart(*)`);
      return res && res.length > 0 ? res[0] : null;
    }
  }

  async create(data: any) {
    let nextNumber = 1;
    try {
      const last = await this.prisma.workOrder.findFirst({ orderBy: { number: 'desc' } });
      nextNumber = last ? last.number + 1 : 1;
    } catch (e) {
      const lastRest = await this.prisma.rest.get('WorkOrder', 'select=number&order=number.desc&limit=1');
      nextNumber = lastRest && lastRest.length > 0 ? lastRest[0].number + 1 : 1;
    }

    const payload = {
      number: nextNumber,
      clientId: data.clientId,
      usinaId: data.usinaId,
      description: data.description,
      priority: data.priority || 'MEDIUM',
      status: data.status || 'OPEN',
      technicianId: data.technicianId || null,
      serviceType: data.serviceType || 'CORRETIVA',
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      laborCost: data.laborCost || 0,
      notes: data.notes || null,
      internalNotes: data.internalNotes || null,
    };

    try {
      return await this.prisma.workOrder.create({
        data: payload,
        include: {
          client: { select: { name: true, phone: true, address: true, city: true, state: true } },
          usina: { select: { name: true, address: true, gpsLatitude: true, gpsLongitude: true } },
          technician: { select: { name: true, phone: true } },
          parts: true,
        },
      });
    } catch (err) {
      return await this.prisma.rest.post('WorkOrder', payload);
    }
  }

  async update(id: string, data: any) {
    const payload = {
      description: data.description,
      priority: data.priority,
      status: data.status,
      technicianId: data.technicianId,
      serviceType: data.serviceType,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      notes: data.notes,
      internalNotes: data.internalNotes,
      laborCost: data.laborCost,
    };

    try {
      return await this.prisma.workOrder.update({
        where: { id },
        data: payload,
        include: {
          client: { select: { name: true, phone: true, address: true, city: true, state: true } },
          usina: { select: { name: true, address: true, gpsLatitude: true, gpsLongitude: true } },
          technician: { select: { name: true, phone: true } },
          parts: true,
        },
      });
    } catch (err) {
      return await this.prisma.rest.patch('WorkOrder', id, payload);
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.workOrder.delete({ where: { id } });
    } catch (err) {
      return await this.prisma.rest.delete('WorkOrder', id);
    }
  }

  async addPart(workOrderId: string, data: any) {
    const payload = {
      workOrderId,
      description: data.description,
      quantity: data.quantity,
      unit: data.unit,
      unitCost: data.unitCost,
    };
    try {
      return await this.prisma.workOrderPart.create({ data: payload });
    } catch (err) {
      return await this.prisma.rest.post('WorkOrderPart', payload);
    }
  }

  async removePart(partId: string) {
    try {
      return await this.prisma.workOrderPart.delete({ where: { id: partId } });
    } catch (err) {
      return await this.prisma.rest.delete('WorkOrderPart', partId);
    }
  }
}
