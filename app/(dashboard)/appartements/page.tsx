import { prisma } from "@/lib/prisma";
import ApartmentsClient from "./ApartmentsClient";

async function getData() {
  const [apartments, blocs, clients] = await Promise.all([
    prisma.apartment.findMany({
      include: {
        floor: {
          include: {
            building: { include: { bloc: true } },
          },
        },
        client: true,
        sale: true,
      },
      orderBy: [
        { floor: { building: { bloc: { name: "asc" } } } },
        { floor: { order: "asc" } },
        { number: "asc" },
      ],
    }),
    prisma.bloc.findMany({
      include: {
        buildings: {
          include: { floors: { orderBy: { order: "asc" } } },
          orderBy: { position: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
  ]);
  return { apartments, blocs, clients };
}

export default async function ApartmentsPage() {
  const { apartments, blocs, clients } = await getData();
  return <ApartmentsClient apartments={apartments} blocs={blocs} clients={clients} />;
}
