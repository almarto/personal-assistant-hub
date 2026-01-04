"use client";

import { User } from "@/app/[locale]/admin/users/types";
import { UserForm } from "@/app/[locale]/admin/users/UserForm";
import { useRouter } from "@/i18n/routing";

interface ProfileClientProps {
  user: User;
}

export function ProfileClient({ user }: ProfileClientProps) {
  const router = useRouter();

  return (
    <UserForm
      editingUser={user}
      onCancel={() => router.push("/")}
      onSuccess={() => {
        router.refresh();
      }}
    />
  );
}
