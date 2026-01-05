import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { getBaby } from "@/lib/services/babies";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

import EditBabyForm from "./EditBabyForm";

export default async function EditBabyPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirect({
      href: {
        pathname: "/auth/signin",
        query: {
          callbackUrl: `/baby/${id}/settings`,
        },
      },
      locale,
    });
  }

  const baby = await getBaby(id, session.user.id);

  if (!baby) {
    notFound();
  }

  // Check permissions: Owner or Parent
  if (baby.role !== "owner" && baby.role !== "parent") {
    return (
      <PageLayout>
        <div>Unauthorized</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <EditBabyForm
        babyId={baby.id}
        initialName={baby.name}
        initialBirthDate={baby.birth_date}
      />
    </PageLayout>
  );
}
