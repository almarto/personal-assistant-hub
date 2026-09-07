import type { CSSProperties } from "react";

import styles from "./Skeleton.module.css";

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={className ? `${styles.block} ${className}` : styles.block} style={style} />;
}
