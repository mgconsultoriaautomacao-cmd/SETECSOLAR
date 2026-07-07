import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsinaService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: any, search?: string) {
    const where: Prisma.UsinaWhereInput = {};
    
    if (user.role === 'CLIENTE') {
      where.client = { email: { equals: user.email } };
    } else if (search) {
      where.OR = [
        { name: { contains: search } },
        { manufacturer: { contains: search } },
        { model: { contains: search } },
        { client: { name: { contains: search } } },
      ];
    }
    
    return this.prisma.usina.findMany({
      where,
      include: { client: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: any, id: string) {
    const usina = await this.prisma.usina.findUnique({
      where: { id },
      include: { client: true, invoices: true },
    });

    if (!usina) return null;

    if (user.role === 'CLIENTE' && usina.client.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException('Você não tem permissão para acessar os dados desta usina.');
    }

    return usina;
  }

  async create(data: any) {
    return this.prisma.usina.create({
      data: {
        name: data.name,
        clientId: data.clientId,
        capacityKwp: Number(data.capacityKwp),
        inverterCapacity: Number(data.inverterCapacity),
        moduleCount: Math.round(Number(data.moduleCount)),
        manufacturer: data.manufacturer,
        model: data.model || '',
        utilityCompany: data.utilityCompany || data.utility || '',
        estimatedKwh: Number(data.estimatedKwh),
        paybackYears: Number(data.paybackYears !== undefined ? data.paybackYears : data.payback),
        installationDate: data.installationDate ? new Date(data.installationDate) : new Date(),
        approvalDate: data.approvalDate ? new Date(data.approvalDate) : null,
        status: data.status || 'ONLINE',
        gpsLatitude: data.gpsLatitude !== undefined && data.gpsLatitude !== null ? Number(data.gpsLatitude) : null,
        gpsLongitude: data.gpsLongitude !== undefined && data.gpsLongitude !== null ? Number(data.gpsLongitude) : null,
        datalogger: data.datalogger || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        minEnergyPeak: data.minEnergyPeak !== undefined ? Number(data.minEnergyPeak) : 0,
        maxEnergyPeak: data.maxEnergyPeak !== undefined ? Number(data.maxEnergyPeak) : 0,
      },
      include: { client: true },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.usina.update({
      where: { id },
      data: {
        name: data.name,
        clientId: data.clientId,
        capacityKwp: data.capacityKwp !== undefined ? Number(data.capacityKwp) : undefined,
        inverterCapacity: data.inverterCapacity !== undefined ? Number(data.inverterCapacity) : undefined,
        moduleCount: data.moduleCount !== undefined ? Math.round(Number(data.moduleCount)) : undefined,
        manufacturer: data.manufacturer,
        model: data.model,
        utilityCompany: data.utilityCompany || data.utility,
        estimatedKwh: data.estimatedKwh !== undefined ? Number(data.estimatedKwh) : undefined,
        paybackYears: data.paybackYears !== undefined ? Number(data.paybackYears) : (data.payback !== undefined ? Number(data.payback) : undefined),
        installationDate: data.installationDate ? new Date(data.installationDate) : undefined,
        approvalDate: data.approvalDate !== undefined ? (data.approvalDate ? new Date(data.approvalDate) : null) : undefined,
        status: data.status,
        gpsLatitude: data.gpsLatitude !== undefined && data.gpsLatitude !== null ? Number(data.gpsLatitude) : undefined,
        gpsLongitude: data.gpsLongitude !== undefined && data.gpsLongitude !== null ? Number(data.gpsLongitude) : undefined,
        datalogger: data.datalogger,
        address: data.address,
        city: data.city,
        state: data.state,
        minEnergyPeak: data.minEnergyPeak !== undefined ? Number(data.minEnergyPeak) : undefined,
        maxEnergyPeak: data.maxEnergyPeak !== undefined ? Number(data.maxEnergyPeak) : undefined,
      },
      include: { client: true },
    });
  }

  async remove(id: string) {
    return this.prisma.usina.delete({
      where: { id },
    });
  }
}
