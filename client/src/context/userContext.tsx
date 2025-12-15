// src/context/userContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface UserContextType {
  user: any;
 // refreshUser: () => Promise<void>;
  displayName: string;
  avatarUrl: string | null;
  plan: "free" | "pro";
  uploads: number;
  createdAt: string | null;
  showAuthModal: boolean;
  setShowAuthModal: (v: boolean) => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  incrementUploads: () => Promise<void>;
  upgradePlan: () => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("User");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [uploads, setUploads] = useState(0);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  /* ---------------------------------------------------
   * INITIAL SESSION
   * --------------------------------------------------- */
const initializedRef = useRef(false);

useEffect(() => {
   if (initializedRef.current) return;         // <-- prevents double auth listener
    initializedRef.current = true;
    
  console.log("UserProvider mounted");
  const init = async () => {
    console.log("userContext: getSession…");
    const { data } = await supabase.auth.getSession();
    const currentUser = data?.session?.user ?? null;

    if (currentUser) {
      setUser(currentUser);
      await loadUserRow(currentUser.id);
    }
  };

  init();

  const { data: listener } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log("Auth event:", event);

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) await loadUserRow(currentUser.id);
      else
       resetState();
       
    }
  );

  return () => listener.subscription.unsubscribe();
}, []);


  /* ---------------------------------------------------
   * LOAD OR CREATE ROW
   * --------------------------------------------------- */
  const loadUserRow = async (userId: string) => {
    //console.log("loadUserRow:", userId);

    const { data, error } = await supabase
      .from("user_uploads")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
    // console.error("loadUserRow error:", error);
      return;
    }

    if (!data) {
      //console.log("Creating row…");

      const { data: inserted, error: insertErr } = await (supabase as any)
        .from("user_uploads")
        .insert({
          id: userId,
          name: "New User",
          avatar_url: null,
          uploads: 0,
          plan: "free",
        })
        .select()
        .maybeSingle();

      if (insertErr) {
        console.error("Insert failed:", insertErr);
        return;
      }

      applyUserRow(inserted);
      return;
    }

    applyUserRow(data);
  };

  /* ---------------------------------------------------
   * APPLY DATA
   * --------------------------------------------------- */
  const applyUserRow = (row: any) => {
    setDisplayName(row.name || "User");
    setAvatarUrl(row.avatar_url || null);
    setUploads(Number(row.uploads ?? 0));
    setPlan(row.plan === "pro" ? "pro" : "free");
    setCreatedAt(row.created_at ?? null);
  };

  /* ---------------------------------------------------
   * MUTATIONS
   * --------------------------------------------------- */
  const incrementUploads = async () => {
    if (!user) return;

    const newCount = uploads + 1;
    setUploads(newCount);

    const { error } = await (supabase as any)
      .from("user_uploads")
      .update({ uploads: newCount })
      .eq("id", user.id);

    if (error) console.error("incrementUploads failed:", error);
  };

  const upgradePlan = async () => {
    if (!user) return;

    setPlan("pro");

    const { error } = await (supabase as any)
      .from("user_uploads")
      .update({ plan: "pro" })
      .eq("id", user.id);

    if (error) console.error("upgradePlan failed:", error);
  };

  /* ---------------------------------------------------
   * LOGOUT  — WORKS 100% NOW
   * --------------------------------------------------- */
  const logout = async () => {
    //console.log("Logging out…");

    const { error } = await supabase.auth.signOut();
    if (error) console.error("signOut error:", error);

    // clear stale local keys
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("sb-") || key.includes("supabase")) {
        localStorage.removeItem(key);
      }
    });

    resetState();
  };

  const resetState = () => {
    setUser(null);
    setDisplayName("User");
    setAvatarUrl(null);
    setPlan("free");
    setUploads(0);
    setCreatedAt(null);
  };

//refresh user data
  // const refreshUser = async () => {
  //   const { data } = await supabase
  //     .from("user_uploads")
  //     .select("*")
  //     .eq("id", user?.id)
  //     .single();

  //   if (data) setUser(data);
  // };

  const betaAccess = user?.user_metadata?.beta_access === true;



  return (
    <UserContext.Provider
      value={{
        user : user ? { ...user, beta_access: betaAccess } : null,
        displayName,
        avatarUrl,
        plan,
        uploads,
        createdAt,
        showAuthModal,
       // refreshUser,
        setShowAuthModal,
        openAuthModal: () => setShowAuthModal(true),
        closeAuthModal: () => setShowAuthModal(false),
        incrementUploads,
        upgradePlan,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
};
