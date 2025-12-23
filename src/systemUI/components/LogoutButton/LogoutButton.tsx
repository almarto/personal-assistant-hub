"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";

import { Button } from "../Button/Button";

export default function LogoutButton() {
  const router = useRouter();
  const t = useTranslations("Auth");

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
          router.refresh();
        },
      },
    });
  };

  return (
    <Button onClick={handleLogout} variant="outline" size="sm">
      {t("logout")}
    </Button>
  );
}
