import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

// Avatar sticker options
export const AVATARS = [
  "🧑‍🎤", "👩‍🚀", "🧑‍✈️", "🧗", "🏄", "🚴", "🧑‍🍳", "🧙",
  "🦊", "🐼", "🐨", "🦁", "🐯", "🐸", "🦄", "🐧",
  "🌍", "🏔️", "🌴", "🗺️", "✈️", "🚀", "🎒", "⛺",
] as const;

export type AvatarOption = (typeof AVATARS)[number];

interface UserProfile {
  name: string;
  phone: string;
  avatar: AvatarOption;
  isLoggedIn: boolean;
  isLoading: boolean;
}

interface UserContextType extends UserProfile {
  setName: (name: string) => void;
  setPhone: (phone: string) => void;
  setAvatar: (avatar: AvatarOption) => void;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEY_AVATAR = "miniguide_avatar";
const STORAGE_KEY_NAME = "miniguide_name";
const STORAGE_KEY_PHONE = "miniguide_phone";

export function UserProvider({ children }: { children: ReactNode }) {
  const [name, setNameState] = useState(
    () => localStorage.getItem(STORAGE_KEY_NAME) || "Traveler"
  );
  const [phone, setPhoneState] = useState(
    () => localStorage.getItem(STORAGE_KEY_PHONE) || ""
  );
  const [avatar, setAvatarState] = useState<AvatarOption>(
    () => (localStorage.getItem(STORAGE_KEY_AVATAR) as AvatarOption) || "🧑‍✈️"
  );
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const setName = (n: string) => {
    setNameState(n);
    localStorage.setItem(STORAGE_KEY_NAME, n);
  };

  const setPhone = (p: string) => {
    setPhoneState(p);
    localStorage.setItem(STORAGE_KEY_PHONE, p);
  };

  const setAvatar = (a: AvatarOption) => {
    setAvatarState(a);
    localStorage.setItem(STORAGE_KEY_AVATAR, a);
  };

  const refreshUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
        const meta = user.user_metadata;
        if (meta?.full_name) setName(meta.full_name);
        if (meta?.phone_number) setPhone(meta.phone_number);
      } else {
        setIsLoggedIn(false);
      }
    } catch {
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user on mount and listen for auth changes
  useEffect(() => {
    refreshUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setIsLoggedIn(true);
          const meta = session.user.user_metadata;
          if (meta?.full_name) setName(meta.full_name);
          if (meta?.phone_number) setPhone(meta.phone_number);
        } else {
          setIsLoggedIn(false);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <UserContext.Provider
      value={{
        name,
        phone,
        avatar,
        isLoggedIn,
        isLoading,
        setName,
        setPhone,
        setAvatar,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}
