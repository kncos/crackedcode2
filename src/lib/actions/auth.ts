"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { signIn, signOut } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

type ActionState = { error: string | null };

export async function signInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: "Invalid username or password." };
    }
    throw e; // re-throw NEXT_REDIRECT — Next.js needs this
  }
  return { error: null };
}

export async function signUpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const username = (formData.get("username") as string)?.trim();
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!username || !password) {
    return { error: "Username and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.name, username))
    .limit(1);

  if (existing) {
    return { error: "Username is already taken." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.insert(users).values({ name: username, passwordHash });

  await signIn("credentials", { username, password, redirectTo: "/" });

  redirect("/"); // unreachable — signIn throws NEXT_REDIRECT
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
