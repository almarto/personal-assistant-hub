"use client";

import clsx from "clsx";
import { Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { requestPasswordResetToken, resetPasswordWithToken } from "@/app/actions/admin-users";
import { useRouter } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/systemUI/components/Button/Button";

import styles from "../auth.module.css";

export default function SignInForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isRestoringPassword, setIsRestoringPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [isRequestingReset, setIsRequestingReset] = useState(false);
  const [isTokenSent, setIsTokenSent] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Auth");
  const tErrors = useTranslations("AuthErrors");

  const callbackUrl = searchParams.get("callbackUrl");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    await authClient.signIn.username(
      {
        username,
        password,
      },
      {
        onSuccess: () => {
          // Ensure callbackUrl is a relative path to prevent open redirects
          if (
            callbackUrl &&
            callbackUrl.startsWith("/") &&
            !callbackUrl.startsWith("//")
          ) {
            router.push(callbackUrl);
          } else {
            router.push("/");
          }
          router.refresh();
        },
        onError: (ctx) => {
          const code =
            ctx.error.code ||
            (ctx.error as { body?: { code?: string } }).body?.code;
          if (code && tErrors.has(code)) {
            setError(tErrors(code));
          } else {
            setError(tErrors("default"));
          }
          setLoading(false);
        },
      }
    );
  };

  const handleRequestResetToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setError(tErrors("EMAIL_REQUIRED"));
      return;
    }
    setIsRequestingReset(true);
    setError(null);
    const res = await requestPasswordResetToken(resetEmail);
    setIsRequestingReset(false);
    if (res.success) {
      setIsTokenSent(true);
    } else {
      setError(res.error || tErrors("default"));
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await resetPasswordWithToken(resetEmail, resetToken, newPassword);
    setLoading(false);
    if (res.success) {
      setIsRestoringPassword(false);
      setIsTokenSent(false);
      setResetEmail("");
      setResetToken("");
      setNewPassword("");
      setUsername(resetEmail);
      setError("Contraseña actualizada exitosamente. Por favor, inicia sesión.");
    } else {
      setError(res.error || tErrors("default"));
    }
  };

  if (isRestoringPassword) {
    if (isTokenSent) {
      return (
        <>
          {error && <div className={styles.error}>{error}</div>}
          <form onSubmit={handleResetPasswordSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="displayEmail" className={styles.label}>Correo Electrónico</label>
              <input
                id="displayEmail"
                type="email"
                value={resetEmail}
                disabled
                className={clsx(styles.input, styles.disabledInput)}
                style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="resetToken" className={styles.label}>Código de verificación (6 dígitos)</label>
              <input
                id="resetToken"
                type="text"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                className={styles.input}
                required
                maxLength={6}
                placeholder="123456"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="newPassword" className={styles.label}>Nueva Contraseña</label>
              <div className={styles.passwordWrapper}>
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={clsx(styles.input, styles.passwordInput)}
                  required
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <Button type="submit" isLoading={loading}>Guardar Nueva Contraseña</Button>
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <button 
                type="button" 
                onClick={() => setIsTokenSent(false)} 
                style={{ fontSize: '0.875rem', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Volver
              </button>
            </div>
          </form>
        </>
      );
    }

    return (
      <>
        {error && <div className={styles.error}>{error}</div>}
        <form onSubmit={handleRequestResetToken} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="resetEmail" className={styles.label}>Correo Electrónico</label>
            <input
              id="resetEmail"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className={styles.input}
              required
              placeholder="tu@correo.com"
            />
          </div>
          <Button type="submit" isLoading={isRequestingReset}>Enviar Código de Verificación</Button>
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <button 
              type="button" 
              onClick={() => setIsRestoringPassword(false)} 
              style={{ fontSize: '0.875rem', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Volver al inicio de sesión
            </button>
          </div>
        </form>
      </>
    );
  }

  return (
    <>
      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleSignIn} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="username" className={styles.label}>
            {t("username")}
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label htmlFor="password" className={styles.label} style={{ marginBottom: 0 }}>
              {t("password")}
            </label>
            <button 
              type="button" 
              onClick={() => {
                setIsRestoringPassword(true);
                setError(null);
              }}
              style={{ fontSize: '0.875rem', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          <div className={styles.passwordWrapper}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={clsx(styles.input, styles.passwordInput)}
              required
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

        <Button type="submit" isLoading={loading}>
          {t("signInButton")}
        </Button>
      </form>
    </>
  );
}
