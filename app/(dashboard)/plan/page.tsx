import { prisma } from "@/lib/prisma";
import PlanMasseClient from "./PlanMasseClient";

async function getPlanData() {
  const [blocs, clients] = await Promise.all([
    prisma.bloc.findMany({
      include: {
        buildings: {
          include: {
            floors: {
              orderBy: { order: "asc" },
              include: {
                apartments: {
                  include: { client: true },
                  orderBy: { number: "asc" },
                },
              },
            },
          },
          orderBy: { position: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
  ]);
  return { blocs, clients };
}

export default async function PlanPage() {
  const { blocs, clients } = await getPlanData();
  return <PlanMasseClient blocs={blocs} clients={clients} />;
}
