import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, phone, email, cin } = await req.json();
  if (!name || !phone) return NextResponse.json({ error: "Nom et téléphone requis" }, { status: 400 });

  try {
    const client = await prisma.client.create({
      data: { name, phone, email: email || null, cin: cin || null },
    });
    return NextResponse.json(client, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Client déjà existant (CIN dupliqué)" }, { status: 409 });
  }
}
