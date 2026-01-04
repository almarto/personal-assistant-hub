import { Resend } from "resend";

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
      const payload: any = {
        from: options.from || this.defaultFrom,
        to: options.to,
        subject: options.subject,
      };

      if (options.text) payload.text = options.text;
      if (options.html) payload.html = options.html;

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
    } catch (error: any) {
      console.error("Unexpected error sending email:", error);
      return {
        success: false,
        error: error.message || "Unknown error occurred",
      };
    }
  }
}
