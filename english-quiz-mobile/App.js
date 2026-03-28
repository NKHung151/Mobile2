import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { UserProvider } from "./src/context/UserContext";
import { NotificationProvider } from "./src/components/NotificationCenter";

// Screens
import HomeScreen from "./src/screens/HomeScreen";
import QuizScreen from "./src/screens/QuizScreen";
import ChatScreen from "./src/screens/ChatScreen";
import HistoryScreen from "./src/screens/HistoryScreen_New";
import TranscribeScreen from "./src/screens/TranscribeScreen";
import LibraryScreen from "./src/screens/LibraryScreen";
import CourseDetailScreen from "./src/screens/CourseDetailScreen";
import CourseDetailFocusModeScreen from "./src/screens/CourseDetailFocusModeScreen";
import AddCourseScreen from "./src/screens/AddCourseScreen";
import EditCourseScreen from "./src/screens/EditCourseScreen";
import ImportExcelScreen from "./src/screens/ImportExcelScreen";

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: ["http://localhost:8081", "englishquiz://"],
  config: {
    screens: {
      Home: "",
      Quiz: "quiz",
      Chat: "chat",
      History: "history",
      Library: "library",
      CourseDetail: "course/:courseId",
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
              <Stack.Screen name="Home" component={HomeScreen} options={{ title: "English Quiz Master" }} />
              <Stack.Screen name="Quiz" component={QuizScreen} options={{ title: "Quiz Mode" }} />
              <Stack.Screen name="Chat" component={ChatScreen} options={{ title: "Chat with Tutor" }} />
              <Stack.Screen name="History" component={HistoryScreen} options={{ title: "My History" }} />
              <Stack.Screen name="Transcribe" component={TranscribeScreen} options={{ title: "Transcribe" }} />
              <Stack.Screen name="Library" component={LibraryScreen} options={{ title: "Library" }} />
              <Stack.Screen name="CourseDetail" component={CourseDetailScreen} options={{ headerShown: false }} />
              <Stack.Screen name="CourseDetailFocusMode" component={CourseDetailFocusModeScreen} options={{ headerShown: false }} />
              <Stack.Screen name="AddCourse" component={AddCourseScreen} options={{ headerShown: false }} />
              <Stack.Screen name="EditCourse" component={EditCourseScreen} options={{ headerShown: false }} />
              <Stack.Screen name="ImportExcel" component={ImportExcelScreen} options={{ headerShown: false }} />
            </Stack.Navigator>
          </NavigationContainer>
        </NotificationProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}
