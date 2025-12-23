'use client';

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "../Button/Button";
import { useTranslations } from "next-intl";

export default function LogoutButton() {
  const router = useRouter();
  const t = useTranslations('Auth');

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
      {t('logout')}
    </Button>
  );
}