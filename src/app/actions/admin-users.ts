"use server";

import { auth } from "@/lib/auth";
import { Role } from "@/lib/types/roles";
import { emailService } from "@/lib/services/email";
import { generateWelcomeEmailHtml } from "@/lib/services/email/templates/welcome";
import { generatePassword } from "@/lib/utils/password";
import { requireAdmin } from "@/lib/auth-guards";
import { headers } from "next/headers";

interface CreateUserData {
  name: string;
  email: string;
  username: string;
  role: Role;
}

async function getBaseUrl() {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || "http";
  return `${protocol}://${host}`;
}

export async function createUserAndNotify(data: CreateUserData) {
  try {
    await requireAdmin();

    const appUrl = await getBaseUrl();
    const password = generatePassword();

    // Create user using better-auth api
    const newUser = await auth.api.createUser({
      body: {
        name: data.name,
        email: data.email,
        password: password,
        role: data.role,
        data: {
          username: data.username,
        },
      },
    });

    if (!newUser) {
      return { success: false, error: "Failed to create user" };
    }

    // Send email
    const emailHtml = generateWelcomeEmailHtml({
      name: data.name,
      username: data.username,
      password: password,
      loginUrl: appUrl,
    });

    const { error: emailError } = await emailService.sendEmail({
      to: [data.email],
      subject: "Welcome to Baby Food Tracker",
      text: `Welcome to Baby Food Tracker!\n\nHere are your login details:\nLink: ${appUrl}\nUsername: ${data.username}\nPassword: ${password}\n\nPlease change your password after logging in.`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Failed to send welcome email:", emailError);
      return { 
        success: true, 
        warning: "User created but email failed to send",
        generatedPassword: password 
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error creating user:", error);
    
    // Handle specific auth errors
    if (error.message === "Unauthorized: Admin access required") {
        return { success: false, error: "Unauthorized" };
    }

    // Better auth error handling
    if (error.body?.message) {
      return { success: false, error: error.body.message };
    }
    return { success: false, error: error.message || "Failed to create user" };
  }
}
