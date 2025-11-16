
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, useData, useTheme } from '../App';
import { Card, Button, Icons } from '../components/ui';
import { MealType, BillItemType, Student } from '../types';
import { format, parseISO, getDate, startOfMonth, endOfMonth, subMonths } from 'date-fns';

const formatHour = (hour24: number) => {
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    let hour12 = hour24 % 12;
    hour12 = hour12 || 12; // hour 0 should be 12
    return `${hour12}:00 ${ampm}`;
};

const MarkAttendance = () => {
    const { user, tenantId } = useAuth();
    const { data, actions } = useData();
    const today = new Date();
    
    const tenant = tenantId ? data.tenants.find(t => t.id === tenantId) : null;
    const tenantSettings = tenant?.settings;

    const MealCard = ({ mealType }: { mealType: MealType }) => {
        if (!tenantId || !tenantSettings) return null;

        const isOpen = actions.isMealTime(mealType, tenantId);
        const menu = actions.getMenuForDate(today, tenantId);
        const dish = menu?.[mealType] || 'Not set';
        const attendance = user ? actions.getUserAttendance(user.id, today, mealType) : null;
        const { start, end } = tenantSettings.mealTimes[mealType];

        const handleMark = () => {
            if (user && isOpen) {
                actions.toggleAttendance(user.id, today, mealType, user.id);
            }
        };

        return (
            <Card className={`flex flex-col items-center justify-center text-center transition-opacity ${!isOpen && 'opacity-60'}`}>
                 <div className="flex items-center gap-2 mb-2 text-xl font-semibold">
                    {mealType === MealType.BREAKFAST ? <Icons.Sandwich className="text-yellow-500" /> : <Icons.Soup className="text-orange-500" />}
                    <span>{mealType}</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-2">Menu: <span className="font-medium text-gray-700 dark:text-gray-300">{dish}</span></p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Marking open from {formatHour(start)} to {formatHour(end)}</p>

                <input
                    type="checkbox"
                    checked={!!attendance}
                    onChange={handleMark}
                    disabled={!isOpen}
                    aria-label={`Mark attendance for ${mealType}`}
                    className="h-16 w-16 rounded-lg text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 cursor-pointer disabled:cursor-not-allowed"
                />
                
                {attendance && <p className="text-xs mt-2 text-green-500">Marked at {format(parseISO(attendance.markedAt), 'hh:mm a')}</p>}
                 {!isOpen && !attendance && <p className="text-xs mt-2 text-red-500">Marking window is closed.</p>}
            </Card>
        );
    };

    return (
        <div className="grid md:grid-cols-2 gap-6">
            <MealCard mealType={MealType.BREAKFAST} />
            <MealCard mealType={MealType.DINNER} />
        </div>
    );
};

const ViewBills = () => {
    const { user, tenantId } = useAuth();
    const { data } = useData();

    const student = useMemo(() => user ? data.users.find(u => u.id === user.id) as Student : null, [user, data.users]);
    const userBills = useMemo(() => user && tenantId ? data.billItems.filter(b => b.userId === user.id && b.tenantId === tenantId) : [], [user, tenantId, data.billItems]);

    if (!student) return null;
    
    const calculateBillForPeriod = (start: Date, end: Date) => {
        const periodItems = userBills.filter(item => {
            const itemDate = parseISO(item.timestamp);
            return itemDate >= start && itemDate <= end;
        });
        const mealCharges = periodItems.filter(i => i.type === BillItemType.MEAL).reduce((sum, i) => sum + i.amount, 0);
        const miscCharges = periodItems.filter(i => i.type === BillItemType.MISC).reduce((sum, i) => sum + i.amount, 0);
        return { mealCharges, miscCharges };
    };

    const today = new Date();
    const currentDayOfMonth = getDate(today);
    
    let currentBillPeriod;
    if (currentDayOfMonth > 15) {
        currentBillPeriod = { start: startOfMonth(today), end: new Date(today.getFullYear(), today.getMonth(), 15, 23, 59, 59) };
    } else {
        const prevMonth = subMonths(today, 1);
        currentBillPeriod = { start: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 16), end: endOfMonth(prevMonth) };
    }
    
    const previousFullMonth = subMonths(today,1);
    const previousMonthBill = calculateBillForPeriod(startOfMonth(previousFullMonth), endOfMonth(previousFullMonth));
    const currentBill = calculateBillForPeriod(currentBillPeriod.start, currentBillPeriod.end);
    
    const totalPayments = userBills.filter(i => i.type === BillItemType.PAYMENT).reduce((sum, i) => sum + i.amount, 0);
    const allCharges = userBills.filter(i => i.type !== BillItemType.PAYMENT).reduce((sum, i) => sum + i.amount, 0);

    const arrears = student.arrears || 0;
    const securityFee = student.securityFee || 0;
    
    const remainingAmount = allCharges + totalPayments;

    return (
        <Card>
            <h3 className="text-xl font-semibold mb-4 border-b pb-2 dark:border-gray-600">Billing Summary</h3>
            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold text-lg mb-2">Current Bill Cycle</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Displaying for period: <span className="font-medium">{format(currentBillPeriod.start, 'dd MMM')} to {format(currentBillPeriod.end, 'dd MMM')}</span>
                    </p>
                    <div className="space-y-1">
                        <p>Meal Charges: <span className="font-mono float-right">Rs. {currentBill.mealCharges.toFixed(2)}</span></p>
                        <p>Misc Charges: <span className="font-mono float-right">Rs. {currentBill.miscCharges.toFixed(2)}</span></p>
                         <hr className="my-2 border-gray-300 dark:border-gray-600"/>
                        <p className="font-bold">Total for Period: <span className="font-mono float-right">Rs. {(currentBill.mealCharges + currentBill.miscCharges).toFixed(2)}</span></p>
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold text-lg mb-2">Overall Account Status</h4>
                    <div className="space-y-1">
                        <p>Arrears: <span className="font-mono float-right">Rs. {arrears.toFixed(2)}</span></p>
                        <p>Security Fee: <span className="font-mono float-right">Rs. {securityFee.toFixed(2)}</span></p>
                        <p>Total Bill Paid: <span className="font-mono float-right text-green-500">Rs. {(-totalPayments).toFixed(2)}</span></p>
                        <hr className="my-2 border-gray-300 dark:border-gray-600"/>
                        <p className="font-bold text-lg">Remaining Balance: <span className="font-mono float-right text-red-500">Rs. {remainingAmount.toFixed(2)}</span></p>
                    </div>
                </div>
            </div>
            <div className="mt-6 border-t pt-4 dark:border-gray-700">
                 <h4 className="font-semibold text-lg mb-2">Previous Month's Bill ({format(previousFullMonth, 'MMMM yyyy')})</h4>
                 <p>Total Charges (Meals + Misc): <span className="font-mono float-right">Rs. {(previousMonthBill.mealCharges + previousMonthBill.miscCharges).toFixed(2)}</span></p>
            </div>
        </Card>
    );
};


