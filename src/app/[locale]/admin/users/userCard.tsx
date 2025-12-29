"use client";

import { Trash2, Edit2, Shield, User } from "lucide-react";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";
import styles from "./page.module.css";
import { Role } from "@/lib/types/roles";
import { User as UserType } from "./types";

type UserCardProps = {
  user: UserType;
  handleEditClick: (user: UserType) => void;
  handleDeleteUser: (userId: string) => void;
};

export const UserCard = ({
  user,
  handleEditClick,
  handleDeleteUser,
}: UserCardProps) => {
  return (
    <Card key={user.id} className={styles.userCard}>
      <div className={styles.userInfo}>
        <div className={styles.avatar}>
          {user.role === Role.ADMIN ? <Shield size={24} /> : <User size={24} />}
        </div>
        <div className={styles.userDetails}>
          <h3 className={styles.userName}>{user.username}</h3>
          <p className={styles.email}>{user.email}</p>
          <span className={styles.role}>{user.role || Role.USER}</span>
        </div>
      </div>
      <div className={styles.actions}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleEditClick(user)}
          className={styles.editButton}
        >
          <Edit2 size={16} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDeleteUser(user.id)}
          className={styles.deleteButton}
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </Card>
  );
};
