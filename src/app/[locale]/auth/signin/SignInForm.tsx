"use client";

import clsx from "clsx";
import { Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

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
          <label htmlFor="password" className={styles.label}>
            {t("password")}
          </label>
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
