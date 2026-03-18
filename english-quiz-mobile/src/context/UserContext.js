import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_ID_KEY = '@english_quiz_user_id';

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
  const [isLoading, setIsLoading] = useState(true);

  // Load user ID from storage on mount
  useEffect(() => {
    loadUserId();
  }, []);

  const loadUserId = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem(USER_ID_KEY);
      if (storedUserId) {
        setUserIdState(storedUserId);
      }
    } catch (error) {
      console.error('Error loading user ID:', error);
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
        setUserId,
        clearUserId,
        isLoading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;
