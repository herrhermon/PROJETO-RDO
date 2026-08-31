import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../lib/apiClient';
import { Button } from '../components/ui/Button';

export function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('admin@eqc.com.br');
  const [password, setPassword] = useState('Eqtec@123');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível entrar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#001524] text-white font-sans flex flex-col">
      <header className="flex justify-between items-center p-6 bg-eqc-900 shadow-md border-b border-blue-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center font-bold text-eqc-900 text-xl">EQC</div>
          <span className="text-xl font-light tracking-widest">ENGENHARIA</span>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white text-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-eqc-900 text-white rounded-lg flex items-center justify-center font-bold text-xl mx-auto mb-3">EQC</div>
            <h2 className="text-2xl font-bold text-gray-800">Acesso Restrito</h2>
            <p className="text-gray-500 text-sm">Intranet EQC Engenharia — Diário de Obras</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail Corporativo</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-eqc-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-eqc-900 outline-none"
              />
            </div>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-full py-3">
              {submitting ? 'Entrando...' : 'Entrar no Sistema'}
            </Button>
          </form>
          <p className="text-xs text-gray-400 mt-6 text-center">
            Usuários de demonstração: admin@eqc.com.br, editor@eqc.com.br, validador1/2/3@eqc.com.br — senha Eqtec@123
          </p>
        </div>
      </main>
    </div>
  );
}
