"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api-client";
import { isApiMode } from "@/lib/api-config";
import type { AccountSession, AccountProfile } from "@/lib/account";

type State = {
  session: AccountSession | null;
  profile: AccountProfile | null;
  error: string;
  loading: boolean;
};
const Context = createContext<
  (State & { demo: boolean; reload: () => Promise<void> }) | null
>(null);
export function AccountSessionProvider({ children }: { children: ReactNode }) {
  const demo = !isApiMode();
  const [state, setState] = useState<State>({
    session: null,
    profile: null,
    error: "",
    loading: true,
  });
  const reload = useCallback(async () => {
    if (demo) {
      setState({
        session: {
          user: {
            id: "demo",
            nombre: "Demo local",
            email: "Demostración",
            role: "visitante",
          },
          actor: null,
        },
        profile: null,
        error: "",
        loading: false,
      });
      return;
    }
    try {
      const session = await api.getSession();
      const profile = await api.getAccountProfile().catch(() => null);
      setState({
        session,
        profile,
        error: profile ? "" : "No pudimos cargar los datos de tu cuenta.",
        loading: false,
      });
    } catch {
      setState({
        session: null,
        profile: null,
        error: "No pudimos cargar tu cuenta.",
        loading: false,
      });
    }
  }, [demo]);
  useEffect(() => {
    const timer = setTimeout(() => void reload(), 0);
    return () => clearTimeout(timer);
  }, [reload]);
  return (
    <Context.Provider value={{ ...state, demo, reload }}>
      {children}
    </Context.Provider>
  );
}
export function useAccountSession() {
  const context = useContext(Context);
  if (!context) throw new Error("La cuenta requiere AccountSessionProvider.");
  return context;
}
