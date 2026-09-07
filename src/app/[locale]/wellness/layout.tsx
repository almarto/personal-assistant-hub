import { Archivo, Instrument_Serif } from "next/font/google";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { getFamilyIdForUser } from "@/lib/services/wellness/families";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";
import { SectionSubNav } from "@/systemUI/components/SectionSubNav/SectionSubNav";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-wellness-serif",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-wellness-sans",
});

export default async function WellnessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect({
      href: { pathname: "/auth/signin", query: { callbackUrl: "/wellness" } },
      locale,
    });
  } else {
    const familyId = await getFamilyIdForUser(session.user.id);
    if (!familyId) {
      redirect({ href: "/", locale });
    }
  }

  const t = await getTranslations("Wellness");
  const wellnessTabs = [
    { label: t("tabs.eating"), href: "/wellness/eating" },
    { label: t("tabs.training"), href: "/wellness/training" },
    { label: t("tabs.measurements"), href: "/wellness/measurements" },
    { label: t("tabs.shopping"), href: "/wellness/shopping" },
  ];

  return (
    <PageLayout theme="wellness">
      <div
        className={`${instrumentSerif.variable} ${archivo.variable}`}
        style={{ fontFamily: "var(--font-wellness-sans), system-ui, sans-serif" }}
      >
        <SectionSubNav title="Wellness" tabs={wellnessTabs} />
        {children}
      </div>
    </PageLayout>
  );
}
