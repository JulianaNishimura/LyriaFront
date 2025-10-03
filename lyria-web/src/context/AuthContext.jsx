import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin } from '../services/LyriaApi';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Carregar dados do usuário do localStorage ao iniciar
  useEffect(() => {
    const loadUserFromStorage = () => {
      try {
        const storedUser = localStorage.getItem('lyriaUser');
        
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        localStorage.removeItem('lyriaUser');
      } finally {
        setLoading(false);
      }
    };

    loadUserFromStorage();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await apiLogin(credentials);
      
      // O backend retorna status: "ok", não sucesso
      if (response.status === 'ok') {
        // Criar objeto de usuário com os dados retornados
        const userData = {
          nome: response.usuario,  // backend retorna string do nome
          email: credentials.email,
          persona: response.persona
        };
        
        // Salva os dados no state
        setUser(userData);
        setIsAuthenticated(true);
        
        // Salva no localStorage para persistência
        localStorage.setItem('lyriaUser', JSON.stringify(userData));
        
        console.log('✅ Login bem-sucedido, usuário salvo:', userData);
        
        return response;
      }
      
      return response;
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Chama o endpoint de logout para limpar a sessão no servidor
      await fetch('https://lyria-back.onrender.com/Lyria/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      // Limpa os dados locais de qualquer forma
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('lyriaUser');
      localStorage.removeItem('lyriaPersona');
      localStorage.removeItem('lyriaVoice');
      console.log('✅ Logout realizado, dados limpos');
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('lyriaUser', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isAuthenticated, 
        login, 
        logout, 
        updateUser,
        loading 
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