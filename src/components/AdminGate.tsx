import type { ReactNode } from 'react';
import { PasswordGate } from './PasswordGate';

export function AdminGate({ children }: { children: ReactNode }) {
  return (
    <PasswordGate
      password={import.meta.env.VITE_ADMIN_PASSWORD}
      storageKey="mesita_fiuba_admin_auth_ok"
      titulo="Admin"
    >
      {children}
    </PasswordGate>
  );
}
