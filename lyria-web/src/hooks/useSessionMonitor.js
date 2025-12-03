import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

/**
 * Hook para monitorar a sessão do usuário e detectar expirações
 * Adiciona interceptor de erro para detectar 401 automaticamente
 */
export const useSessionMonitor = () => {
  const { isAuthenticated, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const hasShownExpiredMessage = useRef(false);

  /**
   * Manipula sessão expirada
   */
  const handleSessionExpired = useCallback(() => {
    if (hasShownExpiredMessage.current) return;
    
    console.warn('⚠️ SESSÃO EXPIRADA - Fazendo logout e redirecionando');
    hasShownExpiredMessage.current = true;
    
    // Faz logout
    logout();
    
    // Mostra mensagem
    addToast('Sua sessão expirou. Por favor, faça login novamente.', 'error');
    
    // Redireciona para a página inicial
    setTimeout(() => {
      navigate('/', { replace: true });
      hasShownExpiredMessage.current = false;
    }, 100);
  }, [logout, addToast, navigate]);

  /**
   * Configura interceptor de resposta
   */
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        // Detecta erro 401 (não autorizado) quando usuário está autenticado
        if (error.response?.status === 401 && isAuthenticated) {
          console.error('❌ Erro 401 detectado - Sessão expirada');
          handleSessionExpired();
        }
        
        return Promise.reject(error);
      }
    );

    // Limpa interceptor ao desmontar
    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [isAuthenticated, handleSessionExpired]);

  /**
   * Reseta a flag quando a autenticação mudar
   */
  useEffect(() => {
    if (isAuthenticated) {
      hasShownExpiredMessage.current = false;
    }
  }, [isAuthenticated]);

  return {
    handleSessionExpired
  };
};

export default useSessionMonitor;