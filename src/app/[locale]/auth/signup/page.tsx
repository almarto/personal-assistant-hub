"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Link, useRouter } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";

import styles from "../auth.module.css";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations("Auth");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    await authClient.signUp.email(
      {
        email,
        password,
        name,
      },
      {
        onSuccess: () => {
          router.push("/");
          router.refresh();
        },
        onError: (ctx) => {
          setError(ctx.error.message);
          setLoading(false);
        },
      }
    );
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card} variant="elevated">
        <h1 className={styles.title}>{t("signUp")}</h1>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSignUp} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.label}>
              {t("name")}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.input}
              required
            />
          </div>

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
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          <Button type="submit" isLoading={loading}>
            {t("signUpButton")}
          </Button>
        </form>

        <div className={styles.footer}>
          {t("hasAccount")}{" "}
          <Link href="/auth/signin" className={styles.link}>
            {t("signIn")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
