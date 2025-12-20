import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-8">
        <h1 className="text-4xl font-bold" style={{ color: 'var(--color-primary)' }}>Baby Food Tracker</h1>
        <p className="text-xl text-center max-w-md">
          Track your baby's journey to solid foods with ease. Monitor reactions, preferences, and progress.
        </p>
        <div className="flex gap-4">
          {/* Note: In a real app, use client-side navigation for auth pages or Better Auth client methods */}
          <Link href="/api/auth/signin"> 
            <Button size="lg">Login</Button>
          </Link>
          <Link href="/api/auth/signup">
            <Button variant="outline" size="lg">Register</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-screen-xl mx-auto">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Welcome, {session.user.name}</h1>
      </header>

      <main className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6 flex flex-col items-center gap-4">
           <h2 className="text-xl font-semibold">Your Babies</h2>
           <p className="text-gray-500">No babies added yet.</p>
           <Link href="/baby/add">
             <Button>Add Baby</Button>
           </Link>
        </Card>
      </main>
    </div>
  );
}
