import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_ID_KEY = '@english_quiz_user_id';
const USER_DATA_KEY = '@english_quiz_user_data';

const UserContext = createContext(null);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [userId, setUserIdState] = useState('');
  const [userData, setUserData] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load user data from storage on mount
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const [storedUserId, storedUserData] = await Promise.all([
        AsyncStorage.getItem(USER_ID_KEY),
        AsyncStorage.getItem(USER_DATA_KEY),
      ]);

      if (storedUserId) {
        setUserIdState(storedUserId);
      }

      if (storedUserData) {
        const parsed = JSON.parse(storedUserData);
        setUserData(parsed);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setUserId = async (newUserId) => {
    try {
      await AsyncStorage.setItem(USER_ID_KEY, newUserId);
      setUserIdState(newUserId);
    } catch (error) {
      console.error('Error saving user ID:', error);
    }
  };

  const login = async (user) => {
    try {
      const id = user._id || user.id || '';
      await AsyncStorage.setItem(USER_ID_KEY, id);
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
      setUserIdState(id);
      setUserData(user);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error saving login data:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([USER_ID_KEY, USER_DATA_KEY]);
      setUserIdState('');
      setUserData(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  };

  const clearUserId = async () => {
    try {
      await AsyncStorage.removeItem(USER_ID_KEY);
      setUserIdState('');
    } catch (error) {
      console.error('Error clearing user ID:', error);
    }
  };

  return (
    <UserContext.Provider
      value={{
        userId,
        userData,
        isAuthenticated,
        setUserId,
        login,
        logout,
        clearUserId,
        isLoading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;
