import { APIError, betterAuth, type BetterAuthPlugin } from "better-auth";
import { admin,username } from "better-auth/plugins";
import { Pool } from "pg";

import { isStrongPassword } from "@/lib/utils/password";

const passwordValidator = {
  id: "password-validator",
  hooks: {
    before: [
      {
        matcher: (context: { path?: string }) =>
          context.path === "/sign-up/email" ||
          context.path === "/admin/create-user" ||
          context.path === "/admin/set-user-password",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async (ctx: any) => {
          const body = ctx.body;
          if (!body) return { context: ctx };
          const password = body.password || body.newPassword;
          if (password) {
            if (!isStrongPassword(password)) {
              throw new APIError("BAD_REQUEST", {
                message: "PASSWORD_REQUIREMENTS_NOT_MET",
              });
            }
          }
          return { context: ctx };
        },
      },
    ],
  },
} satisfies BetterAuthPlugin;

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    username(),
    admin(),
    passwordValidator,
  ],
  socialProviders: {
    // Add providers here if needed
  },
});
