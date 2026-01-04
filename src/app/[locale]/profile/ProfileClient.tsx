"use client";

import { UserForm } from "@/app/[locale]/admin/users/UserForm";
import { useRouter } from "@/i18n/routing";
import { User } from "@/lib/types/user";

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
