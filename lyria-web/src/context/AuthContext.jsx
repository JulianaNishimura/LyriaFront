import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin } from '../services/LyriaApi';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionCheckInterval, setSessionCheckInterval] = useState(null);

  /**
   * Limpa todos os dados de autenticação
   */
  const clearAuthData = useCallback(() => {
    console.log('🧹 Limpando dados de autenticação...');
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('lyriaUser');
    localStorage.removeItem('lyriaPersona');
    localStorage.removeItem('lyriaVoice');
    localStorage.removeItem('lastSessionCheck');
  }, []);

  /**
   * Verifica a sessão no backend
   */
  const checkSession = useCallback(async (showLogs = true) => {
    try {
      if (showLogs) console.log('🔍 Verificando sessão no backend...');
      
      const response = await api.get('/Lyria/check-session');
      
      if (response.data.autenticado) {
        if (showLogs) console.log('✅ Sessão ativa:', response.data);
        
        // Recupera ou cria dados do usuário
        const storedUser = localStorage.getItem('lyriaUser');
        const userData = storedUser ? JSON.parse(storedUser) : {
          nome: response.data.usuario,
          email: response.data.email,
        };
        
        setUser(userData);
        setIsAuthenticated(true);
        
        // Atualiza timestamp da última verificação
        localStorage.setItem('lastSessionCheck', Date.now().toString());
        
        return true;
      } else {
        if (showLogs) console.log('❌ Sessão não autenticada');
        clearAuthData();
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao verificar sessão:', error);
      
      // Se for erro 401 (não autorizado), limpa tudo
      if (error.response?.status === 401) {
        clearAuthData();
        return false;
      }
      
      // Para outros erros, mantém o estado atual se houver usuário
      if (!user) {
        clearAuthData();
      }
      
      return false;
    }
  }, [user, clearAuthData]);

  /**
   * Verifica a sessão periodicamente
   */
  useEffect(() => {
    // Verifica a cada 5 minutos
    const interval = setInterval(() => {
      checkSession(false);
    }, 5 * 60 * 1000);

    setSessionCheckInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [checkSession]);

  /**
   * Verifica sessão ao montar o componente
   */
  useEffect(() => {
    const initAuth = async () => {
      await checkSession(true);
      setLoading(false);
    };

    initAuth();
  }, []);

  /**
   * Interceptor para detectar erros 401
   */
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Se receber 401 e estiver autenticado, a sessão expirou
        if (error.response?.status === 401 && isAuthenticated) {
          console.warn('⚠️ Sessão expirada detectada via interceptor');
          
          clearAuthData();
          
          // Retorna o erro para que seja tratado pelo componente
          error.sessionExpired = true;
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [isAuthenticated, clearAuthData]);

  /**
   * Função de login
   */
  const login = async (credentials) => {
    try {
      console.log('🔐 Iniciando login...');
      const response = await apiLogin(credentials);
      
      if (response.status === 'ok') {
        // Aguarda para garantir que o cookie foi salvo
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Verifica se a sessão foi criada
        console.log('🔍 Verificando se sessão foi criada...');
        const sessionCheck = await api.get('/Lyria/check-session');
        console.log('📋 Resposta da verificação:', sessionCheck.data);
        
        if (!sessionCheck.data.autenticado) {
          console.error('❌ Sessão não foi criada no backend!');
          throw new Error('Falha ao criar sessão. Tente novamente.');
        }
        
        const userData = {
          nome: response.usuario,
          email: credentials.email,
          persona: response.persona
        };
        
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem('lyriaUser', JSON.stringify(userData));
        localStorage.setItem('lastSessionCheck', Date.now().toString());
        
        console.log('✅ Login completo e sessão verificada:', userData);
        return response;
      }
      
      return response;
    } catch (error) {
      console.error('❌ Erro no login:', error);
      clearAuthData();
      throw error;
    }
  };

  /**
   * Função de logout
   */
  const logout = async () => {
    try {
      console.log('🚪 Fazendo logout...');
      await api.post('/Lyria/logout');
      console.log('✅ Logout no backend concluído');
    } catch (error) {
      console.error('❌ Erro ao fazer logout no backend:', error);
    } finally {
      clearAuthData();
      
      // Limpa o intervalo de verificação
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        setSessionCheckInterval(null);
      }
      
      console.log('✅ Dados locais limpos');
    }
  };

  /**
   * Atualiza os dados do usuário
   */
  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('lyriaUser', JSON.stringify(userData));
  };

  /**
   * Força uma verificação de sessão manual
   */
  const validateSession = async () => {
    return await checkSession(true);
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isAuthenticated, 
        login, 
        logout, 
        updateUser,
        loading,
        validateSession,
        checkSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};