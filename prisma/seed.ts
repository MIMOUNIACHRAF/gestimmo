import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../app/generated/prisma/client";
import bcrypt from "bcryptjs";
import { createId } from "@paralleldrive/cuid2";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaLibSql({ url } as never);
const prisma = new PrismaClient({ adapter } as never);

// ── Structure définie par le client (issue de l'image DWG) ───────────────────
// BLOC1 : 4 immeubles × 2 apts = 8 apts/étage  (IM.A IM.B IM.C IM.D)
// BLOC2 : 5 immeubles × 2 apts = 10 apts/étage (IM.A IM.B IM.C IM.D IM.E)
// BLOC3 : 4 immeubles × 2 apts = 8 apts/étage  (IM.A IM.B IM.C IM.D)
// BLOC4 : 4 immeubles × 2 apts = 8 apts/étage  (IM.A IM.B IM.C IM.D)
const SURF: Record<string, number> = { F2: 62, F3: 80, F4: 100, F5: 120 };
const PRIX: Record<string, number> = { F2: 900_000, F3: 1_170_000, F4: 1_440_000, F5: 1_800_000 };
const FLOORS = ["RDC", "ETG 1", "ETG 2"];

const BLOCS_DEF = [
  {
    name: "BLOC 1", // Nord — 8 apts/étage
    immeubles: [
      { name: "IM.A", pos: 0, types: ["F3", "F4"] },
      { name: "IM.B", pos: 1, types: ["F3", "F4"] },
      { name: "IM.C", pos: 2, types: ["F4", "F5"] },
      { name: "IM.D", pos: 3, types: ["F3", "F4"] },
    ],
  },
  {
    name: "BLOC 2", // Ouest — 10 apts/étage
    immeubles: [
      { name: "IM.A", pos: 0, types: ["F3", "F4"] },
      { name: "IM.B", pos: 1, types: ["F3", "F4"] },
      { name: "IM.C", pos: 2, types: ["F4", "F5"] },
      { name: "IM.D", pos: 3, types: ["F3", "F4"] },
      { name: "IM.E", pos: 4, types: ["F2", "F3"] },
    ],
  },
  {
    name: "BLOC 3", // Sud — 8 apts/étage
    immeubles: [
      { name: "IM.A", pos: 0, types: ["F3", "F4"] },
      { name: "IM.B", pos: 1, types: ["F3", "F4"] },
      { name: "IM.C", pos: 2, types: ["F4", "F5"] },
      { name: "IM.D", pos: 3, types: ["F3", "F4"] },
    ],
  },
  {
    name: "BLOC 4", // Est — 8 apts/étage
    immeubles: [
      { name: "IM.A", pos: 0, types: ["F3", "F4"] },
      { name: "IM.B", pos: 1, types: ["F3", "F4"] },
      { name: "IM.C", pos: 2, types: ["F4", "F5"] },
      { name: "IM.D", pos: 3, types: ["F3", "F4"] },
    ],
  },
];

// Statuses matching image: RDC mostly sold, ETG1 mixed, ETG2 mostly available
const STATUS_SEQS: Record<number, string[]> = {
  0: ["SOLD","SOLD","SOLD","AVAILABLE","SOLD","RESERVED","AVAILABLE","SOLD","RESERVED","AVAILABLE","SOLD","SOLD"],
  1: ["SOLD","AVAILABLE","RESERVED","AVAILABLE","SOLD","AVAILABLE","AVAILABLE","RESERVED","SOLD","AVAILABLE","AVAILABLE","SOLD"],
  2: ["AVAILABLE","AVAILABLE","AVAILABLE","AVAILABLE","SOLD","AVAILABLE","AVAILABLE","AVAILABLE","RESERVED","AVAILABLE","GREEN","AVAILABLE"],
};

function getStatus(fi: number, idx: number): string {
  const seq = STATUS_SEQS[fi];
  const v = seq[idx % seq.length];
  return v === "GREEN" ? "AVAILABLE" : v;
}

