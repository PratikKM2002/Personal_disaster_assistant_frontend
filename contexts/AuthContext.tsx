import * as api from '@/services/api';
import { registerForPushNotificationsAsync } from '@/utils/push-notifications';
import { useAuth as useClerkAuth, useSSO, useSignIn, useSignUp, useUser } from '@clerk/clerk-expo';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useCallback, useContext, useEffect } from 'react';
import { Platform } from 'react-native';

// Warm up browser for Android
if (Platform.OS === 'android') {
    WebBrowser.warmUpAsync();
}
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
    user: { id: string; email: string; name: string } | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string, phone?: string) => Promise<'complete' | 'needs_verification'>;
    verifyEmailCode: (code: string) => Promise<void>;
    resendEmailCode: () => Promise<void>;
    startPasswordReset: (email: string) => Promise<void>;
    completePasswordReset: (code: string, newPassword: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    googleLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    login: async () => { },
    register: async () => 'complete',
    verifyEmailCode: async () => { },
    resendEmailCode: async () => { },
    startPasswordReset: async () => { },
    completePasswordReset: async () => { },
    loginWithGoogle: async () => { },
    logout: async () => { },
    googleLoading: false,
});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { isLoaded, isSignedIn, signOut, getToken } = useClerkAuth();
    const { user: clerkUser } = useUser();
    const { startSSOFlow } = useSSO();
    const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
    const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
    const [googleLoading, setGoogleLoading] = React.useState(false);

    // Map Clerk user to our app's user shape
    const user = clerkUser
        ? {
            id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress || '',
            name: clerkUser.fullName || clerkUser.firstName || 'User',
        }
        : null;

    // Register the token provider synchronously so it's guaranteed to be available
    // BEFORE any child component's useEffect fires (like HomeScreen fetching alerts).
    api.setTokenProvider(() => getToken(), user);

    // Handle push notifications setup when authenticated
    useEffect(() => {
        let isMounted = true;
        
        if (isSignedIn && clerkUser) {
            // Small delay to let Expo bundler settle and avoid 503s during hot reload
            const timer = setTimeout(() => {
                getToken().then(token => {
                    if (!isMounted || !token) return;
                    
                    registerForPushNotificationsAsync().then(pushToken => {
                        if (pushToken && isMounted) {
                            console.log("Push token ready:", pushToken);
                            api.updatePushToken(pushToken).catch(e => 
                                console.warn("Push token sync deferred, will retry next launch:", e.message)
                            );
                        }
                    });
                });
            }, 2000);
            
            return () => { isMounted = false; clearTimeout(timer); };
        }
        
        return () => { isMounted = false; };
    }, [isSignedIn, clerkUser, getToken]);

    const login = useCallback(
        async (email: string, password: string) => {
            if (!signInLoaded || !signIn) throw new Error('Sign in not loaded');

            const result = await signIn.create({
                identifier: email,
                password,
            });

            if (result.status === 'complete' && result.createdSessionId) {
                await setSignInActive!({ session: result.createdSessionId });
            } else {
                throw new Error('Sign in failed — check your credentials');
            }
        },
        [signIn, signInLoaded, setSignInActive]
    );

    const register = useCallback(
        async (name: string, email: string, password: string, _phone?: string) => {
            if (!signUpLoaded || !signUp) throw new Error('Sign up not loaded');

            const result = await signUp.create({
                firstName: name.split(' ')[0],
                lastName: name.split(' ').slice(1).join(' ') || undefined,
                emailAddress: email,
                password,
            });

            if (result.status === 'complete' && result.createdSessionId) {
                await setSignUpActive!({ session: result.createdSessionId });
                return 'complete';
            } else if (result.status === 'missing_requirements') {
                await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
                return 'needs_verification';
            } else {
                throw new Error('Sign up failed');
            }
        },
        [signUp, signUpLoaded, setSignUpActive]
    );

    const verifyEmailCode = useCallback(
        async (code: string) => {
            if (!signUpLoaded || !signUp) throw new Error('Sign up not loaded');

            const result = await signUp.attemptEmailAddressVerification({ code });

            if (result.status === 'complete' && result.createdSessionId) {
                await setSignUpActive!({ session: result.createdSessionId });
            } else {
                throw new Error('Email verification incomplete. Please check the code and try again.');
            }
        },
        [signUp, signUpLoaded, setSignUpActive]
    );

    const resendEmailCode = useCallback(
        async () => {
            if (!signUpLoaded || !signUp) throw new Error('Sign up not loaded');
            await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        },
        [signUp, signUpLoaded]
    );

    const startPasswordReset = useCallback(
        async (email: string) => {
            if (!signInLoaded || !signIn) throw new Error('Sign in not loaded');

            await signIn.create({
                strategy: 'reset_password_email_code',
                identifier: email,
            });
        },
        [signIn, signInLoaded]
    );

    const completePasswordReset = useCallback(
        async (code: string, newPassword: string) => {
            if (!signInLoaded || !signIn) throw new Error('Sign in not loaded');

            const result = await signIn.attemptFirstFactor({
                strategy: 'reset_password_email_code',
                code,
                password: newPassword,
            });

            if (result.status === 'complete' && result.createdSessionId) {
                await setSignInActive!({ session: result.createdSessionId });
                return;
            }

            if (result.status === 'needs_new_password') {
                const resetResult = await signIn.resetPassword({ password: newPassword });
                if (resetResult.status === 'complete' && resetResult.createdSessionId) {
                    await setSignInActive!({ session: resetResult.createdSessionId });
                    return;
                }
            }

            throw new Error('Password reset incomplete. Please check the code and try again.');
        },
        [signIn, signInLoaded, setSignInActive]
    );

    const loginWithGoogle = useCallback(async () => {
        setGoogleLoading(true);
        try {
            const { createdSessionId, setActive } = await startSSOFlow({
                strategy: 'oauth_google',
                redirectUrl: AuthSession.makeRedirectUri(),
            });

            if (createdSessionId && setActive) {
                await setActive({ session: createdSessionId });
            }
        } catch (e) {
            console.error('Google auth failed:', e);
            throw e;
        } finally {
            setGoogleLoading(false);
        }
    }, [startSSOFlow]);

    const logout = useCallback(async () => {
        await signOut();
    }, [signOut]);

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading: !isLoaded,
                isAuthenticated: !!isSignedIn,
                login,
                register,
                verifyEmailCode,
                resendEmailCode,
                startPasswordReset,
                completePasswordReset,
                loginWithGoogle,
                logout,
                googleLoading,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
