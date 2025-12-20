import { betterAuth } from "better-auth";

export const auth = betterAuth({
    database: {
        provider: "postgresql",
        url: process.env.DATABASE_URL,
    },
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        // Add providers here if needed
    },
});
