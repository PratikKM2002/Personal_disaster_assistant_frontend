import { AppColors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function AuthScreen() {
    const { login, register, loginWithGoogle, googleLoading, isAuthenticated } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Navigate to main app when auth succeeds (covers Google flow)
    useEffect(() => {
        if (isAuthenticated) {
            router.replace('/(tabs)');
        }
    }, [isAuthenticated]);

    const getErrorMessage = (e: any): string => {
        // Clerk errors have an `errors` array
        if (e?.errors?.length > 0) {
            return e.errors[0].longMessage || e.errors[0].message || 'Authentication failed';
        }
        if (e?.message) return e.message;
        return 'Something went wrong. Please try again.';
    };

    const handleSubmit = async () => {
        setError('');
        if (!email.trim() || !password.trim()) {
            setError('Email and password are required');
            return;
        }
        if (!isLogin && !name.trim()) {
            setError('Name is required');
            return;
        }

        setLoading(true);
        try {
            if (isLogin) {
                await login(email.trim(), password);
            } else {
                await register(name.trim(), email.trim(), password, phone.trim() || undefined);
            }
            router.replace('/(tabs)');
        } catch (e: any) {
            setError(getErrorMessage(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>

                    {/* Logo / Header */}
                    <View style={styles.headerSection}>
                        <View style={styles.logoContainer}>
                            <View style={styles.logoCircle}>
                                <Ionicons name="shield-checkmark" size={40} color="#fff" />
                            </View>
                            <View style={styles.logoGlow} />
                        </View>
                        <Text style={styles.appName}>Guardian AI</Text>
                        <Text style={styles.tagline}>Your Personal Disaster Assistant</Text>
                    </View>

                    {/* Tab Switcher */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, isLogin && styles.tabActive]}
                            onPress={() => { setIsLogin(true); setError(''); }}
                        >
                            <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>
                                Sign In
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, !isLogin && styles.tabActive]}
                            onPress={() => { setIsLogin(false); setError(''); }}
                        >
                            <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>
                                Create Account
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Form */}
                    <View style={styles.formContainer}>
                        {error ? (
                            <View style={styles.errorBox}>
                                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {!isLogin && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Full Name</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="person-outline" size={18} color="#6b7280" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter your name"
                                        placeholderTextColor="#6b7280"
                                        value={name}
                                        onChangeText={setName}
                                        autoCapitalize="words"
                                    />
                                </View>
                            </View>
                        )}

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="mail-outline" size={18} color="#6b7280" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="you@example.com"
                                    placeholderTextColor="#6b7280"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={18} color="#6b7280" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, styles.passwordInput]}
                                    placeholder="Enter your password"
                                    placeholderTextColor="#6b7280"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeButton}
                                >
                                    <Ionicons
                                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                        size={18}
                                        color="#6b7280"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {!isLogin && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Phone (optional)</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="call-outline" size={18} color="#6b7280" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="+1 (555) 000-0000"
                                        placeholderTextColor="#6b7280"
                                        value={phone}
                                        onChangeText={setPhone}
                                        keyboardType="phone-pad"
                                    />
                                </View>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Ionicons
                                        name={isLogin ? 'log-in-outline' : 'person-add-outline'}
                                        size={20}
                                        color="#fff"
                                    />
                                    <Text style={styles.submitText}>
                                        {isLogin ? 'Sign In' : 'Create Account'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Divider */}
                    <View style={styles.dividerContainer}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Google Sign-In Button */}
                    <TouchableOpacity
                        style={[styles.googleButton, (loading || googleLoading) && styles.submitButtonDisabled]}
                        onPress={async () => {
                            setError('');
                            try {
                                await loginWithGoogle();
                            } catch (e: any) {
                                setError(getErrorMessage(e));
                            }
                        }}
                        disabled={loading || googleLoading}
                        activeOpacity={0.8}
                    >
                        {googleLoading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <View style={styles.googleIconContainer}>
                                    <Text style={styles.googleG}>G</Text>
                                </View>
                                <Text style={styles.googleButtonText}>Sign in with Google</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Footer hint */}
                    <View style={styles.footer}>
                        <Ionicons name="information-circle-outline" size={14} color="#6b7280" />
                        <Text style={styles.footerText}>
                            Secured by Clerk
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    flex: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    backButton: {
        position: 'absolute',
        top: 12,
        left: 0,
        zIndex: 10,
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0px 4px 12px rgba(59, 130, 246, 0.4)',
        elevation: 8,
    },
    logoGlow: {
        position: 'absolute',
        top: -10,
        left: -10,
        right: -10,
        bottom: -10,
        borderRadius: 50,
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
    },
    appName: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    tagline: {
        color: '#9ca3af',
        fontSize: 14,
        marginTop: 4,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 10,
    },
    tabActive: {
        backgroundColor: '#3b82f6',
    },
    tabText: {
        color: '#6b7280',
        fontSize: 14,
        fontWeight: '600',
    },
    tabTextActive: {
        color: '#fff',
    },
    formContainer: {
        gap: 16,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 13,
        flex: 1,
    },
    inputGroup: {
        gap: 6,
    },
    label: {
        color: '#d1d5db',
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    inputIcon: {
        paddingLeft: 14,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 15,
        paddingVertical: 14,
        paddingHorizontal: 12,
    },
    passwordInput: {
        paddingRight: 44,
    },
    eyeButton: {
        position: 'absolute',
        right: 14,
        padding: 4,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#3b82f6',
        paddingVertical: 16,
        borderRadius: 12,
        marginTop: 8,
        boxShadow: '0px 4px 8px rgba(59, 130, 246, 0.3)',
        elevation: 4,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 32,
    },
    footerText: {
        color: '#6b7280',
        fontSize: 12,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    dividerText: {
        color: '#6b7280',
        fontSize: 12,
        fontWeight: '600',
        marginHorizontal: 16,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    googleIconContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    googleG: {
        fontSize: 14,
        fontWeight: '700',
        color: '#4285F4',
    },
    googleButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
});
