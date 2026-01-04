import clsx from "clsx";
import React from "react";

import styles from "./Badge.module.css";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "outline";
}

export const Badge = ({
  className,
  variant = "primary",
  children,
  ...props
}: BadgeProps) => {
  return (
    <span
      className={clsx(styles.badge, styles[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
};
