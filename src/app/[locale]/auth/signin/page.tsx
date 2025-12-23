"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import clsx from "clsx";

import { Link, useRouter } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";
import LanguageSwitcher from "@/systemUI/components/LanguageSwitcher/LanguageSwitcher";

import styles from "../auth.module.css";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations("Auth");
  const tErrors = useTranslations("AuthErrors");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    await authClient.signIn.email(
      {
        email,
        password,
      },
      {
        onSuccess: () => {
          router.push("/");
          router.refresh();
        },
        onError: (ctx) => {
          const code = ctx.error.code || (ctx.error as { body?: { code?: string } }).body?.code;
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
    <div className={styles.container}>
      <div className={styles.languageWrapper}>
        <LanguageSwitcher />
      </div>
      <Card className={styles.card} variant="elevated">
        <h1 className={styles.title}>{t("signIn")}</h1>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSignIn} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              {t("email")}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

        <div className={styles.footer}>
          {t("noAccount")}{" "}
          <Link href="/auth/signup" className={styles.link}>
            {t("signUp")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
