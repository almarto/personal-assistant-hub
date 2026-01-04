import { CreateEmailOptions, Resend } from "resend";

import { AppError } from "@/lib/types/errors";

import { IEmailService, SendEmailOptions, SendEmailResult } from "./types";

export class ResendEmailProvider implements IEmailService {
  private resend: Resend;
  private defaultFrom: string;

  constructor(apiKey: string, defaultFrom: string = "Baby Food Tracker <no-reply@almarto.es>") {
    if (!apiKey) {
      console.warn("Resend API key is missing. Email sending will fail.");
    }
    this.resend = new Resend(apiKey);
    this.defaultFrom = defaultFrom;
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const payload = {
        from: options.from || this.defaultFrom,
        to: options.to,
        subject: options.subject,
        ...(options.text ? { text: options.text } : {}),
        ...(options.html ? { html: options.html } : {}),
      } as CreateEmailOptions;

      if (!payload.text && !payload.html) {
          return {
              success: false,
              error: "Email must have either text or html content",
          };
      }

      const { data, error } = await this.resend.emails.send(payload);

      if (error) {
        console.error("Resend error:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        messageId: data?.id,
      };
    } catch (error: unknown) {
      const appError = error as AppError;
      console.error("Unexpected error sending email:", appError);
      return {
        success: false,
        error: appError.message || "Unknown error occurred",
      };
    }
  }
}
