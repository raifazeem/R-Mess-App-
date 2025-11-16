
import React, { useState, useMemo } from 'react';
import { useAuth, useData, useTheme, useToast } from '../App';
import { Card, Button, Icons, Input } from '../components/ui';
import { MealType } from '../types';
import { format, parseISO, isToday } from 'date-fns';

const PageLayout = ({ children, title }: { children: React.ReactNode, title: string }) => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Icons.ChefHat className="text-primary-500"/>
                    <h1 className="text-xl font-bold">Welcome, {user?.name} (Cook)</h1>
                </div>
                <div className="flex items-center gap-4">
                    <Button onClick={toggleTheme} variant="ghost" size="sm">
                        {theme === 'light' ? <Icons.Moon /> : <Icons.Sun />}
                    </Button>
                    <Button onClick={logout} variant="secondary" size="sm">
                        <Icons.LogOut className="mr-2 h-4 w-4" /> Logout
                    </Button>
                </div>
            </header>
            <main className="p-4 md:p-8">
                <h2 className="text-3xl font-bold mb-6">{title}</h2>
                {children}
            </main>
        </div>
    );
};

const ViewMeals = () => {
    const { tenantId } = useAuth();
    const { data } = useData();
    const today = new Date();
    const dateString = format(today, 'yyyy-MM-dd');
    
    const menu = useMemo(() => tenantId ? data.menus.find(m => m.date === dateString && m.tenantId === tenantId) : undefined, [data.menus, tenantId, dateString]);
    
    const getAttendeeCount = (meal: MealType) => {
        if (!tenantId) return 0;
        return data.attendance.filter(a => a.date === dateString && a.meal === meal && a.tenantId === tenantId).length;
    };

    return (
        <Card>
            <h3 className="text-2xl font-semibold mb-4 text-center">Today's Meals: {format(today, 'dd MMMM, yyyy')}</h3>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="text-center p-4 border rounded-lg dark:border-gray-700">
                    <h4 className="text-xl font-bold mb-2 flex items-center justify-center gap-2"><Icons.Sandwich className="text-yellow-500"/> Breakfast</h4>
                    <p className="text-gray-600 dark:text-gray-300">Menu: <span className="font-medium">{menu?.[MealType.BREAKFAST] || 'Not set'}</span></p>
                    <p className="text-4xl font-bold mt-4">{getAttendeeCount(MealType.BREAKFAST)}</p>
                    <p className="text-gray-500 dark:text-gray-400">Attendees</p>
                </div>
                <div className="text-center p-4 border rounded-lg dark:border-gray-700">
                    <h4 className="text-xl font-bold mb-2 flex items-center justify-center gap-2"><Icons.Soup className="text-orange-500"/> Dinner</h4>
                    <p className="text-gray-600 dark:text-gray-300">Menu: <span className="font-medium">{menu?.[MealType.DINNER] || 'Not set'}</span></p>
                    <p className="text-4xl font-bold mt-4">{getAttendeeCount(MealType.DINNER)}</p>
                    <p className="text-gray-500 dark:text-gray-400">Attendees</p>
                </div>
            </div>
        </Card>
    );
};

const ManageMoney = () => {
    const { data, actions } = useData();
    const { user, tenantId } = useAuth();
    const { addToast } = useToast();
    const [returnedAmount, setReturnedAmount] = useState('');

    const cookTransactions = useMemo(() => tenantId ? data.cookTransactions.filter(t => t.tenantId === tenantId) : [], [data.cookTransactions, tenantId]);
    
    const handleReturnMoney = () => {
        const amount = parseFloat(returnedAmount);
        if (!isNaN(amount) && amount > 0 && user && tenantId) {
            actions.addCookTransaction('returned', amount, user.id, tenantId);
            setReturnedAmount('');
            addToast('Submitted returned amount.');
        }
    };
    
    const totalGiven = cookTransactions.filter(t => t.type === 'given').reduce((sum, t) => sum + t.amount, 0);
    const totalReturned = cookTransactions.filter(t => t.type === 'returned').reduce((sum, t) => sum + t.amount, 0);
    const totalAdjusted = cookTransactions.filter(t => t.type === 'adjustment').reduce((sum, t) => sum + t.amount, 0);

    return (
        <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
                <h3 className="text-xl font-semibold mb-4">Add Returned Money</h3>
                <div className="space-y-4">
                    <Input 
                        label="Amount Returned (PKR)"
                        type="number"
                        placeholder="e.g., 500"
                        value={returnedAmount}
                        onChange={(e) => setReturnedAmount(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleReturnMoney()}
                    />
                    <Button onClick={handleReturnMoney} className="w-full">
                        <Icons.Send className="mr-2 h-4 w-4" /> Submit Returned Amount
                    </Button>
                </div>
                <div className="mt-6 border-t pt-4 dark:border-gray-700">
                    <h4 className="font-semibold mb-2">Summary</h4>
                    <p>Total Money Received: <span className="font-mono float-right text-green-500">Rs. {totalGiven.toFixed(2)}</span></p>
                    <p>Total Money Returned: <span className="font-mono float-right text-blue-500">Rs. {totalReturned.toFixed(2)}</span></p>
                    <p>Total Adjustments: <span className="font-mono float-right text-yellow-500">Rs. {totalAdjusted.toFixed(2)}</span></p>
                </div>
            </Card>
            <Card className="md:col-span-2">
                <h3 className="text-xl font-semibold mb-4">Transaction History</h3>
                <div className="max-h-96 overflow-y-auto pr-2">
                    {cookTransactions.map(tx => (
                        <div key={tx.id} className="border-b dark:border-gray-700 py-3">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className={`font-bold capitalize ${
                                        tx.type === 'given' ? 'text-green-500' : tx.type === 'returned' ? 'text-blue-500' : 'text-yellow-500'
                                    }`}>{tx.type}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{format(parseISO(tx.timestamp), 'dd MMM yyyy, hh:mm a')}</p>
                                </div>
                                <span className="font-mono text-lg font-semibold">Rs. {tx.amount.toFixed(2)}</span>
                            </div>
                            {tx.reason && <p className="text-sm italic text-gray-600 dark:text-gray-400 mt-1">Reason: {tx.reason}</p>}
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};


const CookPage = () => {
    const [activeTab, setActiveTab] = useState('meals');

    const tabs = [
        { id: 'meals', label: 'Today\'s Meals', icon: Icons.Utensils },
        { id: 'money', label: 'Manage Money', icon: Icons.Wallet },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'meals': return <ViewMeals />;
            case 'money': return <ManageMoney />;
            default: return null;
        }
    };

    return (
        <PageLayout title={tabs.find(t => t.id === activeTab)?.label || ''}>
             <div className="mb-6 border-b border-gray-300 dark:border-gray-700">
                <nav className="-mb-px flex space-x-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                                activeTab === tab.id
                                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                        >
                            <tab.icon className="h-5 w-5" />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
            {renderContent()}
        </PageLayout>
    );
};

export default CookPage;
