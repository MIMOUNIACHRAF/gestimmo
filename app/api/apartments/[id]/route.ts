import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status, clientId, salePrice, saleNotes, surface } = await req.json();

  const apt = await prisma.apartment.findUnique({ where: { id }, include: { sale: true } });
  if (!apt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.apartment.update({
      where: { id },
      data: {
        status,
        clientId: clientId || null,
        ...(surface !== undefined && { surface: Number(surface) }),
      },
    });

    if (status === "SOLD" && clientId) {
      if (apt.sale) {
        await tx.sale.update({
          where: { apartmentId: id },
          data: { price: salePrice, notes: saleNotes, clientId },
        });
      } else {
        await tx.sale.create({
          data: {
            apartmentId: id,
            clientId,
            userId: (session.user as { id: string }).id,
            price: salePrice,
            notes: saleNotes,
          },
        });
      }
    } else if (status !== "SOLD" && apt.sale) {
      await tx.sale.delete({ where: { apartmentId: id } });
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const apt = await prisma.apartment.findUnique({ where: { id }, include: { sale: true } });
  if (!apt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    if (apt.sale) await tx.sale.delete({ where: { apartmentId: id } });
    await tx.apartment.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}
