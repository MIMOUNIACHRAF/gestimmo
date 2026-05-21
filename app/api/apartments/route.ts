import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { floorId, number, type, surface, price, status } = await req.json();
  if (!floorId || !number || !type) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }

  const existing = await prisma.apartment.findFirst({ where: { number } });
  if (existing) return NextResponse.json({ error: "Numéro d'appartement déjà utilisé" }, { status: 409 });

  const apt = await prisma.apartment.create({
    data: { floorId, number, type, surface: Number(surface), price: Number(price), status: status ?? "AVAILABLE" },
  });
  return NextResponse.json(apt, { status: 201 });
}
