import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

/**
 * Componente que protege rotas que requerem autenticação
 * Redireciona para login se sessão expirar
 */
const ProtectedRoute = ({ children, requireAuth = true }) => {
  const { isAuthenticated, loading, validateSession } = useAuth();
  const { addToast } = useToast();
  const location = useLocation();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    const verifySession = async () => {
      console.log('[ProtectedRoute] Verificando sessão...', {
        requireAuth,
        loading,
        isAuthenticated
      });

      if (requireAuth && !loading) {
        const isValid = await validateSession();
        
        console.log('[ProtectedRoute] Resultado da validação:', isValid);
        
        if (!isValid) {
          console.warn('⚠️ Sessão inválida ou expirada detectada em ProtectedRoute');
          addToast('Sua sessão expirou. Por favor, faça login novamente.', 'error');
          setShouldRedirect(true);
        }
        
        setSessionChecked(true);
      } else if (!requireAuth) {
        setSessionChecked(true);
      }
    };

    verifySession();
  }, [requireAuth, loading, isAuthenticated, validateSession, addToast]);

  // Mostra loading enquanto verifica
  if (loading || (!sessionChecked && requireAuth)) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        color: 'white',
        background: 'transparent'
      }}>
        <div style={{
          background: 'rgba(13, 15, 47, 0.85)',
          padding: '2rem',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          Verificando autenticação...
        </div>
      </div>
    );
  }

  // Se requer autenticação e não está autenticado, redireciona
  if (requireAuth && (!isAuthenticated || shouldRedirect)) {
    console.log('🔒 Acesso negado - redirecionando para página inicial');
    return <Navigate to="/" state={{ from: location, sessionExpired: true }} replace />;
  }

  // Renderiza o componente filho
  return children;
};

export default ProtectedRoute;