import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const user = {
    name: session.user?.name,
    email: session.user?.email,
    role: (session.user as { role?: string })?.role ?? "AGENT",
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <main className="flex-1 overflow-auto bg-[#06080f]">
        {children}
      </main>
    </div>
  );
}