const ViewHistory = () => {
    const { user, tenantId } = useAuth();
    const { data } = useData();

    const attendanceHistory = useMemo(() => user && tenantId ? data.attendance.filter(a => a.userId === user.id && a.tenantId === tenantId).sort((a,b) => parseISO(b.markedAt).getTime() - parseISO(a.markedAt).getTime()) : [], [user, tenantId, data.attendance]);
    const billHistory = useMemo(() => user && tenantId ? data.billItems.filter(b => b.userId === user.id && b.tenantId === tenantId && b.type !== BillItemType.MEAL).sort((a,b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime()) : [], [user, tenantId, data.billItems]);


    return (
        <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><Icons.BookOpen /> Attendance History</h3>
                <div className="max-h-96 overflow-y-auto pr-2">
                    {attendanceHistory.map(att => (
                        <div key={att.markedAt} className="border-b dark:border-gray-700 py-2">
                            <p className="font-medium">{format(parseISO(att.date), 'dd MMMM yyyy')} - {att.meal}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Marked at {format(parseISO(att.markedAt), 'hh:mm:ss a')}</p>
                        </div>
                    ))}
                     {attendanceHistory.length === 0 && <p className="text-gray-500 dark:text-gray-400">No attendance history found.</p>}
                </div>
            </Card>
            <Card>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><Icons.Wallet /> Financial History</h3>
                <div className="max-h-96 overflow-y-auto pr-2">
                    {billHistory.map(item => (
                        <div key={item.id} className="border-b dark:border-gray-700 py-2 flex justify-between items-center">
                            <div>
                                <p className="font-medium">{item.description}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{format(parseISO(item.timestamp), 'dd MMM yyyy, hh:mm a')}</p>
                            </div>
                            <span className={`font-mono font-bold ${item.amount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {item.amount > 0 ? `Rs. ${item.amount.toFixed(2)}` : `Rs. ${(-item.amount).toFixed(2)}`}
                            </span>
                        </div>
                    ))}
                    {billHistory.length === 0 && <p className="text-gray-500 dark:text-gray-400">No financial history found.</p>}
                </div>
            </Card>
        </div>
    );
};


const StudentPage = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('attendance');
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setSidebarCollapsed(true);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const tabs = [
        { id: 'attendance', label: 'Mark Attendance', icon: Icons.CheckCircle },
        { id: 'bills', label: 'View Bills', icon: Icons.DollarSign },
        { id: 'history', label: 'View History', icon: Icons.History },
    ];

    const activeTabInfo = tabs.find(t => t.id === activeTab);

    const renderContent = () => {
        switch (activeTab) {
            case 'attendance': return <MarkAttendance />;
            case 'bills': return <ViewBills />;
            case 'history': return <ViewHistory />;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {/* Sidebar */}
            <aside className={`bg-white dark:bg-gray-800 shadow-xl flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
                <div className={`p-4 border-b dark:border-gray-700 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {!isSidebarCollapsed && <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">Student</h1>}
                     <Button variant="ghost" size="sm" onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}>
                        {isSidebarCollapsed ? <Icons.ChevronsRight /> : <Icons.ChevronsLeft />}
                    </Button>
                </div>
                <nav className="flex-grow p-2 space-y-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                                activeTab === tab.id
                                    ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                            } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                        >
                            <tab.icon className="h-5 w-5 flex-shrink-0" />
                            {!isSidebarCollapsed && <span>{tab.label}</span>}
                        </button>
                    ))}
                </nav>
                 <div className="p-2 border-t dark:border-gray-700">
                    <button
                        onClick={logout}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50 ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    >
                        <Icons.LogOut className="h-5 w-5 flex-shrink-0" />
                        {!isSidebarCollapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-md p-4 flex justify-between items-center sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        {activeTabInfo && <activeTabInfo.icon className="text-primary-500 h-8 w-8"/>}
                        <h2 className="text-2xl font-bold">{activeTabInfo?.label}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm">Welcome, {user?.name}</span>
                        <Button onClick={toggleTheme} variant="ghost" size="sm">
                            {theme === 'light' ? <Icons.Moon /> : <Icons.Sun />}
                        </Button>
                    </div>
                </header>
                <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default StudentPage;
