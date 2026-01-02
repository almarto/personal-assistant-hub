"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/systemUI/components/Button/Button";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { UserCard } from "./userCard-temp";
import { UserForm } from "./UserForm";
import styles from "./page.module.css";

import { User } from "./types";

interface UsersClientProps {
  initialUsers: User[];
}

export default function UsersClient({ initialUsers }: UsersClientProps) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const users = initialUsers;

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setIsCreating(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingUser(null);
  };

  const handleSuccess = () => {
    handleCancel();
    router.refresh();
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      await authClient.admin.removeUser({
        userId,
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to delete user", error);
    }
  };

  return (
    <div>
      <div className={styles.header}>
        <h2 className={styles.title}>{t("users")}</h2>
        <Button
          size="sm"
          onClick={() => {
            setEditingUser(null);
            setIsCreating(true);
          }}
          leftIcon={<Plus size={16} />}
        >
          {t("createUser")}
        </Button>
      </div>

      {isCreating && (
        <UserForm
          editingUser={editingUser}
          onCancel={handleCancel}
          onSuccess={handleSuccess}
        />
      )}

      <div className={styles.userGrid}>
        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            handleEditClick={handleEditClick}
            handleDeleteUser={handleDeleteUser}
          />
        ))}
      </div>
    </div>
  );
}
