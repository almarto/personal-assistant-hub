"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";
import styles from "./page.module.css";
import { Role } from "@/lib/types/roles";
import { authClient } from "@/lib/auth-client";
import { User } from "./types";

interface UserFormProps {
  editingUser: User | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function UserForm({ editingUser, onCancel, onSuccess }: UserFormProps) {
  const t = useTranslations("Admin");
  const tAuth = useTranslations("AuthErrors");

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    roles: [Role.CAREGIVER] as string[],
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (editingUser) {
      setFormData({
        name: editingUser.name,
        username: editingUser.username || "",
        email: editingUser.email,
        password: "",
        roles: editingUser.role
          ? editingUser.role.split(",").map((r) => r.trim())
          : [Role.CAREGIVER],
      });
    } else {
      setFormData({
        name: "",
        username: "",
        email: "",
        password: "",
        roles: [Role.CAREGIVER],
      });
    }
  }, [editingUser]);

  const handleRoleChange = (role: string, checked: boolean) => {
    setFormData((prev) => {
      if (checked) {
        return { ...prev, roles: [...prev.roles, role] };
      } else {
        return { ...prev, roles: prev.roles.filter((r) => r !== role) };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const roleString = formData.roles.join(",");

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
        if (editingUser.role !== roleString) {
          const { error } = await authClient.admin.setRole({
            userId: editingUser.id,
            // @ts-expect-error better-auth types might not support comma-separated string explicitly but it works
            role: roleString,
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
          // @ts-expect-error better-auth types might not support comma-separated string explicitly but it works
          role: roleString,
          data: {
            username: formData.username,
          },
        });
        if (error) {
          handleAuthError(error);
          return;
        }
      }
      onSuccess();
    } catch (error) {
      console.error("Failed to save user", error);
      setError(tAuth("default"));
    }
  };

  return (
    <Card className={styles.createForm}>
      <form onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.formGroup}>
          <label>{t("name")}</label>
          <input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.roles.includes(Role.ADMIN)}
                onChange={(e) => handleRoleChange(Role.ADMIN, e.target.checked)}
              />
              {t("admin")}
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.roles.includes(Role.PARENT)}
                onChange={(e) =>
                  handleRoleChange(Role.PARENT, e.target.checked)
                }
              />
              {t("parent")}
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.roles.includes(Role.CAREGIVER)}
                onChange={(e) =>
                  handleRoleChange(Role.CAREGIVER, e.target.checked)
                }
              />
              {t("caregiver")}
            </label>
          </div>
        </div>
        <div className={styles.formActions}>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button type="submit">
            {editingUser ? t("save") : t("createUser")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
