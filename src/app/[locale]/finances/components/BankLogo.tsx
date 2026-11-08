"use client";

import Image from "next/image";
import { useState } from "react";

import { bankInitials, bankTint } from "../format";
import styles from "./BankLogo.module.css";

/** The bank's logo, or an initials badge when it is missing or fails to load. */
export function BankLogo({
  name,
  logo,
  size,
}: {
  name: string;
  logo: string | null;
  size: number;
}) {
  const [failed, setFailed] = useState(false);
  const dimensions = { width: size, height: size };

  if (!logo || failed) {
    return (
      <span
        className={styles.initials}
        style={{
          ...dimensions,
          background: bankTint(name),
          fontSize: Math.round(size * 0.34),
        }}
        aria-hidden="true"
      >
        {bankInitials(name)}
      </span>
    );
  }

  return (
    <span className={styles.frame} style={dimensions}>
      <Image
        src={logo}
        alt=""
        width={size}
        height={size}
        unoptimized={false}
        className={styles.image}
        onError={() => setFailed(true)}
      />
    </span>
  );
}
