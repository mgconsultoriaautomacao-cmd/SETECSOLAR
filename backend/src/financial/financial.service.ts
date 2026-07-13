import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinancialService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(type?: string, status?: string, search?: string) {
    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { supplierOrClient: { contains: search, mode: 'insensitive' } },
        { ticketInfo: { contains: search, mode: 'insensitive' } },
        { observations: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.financialRecord.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { dueDate: 'desc' },
    });
  }

  async getSummary() {
    const records = await this.prisma.financialRecord.findMany();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalRecebidoMes = 0;
    let totalPendenteMes = 0;
    let totalAtrasado = 0;
    let totalPagarMes = 0;
    let mrr = 0; // Contas a receber recorrentes do mês corrente

    records.forEach((record) => {
      const recordDate = new Date(record.dueDate);
      const isCurrentMonth =
        recordDate.getMonth() === currentMonth &&
        recordDate.getFullYear() === currentYear;

      if (record.type === 'RECEBER') {
        if (record.status === 'PAGO' || record.status === 'RECEBIDO') {
          if (isCurrentMonth) {
            totalRecebidoMes += record.amount;
          }
        } else {
          // Pendente ou Vencido/Atrasado
          if (recordDate < now && record.status !== 'PAGO' && record.status !== 'RECEBIDO') {
            totalAtrasado += record.amount;
          }
          if (isCurrentMonth) {
            totalPendenteMes += record.amount;
          }
        }
        if (isCurrentMonth) {
          mrr += record.amount; // Todas as receitas previstas do mês (ou recorrentes)
        }
      } else if (record.type === 'PAGAR') {
        if (isCurrentMonth) {
          totalPagarMes += record.amount;
        }
        if (record.status !== 'PAGO' && recordDate < now) {
          // Contas a pagar atrasadas
          // Podemos adicionar no total de atrasados ou lidar separadamente
        }
      }
    });

    return {
      mrr,
      totalRecebido: totalRecebidoMes,
      totalPendente: totalPendenteMes,
      totalAtrasado,
      totalPagar: totalPagarMes,
      lucroEstimado: mrr - totalPagarMes,
    };
  }

  async create(data: any) {
    return this.prisma.financialRecord.create({
      data: {
        type: data.type,
        description: data.description,
        amount: Number(data.amount),
        dueDate: new Date(data.dueDate),
        entryDate: data.entryDate ? new Date(data.entryDate) : new Date(),
        status: data.status || 'PENDENTE',
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
        supplierOrClient: data.supplierOrClient,
        ticketInfo: data.ticketInfo || null,
        observations: data.observations || null,
        clientId: data.clientId || null,
      },
      include: {
        client: true,
      },
    });
  }

  async update(id: string, data: any) {
    const updateData: any = {};
    if (data.type !== undefined) updateData.type = data.type;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = Number(data.amount);
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
    if (data.entryDate !== undefined) updateData.entryDate = new Date(data.entryDate);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.paymentDate !== undefined) {
      updateData.paymentDate = data.paymentDate ? new Date(data.paymentDate) : null;
    }
    if (data.supplierOrClient !== undefined) updateData.supplierOrClient = data.supplierOrClient;
    if (data.ticketInfo !== undefined) updateData.ticketInfo = data.ticketInfo;
    if (data.observations !== undefined) updateData.observations = data.observations;
    if (data.clientId !== undefined) updateData.clientId = data.clientId;

    return this.prisma.financialRecord.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.financialRecord.delete({
      where: { id },
    });
  }
}
