import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Animated, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SHADOWS } from "../constants/config";
import { loginUser } from "../services/api";
import { useUser } from "../context/UserContext";

export default function LoginScreen({ navigation }) {
  const { login } = useUser();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Vui lòng nhập tài khoản và mật khẩu");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await loginUser(username.trim(), password);
      if (response.success) {
        await login(response.user);
      } else {
        setError(response.error || "Đăng nhập thất bại");
      }
    } catch (err) {
      setError(err.message || "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Logo */}
          <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}>
            <View style={styles.logoCircle}>
              <Ionicons name="person" size={40} color={COLORS.primary} />
            </View>
            <View style={styles.logoAccent} />
          </Animated.View>

          {/* Welcome Text */}
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Đăng nhập tài khoản của bạn</Text>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Username Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tài khoản</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nhập tên tài khoản"
                placeholderTextColor={COLORS.textMuted}
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  setError("");
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mật khẩu</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nhập mật khẩu"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError("");
                }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Ionicons name={showPassword ? "eye" : "eye-off"} size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Remember Me & Forgot */}
          <View style={styles.optionsRow}>
            <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe(!rememberMe)}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>{rememberMe && <Ionicons name="checkmark" size={12} color="#fff" />}</View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity style={[styles.loginButton, loading && styles.loginButtonDisabled]} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.loginButtonText}>Đăng nhập</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>New Member? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={styles.registerLink}>Register now</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  content: {
    alignItems: "center",
  },

  // Logo
  logoContainer: {
    position: "relative",
    marginBottom: 24,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.medium,
    zIndex: 2,
  },
  logoAccent: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    transform: [{ rotate: "15deg" }],
    zIndex: 1,
  },

  // Text
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 28,
  },

  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,107,107,0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    width: "100%",
    gap: 8,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    flex: 1,
  },

  // Inputs
  inputGroup: {
    width: "100%",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 14,
  },
  eyeButton: {
    padding: 6,
  },

  // Options
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 24,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  rememberText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  forgotText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "600",
  },

  // Login Button
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    width: "100%",
    ...SHADOWS.medium,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },

  // Register
  registerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
  },
  registerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "700",
  },
});
