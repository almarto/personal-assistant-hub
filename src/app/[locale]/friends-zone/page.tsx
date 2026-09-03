import { getTranslations } from "next-intl/server";

import styles from "./page.module.css";

export default async function FriendsZonePage() {
  const t = await getTranslations("FriendsZone");

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.subtitle}>{t("comingSoon")}</p>
    </div>
  );
}
