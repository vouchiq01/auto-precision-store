'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { SignInDialog } from '@/components/layout/sign-in-dialog';

/**
 * One sign-in dialog for the whole storefront.
 *
 * It used to be owned by SiteChrome and reachable only through a prop on the
 * header, which meant anywhere else that wanted it — the cart, an account
 * prompt — had no way to ask. The dialog itself is unchanged; this just gives
 * everything below it a way to open the one instance rather than mounting a
 * second copy with its own state.
 */

interface SignInContextValue {
  openSignIn: () => void;
  signInOpen: boolean;
}

const SignInContext = createContext<SignInContextValue | null>(null);

export function SignInProvider({ children }: { children: ReactNode }) {
  const [signInOpen, setSignInOpen] = useState(false);
  const openSignIn = useCallback(() => setSignInOpen(true), []);
  const value = useMemo(() => ({ openSignIn, signInOpen }), [openSignIn, signInOpen]);

  return (
    <SignInContext.Provider value={value}>
      {children}
      <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} />
    </SignInContext.Provider>
  );
}

export function useSignIn(): SignInContextValue {
  const context = useContext(SignInContext);
  if (!context) throw new Error('useSignIn must be used inside <SignInProvider>');
  return context;
}
