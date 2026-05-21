import { prisma } from "@/lib/prisma";
import ClientsClient from "./ClientsClient";

async function getClients() {
  return prisma.client.findMany({
    include: { apartments: { include: { floor: { include: { building: { include: { bloc: true } } } } } }, sales: true },
    orderBy: { createdAt: "desc" },
  });
}

export default async function ClientsPage() {
  const clients = await getClients();
  return <ClientsClient clients={clients} />;
}
