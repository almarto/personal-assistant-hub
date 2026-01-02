"use server";

import { auth } from "@/lib/auth";
import { Resend } from "resend";
import { headers } from "next/headers";
import { Role } from "@/lib/types/roles";

const resend = new Resend(process.env.RESEND_API_KEY);

function generatePassword() {
  const length = 12;
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*()_+~`|}{[]:;?><,./-=";

  const allChars = uppercase + lowercase + numbers + special;

  let password = "";
  // Ensure at least one of each required type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];

  // Fill the rest
  for (let i = 3; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => 0.5 - Math.random())
    .join("");
}

interface CreateUserData {
  name: string;
  email: string;
  username: string;
  role: Role;
}

export async function createUserAndNotify(data: CreateUserData) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || session.user.role !== "admin") {
      return { success: false, error: "Unauthorized" };
    }

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
    const { error: emailError } = await resend.emails.send({
      from: "Baby Food Tracker <no-reply@almarto.es>",
      to: [data.email],
      subject: "Welcome to Baby Food Tracker",
      text: `Welcome to Baby Food Tracker!\n\nHere are your login details:\nLink: https://almarto.es\nUsername: ${data.username}\nPassword: ${password}\n\nPlease change your password after logging in.`,
    });

    if (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // We don't fail the whole operation if email fails, but we should probably warn
      // But for now, let's just log it. The user is created.
      return { success: true, warning: "User created but email failed to send" };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error creating user:", error);
    // Better auth error handling
    if (error.body?.message) {
      return { success: false, error: error.body.message };
    }
    return { success: false, error: error.message || "Failed to create user" };
  }
}
