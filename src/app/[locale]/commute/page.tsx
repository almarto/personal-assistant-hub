import { headers } from "next/headers";

import { getMyCommuteConfigAction } from "@/app/actions/commute";
import { redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";

import { CommuteConfigClient } from "./CommuteConfigClient";

export default async function CommutePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { locale } = await params;

  if (!session) {
    return redirect({
      href: { pathname: "/auth/signin", query: { callbackUrl: "/commute" } },
      locale,
    });
  }

  const result = await getMyCommuteConfigAction();
  const initialConfig = result.success ? result.config : null;

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-xl font-semibold">Commute routes</h1>
      <CommuteConfigClient initialConfig={initialConfig} />
    </div>
  );
}
