"use server";

import crypto from "crypto";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth-guards";
import { query } from "@/lib/db";
import { emailService } from "@/lib/services/email";
import { generatePasswordResetEmailHtml } from "@/lib/services/email/templates/password-reset";
import { generateWelcomeEmailHtml } from "@/lib/services/email/templates/welcome";
import { assignAppRole } from "@/lib/services/user-roles";
import { AppError } from "@/lib/types/errors";
import type { AppRole } from "@/lib/types/roles";
import { Role } from "@/lib/types/roles";
import { generatePassword, isStrongPassword } from "@/lib/utils/password";

interface CreateUserData {
  name: string;
  email: string;
  username: string;
  role: Role;
  appRoles?: AppRole[];
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

    // Assign app roles if provided
    if (data.appRoles?.length) {
      for (const appRole of data.appRoles) {
        await assignAppRole(newUser.user.id, appRole);
      }
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

export async function requestPasswordResetToken(email: string) {
  // Find user details by email
  const userResult = await query('SELECT id, name, email FROM "user" WHERE email = $1', [email]);
  const user = userResult.rows[0];

  if (!user) {
    return { success: false, error: "User not found" };
  }

  // Generate 6-digit token safely
  const token = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  try {
    const identifier = `password_reset_${email}`;
    await query('DELETE FROM "verification" WHERE identifier = $1', [identifier]);

    await query(
      `INSERT INTO "verification" (id, identifier, value, "expiresAt", "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [crypto.randomUUID(), identifier, token, expiresAt, new Date(), new Date()]
    );

    const emailHtml = generatePasswordResetEmailHtml({ name: user.name, token });
    const { error: emailError } = await emailService.sendEmail({
      to: [email],
      subject: "Personal Assistant Hub: Restablecer tu contraseña",
      text: `Tu código de verificación es: ${token}. Caduca en 5 minutos.`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Failed to send reset email:", emailError);
      return { success: false, error: "Failed to send reset email" };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to request password reset:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function resetPasswordWithToken(email: string, token: string, newPassword: string) {
  try {
    const identifier = `password_reset_${email}`;
    const tokenResult = await query(
      `SELECT * FROM "verification" WHERE identifier = $1 AND value = $2 AND "expiresAt" > NOW()`,
      [identifier, token]
    );

    if (tokenResult.rows.length === 0) {
      return { success: false, error: "Código inválido o expirado" };
    }

    const userResult = await query('SELECT id FROM "user" WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user) {
      return { success: false, error: "Usuario no encontrado" };
    }

    if (!isStrongPassword(newPassword)) {
      return { success: false, error: "PASSWORD_REQUIREMENTS_NOT_MET" };
    }

    // The emailed code is what authorizes this, so there's no session to act
    // as. Write the password directly instead of going through an admin route.
    try {
      const { password, internalAdapter } = await auth.$context;
      const hashedPassword = await password.hash(newPassword);

      if (await internalAdapter.findCredentialAccount(user.id)) {
        await internalAdapter.updatePassword(user.id, hashedPassword);
      } else {
        await internalAdapter.createAccount({
          userId: user.id,
          providerId: "credential",
          accountId: user.id,
          password: hashedPassword,
        });
      }

      // Invalidate the token
      await query('DELETE FROM "verification" WHERE identifier = $1', [identifier]);

      return { success: true };
    } catch (error: unknown) {
      const apiError = error as { message?: string };
      console.error("Set user password api error:", apiError);
      return { success: false, error: apiError?.message || "Error al actualizar la contraseña" };
    }
  } catch (error) {
    console.error("Failed to reset password:", error);
    return { success: false, error: "Un error inesperado ha ocurrido" };
  }
}
