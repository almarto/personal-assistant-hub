"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { updateBabyAction } from "@/app/actions/baby";
import { Link, useRouter } from "@/i18n/routing";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";

import styles from "../../baby.module.css";

interface EditBabyFormProps {
  babyId: string;
  initialName: string;
  initialBirthDate: string;
}

export default function EditBabyForm({
  babyId,
  initialName,
  initialBirthDate,
}: EditBabyFormProps) {
  const [name, setName] = useState(initialName);
  const [birthDate, setBirthDate] = useState(
    initialBirthDate ? new Date(initialBirthDate).toISOString().split("T")[0] : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations("Baby");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await updateBabyAction(babyId, { name, birthDate });

    if (result.success) {
      router.push(`/baby/${babyId}`);
      router.refresh();
    } else {
      setError(result.error || t("error"));
      setLoading(false);
    }
  };

  return (
    <Card className={styles.card} variant="elevated">
      <h1 className={styles.title}>{t("editBaby")}</h1>

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
        <Link href={`/baby/${babyId}`}>
          <Button variant="ghost" leftIcon={<ArrowLeft size={16} />}>
            {t("cancel")}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
