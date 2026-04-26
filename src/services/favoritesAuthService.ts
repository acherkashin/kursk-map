import type { Session, User } from "@supabase/supabase-js";
import type { AppUser } from "../types";
import { getSupabaseClient } from "./supabaseClient";

function toAppUser(user: User | null | undefined): AppUser | null {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
  };
}

function getSessionUser(session: Session | null): AppUser | null {
  return toAppUser(session?.user);
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return getSessionUser(data.session);
}

export function subscribeToAuthChanges(onUserChange: (user: AppUser | null) => void): () => void {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return () => undefined;
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    onUserChange(getSessionUser(session));
  });

  return () => {
    subscription.unsubscribe();
  };
}

export async function sendMagicLink(email: string, redirectTo: string): Promise<void> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    throw error;
  }
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function loadFavoritePlaceIds(userId: string): Promise<number[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("favorite_places")
    .select("place_id")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return data.map(({ place_id }) => place_id);
}

export async function addFavoritePlace(userId: string, placeId: number): Promise<void> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase.from("favorite_places").insert({
    user_id: userId,
    place_id: placeId,
  });

  if (error) {
    throw error;
  }
}

export async function removeFavoritePlace(userId: string, placeId: number): Promise<void> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase
    .from("favorite_places")
    .delete()
    .eq("user_id", userId)
    .eq("place_id", placeId);

  if (error) {
    throw error;
  }
}
