import { useTranslations } from "next-intl";

import { Card } from "@/systemUI/components/Card/Card";
import LanguageSwitcher from "@/systemUI/components/LanguageSwitcher/LanguageSwitcher";

import styles from "../auth.module.css";
import SignInForm from "./SignInForm";

export default function SignIn() {
  const t = useTranslations("Auth");

  return (
    <div className={styles.container}>
      <div className={styles.languageWrapper}>
        <LanguageSwitcher />
      </div>
      <Card className={styles.card} variant="elevated">
        <h1 className={styles.title}>{t("signIn")}</h1>
        <SignInForm />
      </Card>
    </div>
  );
}
