"use server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth-guards";
import { emailService } from "@/lib/services/email";
import { generateWelcomeEmailHtml } from "@/lib/services/email/templates/welcome";
import { AppError } from "@/lib/types/errors";
import { Role } from "@/lib/types/roles";
import { generatePassword } from "@/lib/utils/password";

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
      loginUrl: `${appUrl}/es/profile`,
    });

    const { error: emailError } = await emailService.sendEmail({
      to: [data.email],
      subject: "Bienvenido a Baby Food Tracker",
      text: `¡Bienvenido a Baby Food Tracker!\n\nAquí están tus detalles de inicio de sesión:\nEnlace: ${appUrl}\nNombre de usuario: ${data.username}\nContraseña: ${password}\n\nPor favor cambia tu contraseña después de iniciar sesión.`,
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
  } catch (error: unknown) {
    const appError = error as AppError;
    console.error("Error creating user:", appError);

    // Handle specific auth errors
    if (appError.message === "Unauthorized: Admin access required") {
      return { success: false, error: "Unauthorized" };
    }

    // Better auth error handling
    if (appError.body?.message) {
      return { success: false, error: appError.body.message };
    }
    return {
      success: false,
      error: appError.message || "Failed to create user",
    };
  }
}
