import { APIError, betterAuth, type BetterAuthPlugin } from "better-auth";
import { admin,username } from "better-auth/plugins";
import { Pool } from "pg";

const passwordValidator = {
  id: "password-validator",
  hooks: {
    before: [
      {
        matcher: (context: { path: string }) =>
          context.path === "/sign-up/email" ||
          context.path === "/admin/create-user" ||
          context.path === "/admin/set-user-password",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async (ctx: any) => {
          // Check for admin secret authorization to allow programmatic admin access
          const authHeader = ctx.headers.get("authorization");
          if (authHeader === `Bearer ${process.env.BETTER_AUTH_ADMIN_SECRET}`) {
            ctx.context.session = {
              user: {
                id: "system",
                role: "admin",
                name: "System",
                email: "system@auth.local",
                emailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              session: {
                id: "system",
                userId: "system",
                expiresAt: new Date(Date.now() + 1000 * 60 * 60),
                token: "",
                createdAt: new Date(),
                updatedAt: new Date(),
                ipAddress: "",
                userAgent: "",
              },
            };
          }

          const body = ctx.body;
          if (!body) return { context: ctx };
          const password = body.password || body.newPassword;
          if (password) {
            const isValid =
              password.length >= 8 &&
              /[A-Z]/.test(password) &&
              /[a-z]/.test(password) &&
              /[0-9]/.test(password);
            if (!isValid) {
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
