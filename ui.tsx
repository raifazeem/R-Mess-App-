import React, { useEffect, useState } from 'react';
// FIX: Import the Sparkles icon from lucide-react.
import { Sun, Moon, LogOut, Eye, EyeOff, User, Lock, Utensils, ChefHat, Shield, Users, Calendar, DollarSign, Send, History, CheckCircle, XCircle, FileDown, Bell, Wallet, BookOpen, Sandwich, Soup, Settings, MessageSquare, Trash2, Edit, PlusCircle, ChevronsLeft, ChevronsRight, Sparkles } from 'lucide-react';

export const Icons = {
  Sun, Moon, LogOut, Eye, EyeOff, User, Lock, Utensils, ChefHat, Shield,
  Users, Calendar, DollarSign, Send, History, CheckCircle, XCircle,
  FileDown, Bell, Wallet, BookOpen, Sandwich, Soup, Settings, MessageSquare,
  Trash2, Edit, PlusCircle, ChevronsLeft, ChevronsRight,
  // FIX: Export the Sparkles icon.
  Sparkles,
};

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => (
  <div className={`bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 ${className}`}>
    {children}
  </div>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', className, ...props }, ref) => {
    const baseClasses = 'font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors duration-200 inline-flex items-center justify-center gap-2';
    const sizeClasses = {
      sm: 'py-1 px-2 text-sm',
      md: 'py-2 px-4 text-base',
      lg: 'py-3 px-6 text-lg',
    };
    const variantClasses = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
      secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-400',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      ghost: 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:ring-primary-500',
    };

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  containerClassName?: string;
  Icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, type = 'text', containerClassName, Icon, className, ...props }, ref) => (
    <div className={`w-full ${containerClassName}`}>
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <div className="relative">
        {Icon && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {Icon}
        </div>}
        <input
          ref={ref}
          id={id}
          type={type}
          className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${Icon ? 'pl-10' : ''} ${className}`}
          {...props}
        />
      </div>
    </div>
  )
);

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b pb-3 dark:border-gray-600">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
            <Icons.XCircle />
          </button>
        </div>
        <div className="mt-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export const Toast: React.FC<{ message: string; onDismiss: () => void; }> = ({ message, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true); // Animate in
    const timer = setTimeout(() => {
      setVisible(false); // Animate out
      setTimeout(onDismiss, 300); // Allow fade-out animation to complete
    }, 2000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`transition-all duration-300 ease-in-out transform ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5'}`}
    >
      <div className="bg-green-500 text-white font-bold rounded-lg shadow-lg py-2 px-4 flex items-center gap-2">
        <Icons.CheckCircle className="h-5 w-5" />
        <span>{message}</span>
      </div>
    </div>
  );
};