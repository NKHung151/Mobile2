import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { UserProvider } from "./src/context/UserContext";
import { NotificationProvider } from "./src/components/NotificationCenter";
import ErrorBoundary from "./src/components/ErrorBoundary";

// Screens
import HomeScreen from "./src/screens/HomeScreen";
import QuizScreen from "./src/screens/QuizScreen";
import ChatScreen from "./src/screens/ChatScreen";
import HistoryScreen from "./src/screens/HistoryScreen_New";
import HomophoneGroupsScreen from "./src/screens/HomophoneGroupsScreen";
import ListeningPart2Screen from "./src/screens/ListeningPart2Screen";

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
    <ErrorBoundary>
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
                  name="HomophoneGroups"
                  component={HomophoneGroupsScreen}
                  options={{ title: "Homophone Groups" }}
                />
                <Stack.Screen
                  name="ListeningPart2"
                  component={ListeningPart2Screen}
                  options={{ title: "Listening Part 2" }}
                />

              </Stack.Navigator>
            </NavigationContainer>
          </NotificationProvider>
        </UserProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
