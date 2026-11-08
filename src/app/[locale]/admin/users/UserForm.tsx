"use client";

import clsx from "clsx";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  createUserAndNotify,
  requestPasswordResetToken,
  resetPasswordWithToken,
} from "@/app/actions/admin-users";
import { updateUserAppRoles } from "@/app/actions/user-roles";
import { authClient } from "@/lib/auth-client";
import type { AppRole } from "@/lib/types/roles";
import { APP_ROLE, isAdmin as checkIsAdmin, Role } from "@/lib/types/roles";
import { User } from "@/lib/types/user";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";
import { CheckboxChipGroup } from "@/systemUI/components/CheckboxChip/CheckboxChip";

import styles from "./page.module.css";
import type { UserFormValues } from "./user-form-state";
import { clearPasswordFields, isFormDirty } from "./user-form-state";

interface UserFormProps {
  editingUser: User | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function UserForm({ editingUser, onCancel, onSuccess }: UserFormProps) {
  const t = useTranslations("Admin");
  const tAuth = useTranslations("AuthErrors");
  const { data: session } = authClient.useSession();

  const isAdmin = checkIsAdmin(session?.user?.role);

  const initialValues: UserFormValues = {
    name: editingUser?.name || "",
    username: editingUser?.username || "",
    email: editingUser?.email || "",
    password: "",
    confirmPassword: "",
    currentPassword: "",
    role: (editingUser?.role as Role) || Role.USER,
    appRoles: (editingUser?.appRoles ?? []) as AppRole[],
  };
  const [formData, setFormData] = useState<UserFormValues>(initialValues);
  // What was last loaded or saved; Save is enabled only when the form differs.
  const [savedValues, setSavedValues] = useState<UserFormValues>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [isRestoringPassword, setIsRestoringPassword] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [isRequestingReset, setIsRequestingReset] = useState(false);

  const isCurrentUser = editingUser?.id === session?.user?.id;
  const isDirty = isFormDirty(formData, savedValues);

  const handleRequestResetToken = async () => {
    setIsRequestingReset(true);
    setError("");
    const res = await requestPasswordResetToken(formData.email);
    setIsRequestingReset(false);
    if (res.success) {
      setIsRestoringPassword(true);
      setFormData({ ...formData, currentPassword: "" });
    } else {
      setError(res.error || tAuth("default"));
    }
  };

  const markSaved = () => {
    const saved = clearPasswordFields(formData);
    setFormData(saved);
    setSavedValues(saved);
    setIsRestoringPassword(false);
    setResetToken("");
    setSuccessMessage(
      formData.password ? t("passwordUpdated") : t("changesSaved")
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !isDirty) return;
    setError("");
    setSuccessMessage("");

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

    setIsSubmitting(true);
    try {
      if (editingUser) {
        if (isAdmin) {
          // Admin updating user (or self)
          // Update name
          if (savedValues.name !== formData.name) {
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
          if (savedValues.role !== formData.role) {
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

          // Update app roles
          const rolesResult = await updateUserAppRoles(
            editingUser.id,
            formData.appRoles
          );
          if (!rolesResult.success) {
            setError(rolesResult.error || tAuth("default"));
            return;
          }
        } else if (isCurrentUser) {
          // Non-admin updating self
          // Update name
          if (savedValues.name !== formData.name) {
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
            if (isRestoringPassword) {
              if (!resetToken) {
                setError("El código de verificación es requerido");
                return;
              }
              const res = await resetPasswordWithToken(
                formData.email,
                resetToken,
                formData.password
              );
              if (!res.success) {
                setError(res.error || tAuth("default"));
                return;
              }
            } else {
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
        }
      } else {
        const result = await createUserAndNotify({
          name: formData.name,
          email: formData.email,
          username: formData.username,
          role: formData.role,
          appRoles: formData.appRoles,
        });

        if (!result.success) {
          setError(result.error || tAuth("default"));
          return;
        }
      }
      markSaved();
      onSuccess();
    } catch (error) {
      console.error("Failed to save user", error);
      setError(tAuth("default"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={styles.createForm}>
      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <div role="alert" className={styles.error}>
            {error}
          </div>
        )}
        {successMessage && !isDirty && (
          <div role="status" className={styles.success}>
            {successMessage}
          </div>
        )}
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

            {!isAdmin && formData.password && !isRestoringPassword && (
              <div className={styles.formGroup}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <label>{t("currentPassword")}</label>
                  <button
                    type="button"
                    onClick={handleRequestResetToken}
                    disabled={isRequestingReset}
                    style={{
                      fontSize: "0.875rem",
                      color: "#ff6b6b",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {isRequestingReset ? t("sending") : t("forgotPassword")}
                  </button>
                </div>
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

            {isRestoringPassword && (
              <>
                <div className={styles.formGroup}>
                  <label>Correo Electrónico</label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className={styles.input}
                    style={{
                      backgroundColor: "#f3f4f6",
                      cursor: "not-allowed",
                    }}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Código de verificación (6 dígitos)</label>
                  <input
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className={styles.input}
                    required
                    maxLength={6}
                    placeholder="123456"
                  />
                  <small
                    style={{
                      color: "#666",
                      marginTop: "4px",
                      display: "block",
                    }}
                  >
                    Te hemos enviado un código a tu correo electrónico.
                  </small>
                </div>
              </>
            )}
          </>
        )}
        {isAdmin && (
          <>
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
            <div className={styles.formGroup}>
              <label>{t("appRoles")}</label>
              <CheckboxChipGroup
                options={Object.entries(APP_ROLE).map(([key, value]) => ({
                  value,
                  label: t(`appRole_${key.toLowerCase()}`),
                }))}
                selected={formData.appRoles}
                onChange={(appRoles) => setFormData({ ...formData, appRoles })}
              />
            </div>
          </>
        )}
        <div className={styles.formActions}>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={!isDirty}
          >
            {editingUser ? t("save") : t("createUser")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
