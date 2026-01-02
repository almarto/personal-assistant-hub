import { ResendEmailProvider } from "./resend-provider";
import { IEmailService } from "./types";

const resendApiKey = process.env.RESEND_API_KEY || "";

// We can implement a factory if we want to support multiple providers based on env vars
// For now, we default to Resend
export const emailService: IEmailService = new ResendEmailProvider(resendApiKey);

export * from "./types";
