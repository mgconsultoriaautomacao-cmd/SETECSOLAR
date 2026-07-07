import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkOrderService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.workOrder.findMany({
      include: {
        client: { select: { name: true, phone: true, address: true, city: true, state: true } },
        usina: { select: { name: true, address: true, gpsLatitude: true, gpsLongitude: true } },
        technician: { select: { name: true, phone: true } },
        parts: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        client: { select: { name: true, phone: true, address: true, city: true, state: true } },
        usina: { select: { name: true, address: true, gpsLatitude: true, gpsLongitude: true } },
        technician: { select: { name: true, phone: true } },
        parts: true,
      },
    });
  }

  async create(data: any) {
    // Auto-increment number
    const last = await this.prisma.workOrder.findFirst({ orderBy: { number: 'desc' } });
    const nextNumber = last ? last.number + 1 : 1;

    return this.prisma.workOrder.create({
      data: {
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
      },
      include: {
        client: { select: { name: true, phone: true, address: true, city: true, state: true } },
        usina: { select: { name: true, address: true, gpsLatitude: true, gpsLongitude: true } },
        technician: { select: { name: true, phone: true } },
        parts: true,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.workOrder.update({
      where: { id },
      data: {
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
      },
      include: {
        client: { select: { name: true, phone: true, address: true, city: true, state: true } },
        usina: { select: { name: true, address: true, gpsLatitude: true, gpsLongitude: true } },
        technician: { select: { name: true, phone: true } },
        parts: true,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.workOrder.delete({ where: { id } });
  }

  async addPart(workOrderId: string, data: any) {
    return this.prisma.workOrderPart.create({
      data: {
        workOrderId,
        description: data.description,
        quantity: data.quantity,
        unit: data.unit,
        unitCost: data.unitCost,
      }
    });
  }

  async removePart(partId: string) {
    return this.prisma.workOrderPart.delete({ where: { id: partId } });
  }
}
