"use client";

import clsx from "clsx";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { createUserAndNotify } from "@/app/actions/admin-users";
import { authClient } from "@/lib/auth-client";
import { hasRole,Role } from "@/lib/types/roles";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";

import styles from "./page.module.css";
import { User } from "./types";

interface UserFormProps {
  editingUser: User | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function UserForm({ editingUser, onCancel, onSuccess }: UserFormProps) {
  const t = useTranslations("Admin");
  const tAuth = useTranslations("AuthErrors");
  const { data: session } = authClient.useSession();

  const isAdmin = hasRole(session?.user?.role, Role.ADMIN);

  const [formData, setFormData] = useState({
    name: editingUser?.name || "",
    username: editingUser?.username || "",
    email: editingUser?.email || "",
    password: "",
    confirmPassword: "",
    currentPassword: "",
    role: (editingUser?.role as Role) || Role.USER,
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  const isCurrentUser = editingUser?.id === session?.user?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.username || !formData.email) {
      setError(t("allFieldsRequired"));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError(tAuth("INVALID_EMAIL"));
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      setError(tAuth("PASSWORDS_DO_NOT_MATCH"));
      return;
    }

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
        if (isAdmin) {
          // Admin updating user (or self)
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
              role: formData.role,
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
        } else if (isCurrentUser) {
          // Non-admin updating self
          // Update name
          if (editingUser.name !== formData.name) {
            const { error } = await authClient.updateUser({
              name: formData.name,
            });
            if (error) {
              handleAuthError(error);
              return;
            }
          }

          // Update password if provided
          if (formData.password) {
            if (!formData.currentPassword) {
              setError(t("currentPasswordRequired"));
              return;
            }
            const { error } = await authClient.changePassword({
              newPassword: formData.password,
              currentPassword: formData.currentPassword,
              revokeOtherSessions: true,
            });
            if (error) {
              handleAuthError(error);
              return;
            }
          }
        }
      } else {
        const result = await createUserAndNotify({
          name: formData.name,
          email: formData.email,
          username: formData.username,
          role: formData.role,
        });

        if (!result.success) {
          setError(result.error || tAuth("default"));
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
      <form onSubmit={handleSubmit} noValidate>
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.formGroup}>
          <label>{t("name")}</label>
          <input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className={styles.input}
            disabled={!!editingUser && !isCurrentUser}
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
        {isCurrentUser && (
          <>
            <div className={styles.formGroup}>
              <label>{t("newPassword")}</label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder={t("leaveBlankToKeep")}
                  className={clsx(styles.input, styles.passwordInput)}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {formData.password && (
              <div className={styles.formGroup}>
                <label>{t("confirmNewPassword")}</label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className={clsx(styles.input, styles.passwordInput)}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>
              </div>
            )}

            {!isAdmin && formData.password && (
              <div className={styles.formGroup}>
                <label>{t("currentPassword")}</label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={formData.currentPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        currentPassword: e.target.value,
                      })
                    }
                    className={clsx(styles.input, styles.passwordInput)}
                    required
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    aria-label={
                      showCurrentPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showCurrentPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        {isAdmin && (
          <div className={styles.formGroup}>
            <label>{t("role")}</label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value as Role })
              }
              className={styles.select}
              disabled={editingUser?.id === session?.user?.id}
            >
              <option value={Role.USER}>{t("user")}</option>
              <option value={Role.ADMIN}>{t("admin")}</option>
            </select>
          </div>
        )}
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
