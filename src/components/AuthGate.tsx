import type { ReactNode } from 'react';
import { PasswordGate } from './PasswordGate';

export function AuthGate({ children }: { children: ReactNode }) {
  return (
    <PasswordGate
      password={import.meta.env.VITE_APP_PASSWORD}
      storageKey="mesita_fiuba_auth_ok"
      titulo="Mesita FIUBA"
    >
      {children}
    </PasswordGate>
  );
}
