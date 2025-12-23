"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../auth.module.css";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    await authClient.signUp.email({
      email,
      password,
      name,
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
        <h1 className={styles.title}>Create Account</h1>
        
        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSignUp} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.label}>Name</label>
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
            <label htmlFor="email" className={styles.label}>Email</label>
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
            <label htmlFor="password" className={styles.label}>Password</label>
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
            Sign Up
          </Button>
        </form>

        <div className={styles.footer}>
          Already have an account?{" "}
          <Link href="/auth/signin" className={styles.link}>
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}
