import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    if (session.user.role === "OWNER") {
      redirect("/owner");
    }
    if (session.user.role === "LEADER") {
      redirect("/leaders/sheet");
    }
    if (session.user.role === "CALLER") {
      redirect("/caller/sheet");
    }
  }
  if (!session) {
    redirect("/login");
  }
  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="text-3xl font-bold">Welcome to Carflex!</h1>
    </div>
  );
}