async function main() {
  console.log("Seeding Secteur N°2 — 3 résidences...");

  // ── Wipe existing ─────────────────────────────────────────────────────────
  await prisma.sale.deleteMany();
  await prisma.apartment.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.building.deleteMany();
  await prisma.bloc.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  // ── Users ─────────────────────────────────────────────────────────────────
  const adminId = createId();
  const agentId = createId();
  const [adminPw, agentPw] = await Promise.all([bcrypt.hash("admin123", 10), bcrypt.hash("agent123", 10)]);

  await prisma.user.createMany({
    data: [
      { id: adminId, name: "Administrateur", email: "admin@gestimmo.dz", password: adminPw, role: "ADMIN" },
      { id: agentId, name: "Agent Commercial", email: "agent@gestimmo.dz", password: agentPw, role: "AGENT" },
    ],
  });

  // ── Build all IDs in memory, then batch insert ────────────────────────────
  const RES_NAMES = ["Résidence 1"];

  const blocsData: { id: string; name: string }[] = [];
  const buildingsData: { id: string; name: string; position: number; blocId: string }[] = [];
  const floorsData: { id: string; name: string; order: number; buildingId: string }[] = [];
  const aptsData: { id: string; number: string; type: string; surface: number; price: number; status: string; floorId: string }[] = [];

  let globalAptIdx = 0;

  for (let ri = 0; ri < RES_NAMES.length; ri++) {
    for (const blocDef of BLOCS_DEF) {
      const blocId = createId();
      blocsData.push({ id: blocId, name: `${RES_NAMES[ri]} — ${blocDef.name}` });

      for (const imDef of blocDef.immeubles) {
        const buildingId = createId();
        buildingsData.push({ id: buildingId, name: imDef.name, position: imDef.pos, blocId });

        for (let fi = 0; fi < FLOORS.length; fi++) {
          const floorId = createId();
          floorsData.push({ id: floorId, name: FLOORS[fi], order: fi, buildingId });

          for (let ai = 0; ai < imDef.types.length; ai++) {
            const type = imDef.types[ai];
            const bloc = blocDef.name.replace("BLOC ", "B");
            const floor = FLOORS[fi].replace("ETG ", "E");
            const num = `${bloc}${imDef.name.replace("IM.", "")}-${floor}-${String(ai + 1).padStart(2, "0")}`;
            aptsData.push({
              id: createId(),
              number: num,
              type,
              surface: SURF[type],
              price: PRIX[type],
              status: getStatus(fi, globalAptIdx++),
              floorId,
            });
          }
        }
      }
    }
  }

  // 3 résidences × (4+5+4+4) bâtiments × 3 étages × 2 apts = 306
  console.log(`  ${blocsData.length} blocs, ${buildingsData.length} immeubles, ${floorsData.length} étages, ${aptsData.length} appartements`);

  // ── Batch inserts (split into chunks to avoid timeout) ───────────────────
  const CHUNK = 50;

  for (let i = 0; i < blocsData.length; i += CHUNK) {
    await prisma.bloc.createMany({ data: blocsData.slice(i, i + CHUNK) });
  }
  console.log(`  ✓ Blocs insérés`);

  for (let i = 0; i < buildingsData.length; i += CHUNK) {
    await prisma.building.createMany({ data: buildingsData.slice(i, i + CHUNK) });
  }
  console.log(`  ✓ Immeubles insérés`);

  for (let i = 0; i < floorsData.length; i += CHUNK) {
    await prisma.floor.createMany({ data: floorsData.slice(i, i + CHUNK) });
  }
  console.log(`  ✓ Étages insérés`);

  for (let i = 0; i < aptsData.length; i += CHUNK) {
    await prisma.apartment.createMany({ data: aptsData.slice(i, i + CHUNK) });
  }
  console.log(`  ✓ Appartements insérés`);

  // ── Clients ───────────────────────────────────────────────────────────────
  await prisma.client.createMany({
    data: [
      { id: createId(), name: "Ahmed Benali", phone: "0555 123 456", email: "ahmed.benali@email.dz", cin: "123456789" },
      { id: createId(), name: "Fatima Zahra Khelifi", phone: "0660 789 012", email: "fz.khelifi@email.dz", cin: "987654321" },
      { id: createId(), name: "Mohamed Salah Djamel", phone: "0771 345 678", cin: "456789123" },
      { id: createId(), name: "Karim Boudiaf", phone: "0699 234 567", email: "k.boudiaf@mail.dz", cin: "789123456" },
    ],
  });

  console.log(`\n✅ Seed terminé !`);
  console.log(`   ${aptsData.length} appartements (attendu: 306)`);
  console.log(`   admin@gestimmo.dz / admin123`);
  console.log(`   agent@gestimmo.dz / agent123`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
