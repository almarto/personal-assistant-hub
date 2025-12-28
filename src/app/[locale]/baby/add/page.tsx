"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { Link, useRouter } from "@/i18n/routing";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";
import Navigation from "@/systemUI/components/Navigation/Navigation";

import styles from "../baby.module.css";

export default function AddBaby() {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations("Baby");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("birthDate", birthDate);

      const response = await fetch("/api/babies", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to add baby");
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(t("error"));
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          Baby Food Tracker
        </Link>
        <Navigation showLogout={true} />
      </header>
      
      <Card className={styles.card} variant="elevated">
        <h1 className={styles.title}>{t("addBaby")}</h1>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
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
            <label htmlFor="birthDate" className={styles.label}>
              {t("birthDate")}
            </label>
            <input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          <Button type="submit" isLoading={loading}>
            {t("save")}
          </Button>
        </form>

        <div className={styles.backLink}>
          <Link href="/">
            <Button variant="ghost" leftIcon={<ArrowLeft size={16} />}>
              Back
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
