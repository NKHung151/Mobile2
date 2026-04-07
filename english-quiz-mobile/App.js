import React from "react";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { UserProvider, useUser } from "./src/context/UserContext";
import { NotificationProvider } from "./src/components/NotificationCenter";
import { COLORS } from "./src/constants/config";

// Screens
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import HomeScreen from "./src/screens/HomeScreen";
import QuizScreen from "./src/screens/QuizScreen";
import ChatScreen from "./src/screens/ChatScreen";
import HistoryScreen from "./src/screens/HistoryScreen_New";
import TranscribeScreen from "./src/screens/TranscribeScreen";
import PracticeScreen from "./src/screens/PracticeScreen";
import UserProfileScreen from "./src/screens/UserProfileScreen";
import ListVideoScreen from "./src/screens/ListVideoScreen";
import VideoScreen from "./src/screens/VideoScreen";
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
      Login: "login",
      Register: "register",
      Home: "",
      Quiz: "quiz",
      Chat: "chat",
      History: "history",
      UserProfile: "profile",
      Library: "library",
      CourseDetail: "course/:courseId",
    },
  },
};

function RootNavigator() {
  const { isAuthenticated, isLoading } = useUser();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <StatusBar style="light" />
      <Stack.Navigator
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
        {isAuthenticated ? (
          // App Stack - User is logged in
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: "English Quiz Master" }} />
            <Stack.Screen name="Practice" component={PracticeScreen} options={{ title: "Practice" }} />
            <Stack.Screen name="Quiz" component={QuizScreen} options={{ title: "Quiz Mode" }} />
            <Stack.Screen name="Chat" component={ChatScreen} options={{ title: "Chat with Tutor" }} />
            <Stack.Screen name="History" component={HistoryScreen} options={{ title: "My History" }} />
            <Stack.Screen name="Transcribe" component={TranscribeScreen} options={{ title: "Transcribe" }} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: "My Profile" }} />
            <Stack.Screen name="Library" component={LibraryScreen} options={{ title: "Library" }} />
            <Stack.Screen name="CourseDetail" component={CourseDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CourseDetailFocusMode" component={CourseDetailFocusModeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AddCourse" component={AddCourseScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EditCourse" component={EditCourseScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ImportExcel" component={ImportExcelScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="ListVideo"
              component={ListVideoScreen}
              options={{ title: "Learning Video" }}
            />
            <Stack.Screen
              name="VideoPlayer"
              component={VideoScreen}
              options={{ title: "Learning Video" }}
            />
          </>
        ) : (
          // Auth Stack - User is logged out
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <NotificationProvider>
          <RootNavigator />
        </NotificationProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111827",
  },
});
