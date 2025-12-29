"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";
import styles from "./page.module.css";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Role } from "@/lib/types/roles";
import { UserCard } from "./userCard";

import { User } from "./types";

interface UsersClientProps {
  initialUsers: User[];
}

export default function UsersClient({ initialUsers }: UsersClientProps) {
  const t = useTranslations("Admin");
  const tAuth = useTranslations("AuthErrors");
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: Role.USER as string,
  });
  const [error, setError] = useState("");

  const users = initialUsers;

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username || "",
      email: user.email,
      password: "",
      role: user.role || Role.USER,
    });
    setIsCreating(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingUser(null);
    setFormData({
      name: "",
      username: "",
      email: "",
      password: "",
      role: Role.USER,
    });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAuthError = (error: any) => {
      if (error?.message === "PASSWORD_REQUIREMENTS_NOT_MET") {
        setError(t("passwordRequirements"));
      } else {
        setError(error?.message || tAuth("default"));
      }
    };

    try {
      if (editingUser) {
        // Update name
        if (editingUser.name !== formData.name) {
          const { error } = await authClient.admin.updateUser({
            userId: editingUser.id,
            data: {
              name: formData.name,
            },
          });
          if (error) {
            handleAuthError(error);
            return;
          }
        }

        // Update role
        if (editingUser.role !== formData.role) {
          const { error } = await authClient.admin.setRole({
            userId: editingUser.id,
            role: formData.role as Role.USER | Role.ADMIN,
          });
          if (error) {
            handleAuthError(error);
            return;
          }
        }

        // Update password if provided
        if (formData.password) {
          const { error } = await authClient.admin.setUserPassword({
            userId: editingUser.id,
            newPassword: formData.password,
          });
          if (error) {
            handleAuthError(error);
            return;
          }
        }
      } else {
        const { error } = await authClient.admin.createUser({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role as Role.USER | Role.ADMIN,
          data: {
            username: formData.username,
          },
        });
        if (error) {
          handleAuthError(error);
          return;
        }
      }
      handleCancel();
      router.refresh();
    } catch (error) {
      console.error("Failed to save user", error);
      setError(tAuth("default"));
    }
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
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t("users")}</h1>
        <Button
          onClick={() => setIsCreating(true)}
          leftIcon={<Plus size={20} />}
        >
          {t("createUser")}
        </Button>
      </header>

      {isCreating && (
        <Card className={styles.createForm}>
          <form onSubmit={handleSubmit}>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.formGroup}>
              <label>{t("name")}</label>
              <input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>{t("username")}</label>
              <input
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                required
                className={styles.input}
                disabled={!!editingUser}
              />
            </div>
            <div className={styles.formGroup}>
              <label>{t("email")}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                className={styles.input}
                disabled={!!editingUser}
              />
            </div>
            <div className={styles.formGroup}>
              <label>{t("password")}</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required={!editingUser}
                placeholder={editingUser ? t("leaveBlankToKeep") : ""}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>{t("role")}</label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className={styles.select}
              >
                <option value={Role.USER}>{t("user")}</option>
                <option value={Role.ADMIN}>{t("admin")}</option>
              </select>
            </div>
            <div className={styles.formActions}>
              <Button type="button" variant="outline" onClick={handleCancel}>
                {t("cancel")}
              </Button>
              <Button type="submit">
                {editingUser ? t("save") : t("createUser")}
              </Button>
            </div>
          </form>
        </Card>
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
