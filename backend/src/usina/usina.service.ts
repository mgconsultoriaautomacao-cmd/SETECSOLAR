import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsinaService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: any, search?: string) {
    try {
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
      
      return await this.prisma.usina.findMany({
        where,
        include: { client: true, dataloggerSupplier: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      const usinas = await this.prisma.rest.get('Usina', 'select=*,client:Client(*),dataloggerSupplier:DataloggerSupplier(*)&order=createdAt.desc');
      let filtered = usinas;
      if (user.role === 'CLIENTE') {
        filtered = filtered.filter((u: any) => u.client && u.client.email?.toLowerCase() === user.email?.toLowerCase());
      }
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter((u: any) =>
          (u.name && u.name.toLowerCase().includes(s)) ||
          (u.manufacturer && u.manufacturer.toLowerCase().includes(s)) ||
          (u.model && u.model.toLowerCase().includes(s)) ||
          (u.client && u.client.name && u.client.name.toLowerCase().includes(s))
        );
      }
      return filtered;
    }
  }

  async findOne(user: any, id: string) {
    try {
      const usina = await this.prisma.usina.findUnique({
        where: { id },
        include: { client: true, invoices: true, dataloggerSupplier: true },
      });

      if (!usina) return null;

      if (user.role === 'CLIENTE' && usina.client.email.toLowerCase() !== user.email.toLowerCase()) {
        throw new ForbiddenException('Você não tem permissão para acessar os dados desta usina.');
      }

      return usina;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      const res = await this.prisma.rest.get('Usina', `id=eq.${id}&select=*,client:Client(*),dataloggerSupplier:DataloggerSupplier(*)`);
      const usina = res && res.length > 0 ? res[0] : null;
      if (!usina) return null;
      if (user.role === 'CLIENTE' && usina.client && usina.client.email?.toLowerCase() !== user.email?.toLowerCase()) {
        throw new ForbiddenException('Você não tem permissão para acessar os dados desta usina.');
      }
      return usina;
    }
  }

  async create(data: any) {
    const parseCoord = (val: any) => {
      if (val === undefined || val === null || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    };

    const payload = {
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
      gpsLatitude: parseCoord(data.gpsLatitude),
      gpsLongitude: parseCoord(data.gpsLongitude),
      datalogger: data.datalogger || '',
      address: data.address || '',
      city: data.city || '',
      state: data.state || '',
      minEnergyPeak: data.minEnergyPeak !== undefined ? Number(data.minEnergyPeak) : 0,
      maxEnergyPeak: data.maxEnergyPeak !== undefined ? Number(data.maxEnergyPeak) : 0,
      dataloggerSupplierId: data.dataloggerSupplierId || null,
    };

    try {
      return await this.prisma.usina.create({
        data: payload,
        include: { client: true },
      });
    } catch (err) {
      return await this.prisma.rest.post('Usina', payload);
    }
  }

  async update(id: string, data: any) {
    const parseCoordUpdate = (val: any) => {
      if (val === undefined) return undefined;
      if (val === null || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    };

    const payload = {
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
      gpsLatitude: parseCoordUpdate(data.gpsLatitude),
      gpsLongitude: parseCoordUpdate(data.gpsLongitude),
      datalogger: data.datalogger,
      address: data.address,
      city: data.city,
      state: data.state,
      minEnergyPeak: data.minEnergyPeak !== undefined ? Number(data.minEnergyPeak) : undefined,
      maxEnergyPeak: data.maxEnergyPeak !== undefined ? Number(data.maxEnergyPeak) : undefined,
      dataloggerSupplierId: data.dataloggerSupplierId !== undefined ? data.dataloggerSupplierId : undefined,
    };

    try {
      return await this.prisma.usina.update({
        where: { id },
        data: payload,
        include: { client: true },
      });
    } catch (err) {
      return await this.prisma.rest.patch('Usina', id, payload);
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.usina.delete({
        where: { id },
      });
    } catch (err) {
      return await this.prisma.rest.delete('Usina', id);
    }
  }
}
