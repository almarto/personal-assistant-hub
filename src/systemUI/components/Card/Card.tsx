import clsx from "clsx";
import React from "react";

import styles from "./Card.module.css";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(styles.card, styles[variant], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
