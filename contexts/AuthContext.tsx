import * as api from '@/services/api';
import { registerForPushNotificationsAsync } from '@/utils/push-notifications';
import { useAuth as useClerkAuth, useSSO, useSignIn, useSignUp, useUser } from '@clerk/clerk-expo';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useCallback, useContext } from 'react';
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
    register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    googleLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    login: async () => { },
    register: async () => { },
    loginWithGoogle: async () => { },
    logout: async () => { },
    googleLoading: false,
});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { isLoaded, isSignedIn, signOut } = useClerkAuth();
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

    // Automatically sync user to backend when authenticated
    React.useEffect(() => {
        if (isSignedIn && user) {
            console.log('Syncing Google user to backend:', user.email);
            api.syncGoogleUser(user.email, user.name)
                .then(({ token }) => {
                    console.log('Sync successful, setting auth token');
                    api.setAuthToken(token);

                    // Register for Push Notifications
                    registerForPushNotificationsAsync().then(pushToken => {
                        if (pushToken) {
                            console.log("Syncing push token...", pushToken);
                            api.updatePushToken(pushToken).catch(e => console.error("Push token sync failed:", e));
                        }
                    });
                })
                .catch(err => console.error('Sync failed:', err));
        }
    }, [isSignedIn, user?.email]);

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

            // Clerk may require email verification
            if (result.status === 'complete' && result.createdSessionId) {
                await setSignUpActive!({ session: result.createdSessionId });
            } else if (result.status === 'missing_requirements') {
                // Need email verification — prepare and send
                await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
                throw new Error(
                    'Please check your email for a verification code. Email verification is required.'
                );
            } else {
                throw new Error('Sign up failed');
            }
        },
        [signUp, signUpLoaded, setSignUpActive]
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
                loginWithGoogle,
                logout,
                googleLoading,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
