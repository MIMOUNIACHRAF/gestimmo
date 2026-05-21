import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createId } from "@paralleldrive/cuid2";
import { prisma } from "@/lib/prisma";

// One-time setup endpoint — DELETE THIS FILE after use
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== "OTAB_SETUP_2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.user.findUnique({
    where: { email: "tayeb@otab-immobilier.ma" },
  });

  if (existing) {
    return NextResponse.json({ message: "Compte déjà existant", id: existing.id });
  }

  const hash = await bcrypt.hash("OtabImmo2024!", 10);
  const user = await prisma.user.create({
    data: {
      id: createId(),
      name: "Tayeb MIMOUNI",
      email: "tayeb@otab-immobilier.ma",
      password: hash,
      role: "ADMIN",
    },
  });

  return NextResponse.json({ message: "Compte créé", id: user.id });
}
