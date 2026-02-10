import { useEffect, useState } from "react";

import { getMyAppRoles } from "@/app/actions/user-roles";
import type { AppRole } from "@/lib/types/roles";

export function useAppRoles() {
  const [appRoles, setAppRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMyAppRoles()
      .then(setAppRoles)
      .catch(() => setAppRoles([]))
      .finally(() => setIsLoading(false));
  }, []);

  return { appRoles, isLoading };
}
