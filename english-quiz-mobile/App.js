import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { UserProvider } from "./src/context/UserContext";
import { NotificationProvider } from "./src/components/NotificationCenter";
import { TouchableOpacity , Text} from "react-native";
// Screens
import HomeScreen from "./src/screens/HomeScreen";
import QuizScreen from "./src/screens/QuizScreen";
import ChatScreen from "./src/screens/ChatScreen";
import HistoryScreen from "./src/screens/HistoryScreen_New";
import TranscribeScreen from "./src/screens/TranscribeScreen";

import PracticeScreen from "./src/screens/PracticeScreen";
const Stack = createNativeStackNavigator();




const linking = {
  prefixes: ["http://localhost:8081", "englishquiz://"],
  config: {
    screens: {
      Home: "",
      Quiz: "quiz",
      Chat: "chat",
      History: "history",
    },
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <NotificationProvider>
          <NavigationContainer linking={linking}>
            <StatusBar style="light" />
            <Stack.Navigator
              initialRouteName="Home"
              screenOptions={{
                headerStyle: {
                  backgroundColor: "#1F2937",
                },
                headerTintColor: "#FFFFFF",
                headerTitleStyle: {
                  fontWeight: "bold",
                },
                contentStyle: {
                  backgroundColor: "#111827",
                },
              }}
            >
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ title: "English Quiz Master" }}
              />

              <Stack.Screen
                name="Practice"
                component={PracticeScreen}
                options={{ title: "Practice"}}
              />


              <Stack.Screen
                name="Quiz"
                component={QuizScreen}
                options={{ title: "Quiz Mode" }}
              />
              <Stack.Screen
                name="Chat"
                component={ChatScreen}
                options={{ title: "Chat with Tutor" }}
              />
              <Stack.Screen
                name="History"
                component={HistoryScreen}
                options={{ title: "My History" }}
              />
              <Stack.Screen
                name="Transcribe"
                component={TranscribeScreen}
                options={{ title: "Transcribe" }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </NotificationProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}
