import { redirect } from "@/i18n/routing";

/** The feature moved to /finances; keep old links working. */
export default async function BankingRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return redirect({ href: "/finances", locale });
}
