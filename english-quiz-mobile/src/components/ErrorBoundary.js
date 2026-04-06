import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/config';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };

    // Setup global error handler for native errors
    this._setupGlobalErrorHandler();
  }

  _setupGlobalErrorHandler = () => {
    if (global.ErrorUtils && !global.ErrorUtils._handlerSet) {
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        console.warn('[ErrorBoundary] Global error caught:', error, 'isFatal:', isFatal);
        // Log but don't crash
      });
      global.ErrorUtils._handlerSet = true;
    }
  };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="alert-circle" size={80} color={COLORS.error} />
            </View>
            
            <Text style={styles.title}>Oops! Something went wrong</Text>
            
            <View style={styles.errorBox}>
              <Text style={styles.errorLabel}>Error Message:</Text>
              <Text style={styles.errorText}>
                {this.state.error?.toString()}
              </Text>
            </View>

            {__DEV__ && this.state.errorInfo && (
              <View style={styles.debugBox}>
                <Text style={styles.debugLabel}>Debug Info (Dev Only):</Text>
                <Text style={styles.debugText}>
                  {this.state.errorInfo.componentStack}
                </Text>
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={this.resetError}
              >
                <Ionicons name="reload" size={20} color="#fff" />
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>

              {__DEV__ && (
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => {
                    Alert.alert('Debug', `Error count: ${this.state.errorCount}`);
                  }}
                >
                  <Text style={styles.buttonTextSecondary}>Debug Info</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  content: {
    flexGrow: 1,
    paddingVertical: 40,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: '#7F1D1D',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FECACA',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#FEE2E2',
    lineHeight: 20,
  },
  debugBox: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#60A5FA',
  },
  debugLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#93C5FD',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#D1D5DB',
    lineHeight: 18,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    gap: 12,
    marginTop: 24,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#60A5FA',
  },
  secondaryButton: {
    backgroundColor: '#374151',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D1D5DB',
  },
});

export default ErrorBoundary;
