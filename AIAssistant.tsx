
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Modal, Button, Icons, Input } from './ui';
import { useData } from '../App';

interface AIAssistantProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Message {
    sender: 'user' | 'ai';
    text: string;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ isOpen, onClose }) => {
    const { data } = useData();
    const [messages, setMessages] = useState<Message[]>([
        { sender: 'ai', text: "Hello! I'm your R-Mess assistant. Ask me anything about today's attendance, student bills, or menus." }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Safely access the API key to prevent app crash if `process` is not defined.
            const API_KEY = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;

            if (!API_KEY) {
                throw new Error("API key is not configured.");
            }
            const ai = new GoogleGenAI({ apiKey: API_KEY });

            // A simplified, anonymized version of the data to keep the prompt smaller
            const simplifiedData = {
                today: new Date().toISOString(),
                users: data.users.map(({ password, ...user }) => user), // remove passwords
                attendance: data.attendance,
                billItems: data.billItems,
                menus: data.menus,
            };

            const systemInstruction = `You are an expert AI assistant for "R-Mess", a mess management system. Be helpful and concise. If a question cannot be answered from the provided data, say so. Do not mention that you are working with JSON data. Just provide the answer.`;
            
            const fullPrompt = `Here is the current system data:\n${JSON.stringify(simplifiedData, null, 2)}\n\nBased on this data, please answer the following question:\n\n${input}`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt,
                config: {
                    systemInstruction,
                }
            });

            const aiMessage: Message = { sender: 'ai', text: response.text };
            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            console.error("Error communicating with AI:", error);
            const errorMessageText = error instanceof Error ? error.message : "Please try again later.";
            const errorMessage: Message = { sender: 'ai', text: `Sorry, I encountered an error: ${errorMessageText}` };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="AI Assistant">
            <div className="flex flex-col h-[60vh]">
                <div className="flex-grow overflow-y-auto pr-4 space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.sender === 'ai' && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center"><Icons.Sparkles className="h-5 w-5 text-primary-500" /></div>}
                            <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-xl ${msg.sender === 'user' ? 'bg-primary-500 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 rounded-bl-none'}`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex items-end gap-2 justify-start">
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center"><Icons.Sparkles className="h-5 w-5 text-primary-500" /></div>
                            <div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 rounded-bl-none">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="mt-4 flex gap-2">
                    <Input 
                        placeholder="Ask about attendance, bills..." 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        disabled={isLoading}
                    />
                    <Button onClick={handleSend} disabled={isLoading}>
                        <Icons.Send />
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
