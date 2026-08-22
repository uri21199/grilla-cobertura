import { useState, type FormEvent, type ReactNode } from 'react';

interface PasswordGateProps {
  password: string;
  storageKey: string;
  titulo: string;
  children: ReactNode;
}

export function PasswordGate({ password, storageKey, titulo, children }: PasswordGateProps) {
  const [unlocked, setUnlocked] = useState(
    () => localStorage.getItem(storageKey) === 'ok'
  );
  const [input, setInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (input === password) {
      localStorage.setItem(storageKey, 'ok');
      setUnlocked(true);
    } else {
      setErrorMsg('Clave incorrecta');
    }
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-md"
      >
        <h1 className="mb-4 text-lg font-semibold text-slate-800">{titulo}</h1>
        <input
          type="password"
          autoFocus
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setErrorMsg('');
          }}
          placeholder="Clave de acceso"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none"
        />
        {errorMsg && (
          <p className="mt-2 text-sm text-red-600">{errorMsg}</p>
        )}
        <button
          type="submit"
          className="mt-4 w-full rounded-lg bg-blue-600 py-2 font-medium text-white active:bg-blue-700"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
