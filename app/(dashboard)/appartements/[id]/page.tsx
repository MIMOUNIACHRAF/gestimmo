import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ApartmentDetailClient from "./ApartmentDetailClient";

export default async function ApartmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apt = await prisma.apartment.findUnique({
    where: { id },
    include: {
      floor: { include: { building: { include: { bloc: true } } } },
      client: true,
      sale: { include: { user: true } },
    },
  });
  if (!apt) notFound();

  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });
  return <ApartmentDetailClient apartment={apt} clients={clients} />;
}
