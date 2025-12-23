"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";
import { Link, useRouter } from "@/i18n/routing";
import styles from "../auth.module.css";
import { useTranslations } from "next-intl";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations('Auth');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    await authClient.signIn.email({
      email,
      password,
    }, {
      onSuccess: () => {
          router.push("/");
          router.refresh();
      },
      onError: (ctx) => {
          setError(ctx.error.message);
          setLoading(false);
      }
    });
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card} variant="elevated">
        <h1 className={styles.title}>{t('signIn')}</h1>
        
        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSignIn} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>{t('email')}</label>
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
            <label htmlFor="password" className={styles.label}>{t('password')}</label>
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
            {t('signInButton')}
          </Button>
        </form>

        <div className={styles.footer}>
          {t('noAccount')}{" "}
          <Link href="/auth/signup" className={styles.link}>
            {t('signUp')}
          </Link>
        </div>
      </Card>
    </div>
  );
}