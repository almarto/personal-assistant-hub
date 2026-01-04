"use client";

import { Edit2, Shield, Trash2, User } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { hasRole,Role } from "@/lib/types/roles";
import { User as UserType } from "@/lib/types/user";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";

import styles from "./page.module.css";

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
  const { data: session } = authClient.useSession();

  const getRoleIcon = () => {
    if (hasRole(user.role, Role.ADMIN)) return <Shield size={24} />;
    return <User size={24} />;
  };

  return (
    <Card key={user.id} className={styles.userCard}>
      <div className={styles.userInfo}>
        <div className={styles.avatar}>{getRoleIcon()}</div>
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
          disabled={user.id === session?.user?.id}
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </Card>
  );
};
