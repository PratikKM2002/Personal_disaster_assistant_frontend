import { AppColors } from '@/constants/Colors';
import { QUICK_ACTIONS } from '@/constants/Data';
import * as api from '@/services/api';
import { ChatMessage } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoLocation from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
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

export default function ChatScreen() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            type: 'bot',
            content: "Hello! I'm Guardian AI, your disaster preparedness assistant. How can I help you today?",
            timestamp: new Date(),
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

    useEffect(() => {
        (async () => {
            const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            const loc = await ExpoLocation.getCurrentPositionAsync({});
            setLocation(loc.coords);
        })();
    }, []);

    const sendMessage = async (text: string) => {
        if (!text.trim()) return;

        // Add user message
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            type: 'user',
            content: text.trim(),
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsTyping(true);

        try {
            // Call Backend
            const data = await api.sendChatMessage(
                text,
                location?.latitude,
                location?.longitude
            );

            const botMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                type: 'bot',
                content: data.response,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('Chat Error:', error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                type: 'bot',
                content: "I'm having trouble connecting to the network instantly. Please try again.",
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [messages, isTyping]);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <View style={styles.botAvatar}>
                        <Ionicons name="shield-checkmark" size={20} color="#fff" />
                    </View>
                    <View>
                        <Text style={styles.title}>Guardian AI</Text>
                        <Text style={styles.subtitle}>Always ready to help</Text>
                    </View>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Messages */}
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={100}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messageList}
                    contentContainerStyle={styles.messageContent}
                >
                    {messages.map((message) => (
                        <View
                            key={message.id}
                            style={[
                                styles.messageBubble,
                                message.type === 'user' ? styles.userBubble : styles.botBubble
                            ]}
                        >
                            {message.type === 'bot' && (
                                <View style={styles.botIcon}>
                                    <Ionicons name="sparkles" size={14} color="#3b82f6" />
                                </View>
                            )}
                            <View style={[
                                styles.messageContent,
                                message.type === 'user' ? styles.userContent : styles.botContent
                            ]}>
                                <Text style={[
                                    styles.messageText,
                                    message.type === 'user' && styles.userText
                                ]}>
                                    {message.content}
                                </Text>
                                <Text style={styles.messageTime}>
                                    {formatTime(message.timestamp)}
                                </Text>
                            </View>
                        </View>
                    ))}

                    {/* Typing Indicator */}
                    {isTyping && (
                        <View style={[styles.messageBubble, styles.botBubble]}>
                            <View style={styles.botIcon}>
                                <Ionicons name="sparkles" size={14} color="#3b82f6" />
                            </View>
                            <View style={[styles.messageContent, styles.botContent]}>
                                <View style={styles.typingDots}>
                                    <View style={styles.dot} />
                                    <View style={styles.dot} />
                                    <View style={styles.dot} />
                                </View>
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Quick Actions */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.quickActionsScroll}
                    contentContainerStyle={styles.quickActionsContainer}
                >
                    {QUICK_ACTIONS.map((action, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={styles.quickAction}
                            onPress={() => sendMessage(action.query)}
                        >
                            <Text style={styles.quickActionIcon}>{action.icon}</Text>
                            <Text style={styles.quickActionLabel}>{action.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Input Area */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Ask me anything..."
                        placeholderTextColor="#6b7280"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                        onPress={() => sendMessage(inputText)}
                        disabled={!inputText.trim()}
                    >
                        <Ionicons name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: AppColors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    botAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    subtitle: {
        color: '#9ca3af',
        fontSize: 12,
    },
    messageList: {
        flex: 1,
    },
    messageContent: {
        padding: 16,
        gap: 12,
    },
    messageBubble: {
        flexDirection: 'row',
        marginBottom: 12,
        maxWidth: '85%',
    },
    userBubble: {
        alignSelf: 'flex-end',
        flexDirection: 'row-reverse',
    },
    botBubble: {
        alignSelf: 'flex-start',
    },
    botIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    userContent: {
        backgroundColor: '#3b82f6',
        borderRadius: 16,
        borderBottomRightRadius: 4,
        padding: 12,
    },
    botContent: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        borderBottomLeftRadius: 4,
        padding: 12,
    },
    messageText: {
        color: '#fff',
        fontSize: 14,
        lineHeight: 20,
    },
    userText: {
        color: '#fff',
    },
    messageTime: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    typingDots: {
        flexDirection: 'row',
        gap: 4,
        paddingVertical: 4,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#9ca3af',
    },
    quickActionsScroll: {
        maxHeight: 50,
        borderTopWidth: 1,
        borderTopColor: AppColors.border,
    },
    quickActionsContainer: {
        padding: 10,
        gap: 8,
    },
    quickAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
    },
    quickActionIcon: {
        fontSize: 14,
    },
    quickActionLabel: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 12,
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: AppColors.border,
    },
    input: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        color: '#fff',
        fontSize: 14,
        maxHeight: 100,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
});
