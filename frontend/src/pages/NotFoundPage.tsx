import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center gap-4">
      <h1 className="text-4xl font-bold text-eqc-900">404</h1>
      <p className="text-gray-500">Página não encontrada.</p>
      <Link to="/" className="text-eqc-900 font-medium hover:underline">
        Voltar ao início
      </Link>
    </div>
  );
}
