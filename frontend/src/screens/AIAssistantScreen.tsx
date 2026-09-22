import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  BackHandler,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { sendChatMessage } from '../services/aiService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface AIAssistantScreenProps {
  onNavigateBack: () => void;
}

const SUGGESTED_PROMPTS = [
  "Someone is having a heart attack. What should I do right now?",
  "What to do during an earthquake?",
  "First-response steps for severe bleeding",
  "How to treat a minor burn?"
];

export default function AIAssistantScreen({ onNavigateBack }: AIAssistantScreenProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello! I am your AI Emergency Assistant. I can provide safety, evacuation, first-response, and preparedness guidance.\n\n*Note: I am not a dispatcher. If you have an active life-threatening emergency, please contact official emergency services (100/101/102/112) immediately.*",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  
  const flatListRef = useRef<FlatList<Message>>(null);

  // Handle hardware back press on Android
  useEffect(() => {
    const backAction = () => {
      onNavigateBack();
      return true; // prevent default behavior
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [onNavigateBack]);

  // Scroll to end of list when a new message is added
  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async (textToSend: string) => {
    const cleanText = textToSend.trim();
    if (!cleanText || loading) return;

    // Dismiss keyboard
    Keyboard.dismiss();

    // 1. Add User Message
    const userMsgId = `user-${Date.now()}`;
    const userMessage: Message = {
      id: userMsgId,
      sender: 'user',
      text: cleanText,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    scrollToBottom();

    // 2. Call API Service
    try {
      const responseText = await sendChatMessage(cleanText);

      // 3. Add AI Message
      const aiMsgId = `ai-${Date.now()}`;
      const aiMessage: Message = {
        id: aiMsgId,
        sender: 'ai',
        text: responseText,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('[AI Chat] Service Error:', error);
      const errorMsgId = `ai-error-${Date.now()}`;
      const errorMessage: Message = {
        id: errorMsgId,
        sender: 'ai',
        text: "Sorry, I am currently unable to retrieve safety guidance due to a network communication issue. Please ensure you are connected to the internet, or dial emergency services directly.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
        {!isUser && (
          <View style={styles.assistantAvatar}>
            <Feather name="shield" size={16} color="#FFFFFF" />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.aiMessageText]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F11" />
      
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onNavigateBack} style={styles.backButton} activeOpacity={0.7}>
          <Feather name="chevron-left" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Safety Assistant</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {/* Messages flatlist */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={scrollToBottom}
          ListFooterComponent={
            loading ? (
              <View style={styles.loadingWrapper}>
                <ActivityIndicator size="small" color="#D32F2F" />
                <Text style={styles.loadingText}>Formulating safety guidelines...</Text>
              </View>
            ) : null
          }
          ListHeaderComponent={
            messages.length === 1 ? (
              <View style={styles.suggestedContainer}>
                <Text style={styles.suggestedTitle}>Suggested Safety Prompts</Text>
                {SUGGESTED_PROMPTS.map((prompt, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.promptCard}
                    onPress={() => handleSend(prompt)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.promptText}>{prompt}</Text>
                    <Feather name="arrow-right" size={16} color="#8E8E93" />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null
          }
        />

        {/* Input area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask about emergency guidance..."
            placeholderTextColor="#8E8E93"
            value={inputText}
            onChangeText={setInputText}
            multiline={false}
            editable={!loading}
            onSubmitEditing={() => handleSend(inputText)}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
            onPress={() => handleSend(inputText)}
            disabled={!inputText.trim() || loading}
            activeOpacity={0.8}
          >
            <Feather name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F11',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    backgroundColor: '#1E1E22',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerRightSpacer: {
    width: 34,
  },
  keyboardContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 8,
    maxWidth: '85%',
  },
  userRow: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  aiRow: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: '#D32F2F', // CareWave Primary Red
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 2,
  },
  aiBubble: {
    backgroundColor: '#2C2C2E', // Dark grey bubble matching quick cards
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 16,
    flexShrink: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  aiMessageText: {
    color: '#F2F2F7',
  },
  loadingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 36,
  },
  loadingText: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
    backgroundColor: '#1E1E22',
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: '#2C2C2E',
    borderWidth: 1.5,
    borderColor: '#3A3A3C',
    borderRadius: 22,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 15,
    marginRight: 12,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#3A3A3C',
    shadowOpacity: 0,
    elevation: 0,
  },
  suggestedContainer: {
    width: '100%',
    backgroundColor: '#1E1E22',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    marginBottom: 20,
    marginTop: 10,
  },
  suggestedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8E8E93',
    marginBottom: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  promptText: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
    paddingRight: 8,
  },
});
