import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../constants/config';
import { getUserProfile, updateUserProfile } from '../services/api';
import { useUser } from '../context/UserContext';

export default function UserProfileScreen({ navigation }) {
  const { userData, logout, login } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [editData, setEditData] = useState({});
  const [error, setError] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await getUserProfile(userData?._id);
      if (response.success) {
        setProfile(response.user);
        setEditData({
          fullName: response.user.fullName || '',
          email: response.user.email || '',
          phone: response.user.phone || '',
        });
      }
    } catch (err) {
      setError('Không thể tải thông tin người dùng');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await updateUserProfile(userData?._id, editData);
      if (response.success) {
        setProfile(response.user);
        setIsEditing(false);
        // Update context with new data
        await login(response.user);
        if (Platform.OS === 'web') {
          window.alert('Cập nhật thông tin thành công!');
        } else {
          Alert.alert('Thành công', 'Cập nhật thông tin thành công!');
        }
      } else {
        setError(response.error || 'Cập nhật thất bại');
      }
    } catch (err) {
      setError(err.message || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    const logoutAction = async () => {
      await logout();
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Bạn có chắc chắn muốn đăng xuất?');
      if (confirmed) {
        logoutAction();
      }
    } else {
      Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: logoutAction,
        },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.usernameTitle}>
            {profile?.username || 'User'}
          </Text>
          <Text style={styles.memberSince}>
            Tham gia từ{' '}
            {profile?.createdAt
              ? new Date(profile.createdAt).toLocaleDateString('vi-VN')
              : ''}
          </Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>PROFILE</Text>
            {!isEditing ? (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditing(true)}
              >
                <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                <Text style={styles.editButtonText}>Chỉnh sửa</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsEditing(false);
                  setEditData({
                    fullName: profile?.fullName || '',
                    email: profile?.email || '',
                    phone: profile?.phone || '',
                  });
                  setError('');
                }}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
            )}
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Email */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldIcon}>
              <Ionicons name="mail" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Email:</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={editData.email}
                  onChangeText={(text) =>
                    setEditData({ ...editData, email: text })
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <View style={styles.fieldValueRow}>
                  <Text style={styles.fieldValue}>{profile?.email || '-'}</Text>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={COLORS.success}
                  />
                </View>
              )}
            </View>
          </View>

          {/* Full Name */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldIcon}>
              <Ionicons name="person" size={18} color={COLORS.secondary} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Họ tên:</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={editData.fullName}
                  onChangeText={(text) =>
                    setEditData({ ...editData, fullName: text })
                  }
                  placeholder="Nhập họ tên"
                  placeholderTextColor={COLORS.textMuted}
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {profile?.fullName || '-'}
                </Text>
              )}
            </View>
          </View>

          {/* Phone */}
          <View style={[styles.fieldRow, { borderBottomWidth: 0 }]}>
            <View style={styles.fieldIcon}>
              <Ionicons name="call" size={18} color={COLORS.accentOrange} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Số điện thoại:</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={editData.phone}
                  onChangeText={(text) =>
                    setEditData({ ...editData, phone: text })
                  }
                  keyboardType="phone-pad"
                  placeholder="Nhập số điện thoại"
                  placeholderTextColor={COLORS.textMuted}
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {profile?.phone || '-'}
                </Text>
              )}
            </View>
          </View>

          {/* Save Button (when editing) */}
          {isEditing && (
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Chỉnh sửa thông tin</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Decorative drawings */}
        <View style={styles.decoSection}>
          <View style={styles.decoLine} />
          <View style={styles.decoCircle1} />
          <View style={styles.decoCircle2} />
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: 12,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },

  // Avatar Section
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 10,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
    marginBottom: 14,
    borderWidth: 3,
    borderColor: 'rgba(255,107,107,0.15)',
  },
  usernameTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Profile Card
  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,107,107,0.08)',
  },
  editButtonText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },
  cancelButtonText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,107,0.08)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 6,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    flex: 1,
  },

  // Field rows
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  fieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  fieldValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldValue: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  fieldInput: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Save Button
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    ...SHADOWS.small,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Deco
  decoSection: {
    alignItems: 'center',
    marginVertical: 24,
    height: 60,
    position: 'relative',
  },
  decoLine: {
    width: 2,
    height: 40,
    backgroundColor: COLORS.borderLight,
    position: 'absolute',
    top: 0,
  },
  decoCircle1: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    position: 'absolute',
    bottom: 10,
    left: '45%',
    opacity: 0.4,
  },
  decoCircle2: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
    position: 'absolute',
    bottom: 0,
    left: '55%',
    opacity: 0.3,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
    ...SHADOWS.small,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
  },
});
