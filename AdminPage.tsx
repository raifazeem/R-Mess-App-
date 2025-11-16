
import React, { useState, useMemo, useEffect } from 'react';
import { useAuth, useData, useTheme, useToast } from '../App';
import { Card, Button, Icons, Input, Modal } from '../components/ui';
import { MealType, Student, UserRole, AnyUser, HistoryEntry, HistoryType, Admin, Cook, BillItemType, RegistrationRequest } from '../types';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isValid } from 'date-fns';
import { exportBillToExcel } from '../services/excelService';

const UserBillDetailModal: React.FC<{ user: AnyUser | null, onClose: () => void }> = ({ user, onClose }) => {
    const { data } = useData();
    
    const billHistoryWithRunningTotal = useMemo(() => {
        if (!user) return [];
        
        const sortedItems = data.billItems
            .filter(item => item.userId === user.id)
            .sort((a, b) => parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime());
            
        let runningBalance = 0;
        
        const processedItems = sortedItems.map(item => {
            runningBalance += item.amount;
            return { ...item, runningBalance };
        });

        return processedItems.reverse();

    }, [user, data.billItems]);

    if (!user) return null;

    return (
        <Modal isOpen={!!user} onClose={onClose} title={`Billing History for ${user.name}`}>
            <div className="max-h-[60vh] overflow-y-auto pr-2">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b dark:border-gray-700 bg-gray-100 dark:bg-gray-700/50">
                            <th className="p-2 text-sm font-semibold text-gray-600 dark:text-gray-400 rounded-tl-lg">Date</th>
                            <th className="p-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Description</th>
                            <th className="p-2 text-sm font-semibold text-gray-600 dark:text-gray-400 text-right">Amount</th>
                            <th className="p-2 text-sm font-semibold text-gray-600 dark:text-gray-400 text-right rounded-tr-lg">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {billHistoryWithRunningTotal.map(item => (
                            <tr key={item.id} className="border-b dark:border-gray-700">
                                <td className="p-2 text-sm text-gray-500 dark:text-gray-300 whitespace-nowrap">{format(parseISO(item.timestamp), 'dd MMM yyyy')}</td>
                                <td className="p-2 text-gray-800 dark:text-gray-200">{item.description}</td>
                                <td className={`p-2 font-mono text-right ${item.amount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    {item.type === BillItemType.PAYMENT ? `-` : `+`} Rs. {Math.abs(item.amount).toFixed(2)}
                                </td>
                                <td className="p-2 font-mono text-right font-semibold text-gray-700 dark:text-gray-300">
                                    Rs. {item.runningBalance.toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {billHistoryWithRunningTotal.length === 0 && <p className="text-center text-gray-500 dark:text-gray-400 py-4">No billing history found.</p>}
            </div>
        </Modal>
    );
};

const ManageUsers = () => {
    const { user: adminUser, tenantId } = useAuth();
    const { data, actions } = useData();
    const { addToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AnyUser | null>(null);
    const [formData, setFormData] = useState<Partial<AnyUser>>({});
    const [detailUser, setDetailUser] = useState<AnyUser | null>(null);

    const tenantUsers = useMemo(() => data.users.filter(u => u.tenantId === tenantId), [data.users, tenantId]);

    const openModal = (user: AnyUser | null = null) => {
        setEditingUser(user);
        setFormData(user ? { ...user } : { role: UserRole.STUDENT, arrears: 0, securityFee: 5000 });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        setFormData({});
    };

    const handleSave = () => {
        if (!formData.name || !formData.password || !formData.role) {
            alert("Name, password, and role are required.");
            return;
        }
        if (adminUser && tenantId) {
            if (editingUser) {
                actions.updateUser(editingUser.id, formData, adminUser.id);
                addToast("User updated successfully!");
            } else {
                actions.addUser(formData as Omit<AnyUser, 'id'>, adminUser.id, tenantId);
                addToast("User added successfully!");
            }
        }
        closeModal();
    };

    const handleDelete = (userId: string) => {
        if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
            if (adminUser) {
                actions.deleteUser(userId, adminUser.id);
                addToast("User deleted.");
            }
        }
    };
    
    const usersByType = useMemo(() => ({
        [UserRole.ADMIN]: tenantUsers.filter(u => u.role === UserRole.ADMIN),
        [UserRole.STUDENT]: tenantUsers.filter(u => u.role === UserRole.STUDENT),
        [UserRole.COOK]: tenantUsers.filter(u => u.role === UserRole.COOK),
    }), [tenantUsers]);
    
    const renderUserTable = (users: AnyUser[], type: string) => (
        <div className="overflow-x-auto">
            <h4 className="text-lg font-semibold mb-2 capitalize text-gray-800 dark:text-gray-200">{type}s</h4>
            <table className="w-full text-left">
                 <thead>
                    <tr className="border-b dark:border-gray-700 bg-gray-100 dark:bg-gray-700/50">
                        <th className="p-2 font-semibold text-gray-600 dark:text-gray-400 rounded-tl-lg">Name</th>
                        {type === 'student' && <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Arrears</th>}
                        {type === 'student' && <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Security Fee</th>}
                        {(type === 'admin' || type === 'cook') && <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Billing Status</th>}
                        <th className="p-2 font-semibold text-gray-600 dark:text-gray-400 text-right rounded-tr-lg">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(u => (
                        <tr key={u.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="p-2 font-medium text-gray-900 dark:text-gray-100">{u.name}</td>
                            {type === 'student' && <td className="p-2 text-gray-700 dark:text-gray-300">Rs. {(u as Student).arrears}</td>}
                            {type === 'student' && <td className="p-2 text-gray-700 dark:text-gray-300">Rs. {(u as Student).securityFee}</td>}
                            {type === 'admin' && <td className="p-2 text-gray-700 dark:text-gray-300">{(u as Admin).includeInBilling ? 'Included' : 'Excluded'}</td>}
                            {type === 'cook' && <td className="p-2 text-gray-700 dark:text-gray-300">{(u as Cook).includeInBilling ? 'Included' : 'Excluded'}</td>}
                            <td className="p-2 text-right">
                                {(u.role === UserRole.STUDENT || ('includeInBilling' in u && u.includeInBilling)) && 
                                    <Button variant="ghost" size="sm" onClick={() => setDetailUser(u)}><Icons.BookOpen className="h-4 w-4" /></Button>
                                }
                                <Button variant="ghost" size="sm" onClick={() => openModal(u)}><Icons.Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id)} className="text-red-500"><Icons.Trash2 className="h-4 w-4" /></Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <>
            <Card>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Manage Users</h3>
                  <Button onClick={() => openModal()}><Icons.PlusCircle className="mr-2 h-4 w-4"/> Add User</Button>
                </div>
                <div className="space-y-6">
                    {renderUserTable(usersByType[UserRole.STUDENT], 'student')}
                    {renderUserTable(usersByType[UserRole.ADMIN], 'admin')}
                    {renderUserTable(usersByType[UserRole.COOK], 'cook')}
                </div>
                <Modal isOpen={isModalOpen} onClose={closeModal} title={editingUser ? "Edit User" : "Add User"}>
                    <div className="space-y-4">
                        <Input label="Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                        <Input label="Password" type="password" placeholder={editingUser ? "Leave blank to keep unchanged" : ""} onChange={e => setFormData({...formData, password: e.target.value})} />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                            <select
                                value={formData.role || ''}
                                onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                                disabled={!!editingUser}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700"
                            >
                                <option value={UserRole.STUDENT}>Student</option>
                                <option value={UserRole.ADMIN}>Admin</option>
                                <option value={UserRole.COOK}>Cook</option>
                            </select>
                        </div>
                        {formData.role === UserRole.STUDENT && (
                            <>
                               <Input label="Arrears" type="number" value={(formData as Partial<Student>).arrears || 0} onChange={e => setFormData({...formData, arrears: parseInt(e.target.value) || 0})} />
                               <Input label="Security Fee" type="number" value={(formData as Partial<Student>).securityFee || 0} onChange={e => setFormData({...formData, securityFee: parseInt(e.target.value) || 0})} />
                            </>
                        )}
                        {formData.role === UserRole.ADMIN && (
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="includeInBillingAdmin"
                                    className="h-4 w-4 rounded text-primary-600 focus:ring-primary-500"
                                    checked={(formData as Partial<Admin>).includeInBilling || false}
                                    onChange={e => setFormData({ ...formData, includeInBilling: e.target.checked })}
                                />
                                <label htmlFor="includeInBillingAdmin" className="text-sm font-medium text-gray-700 dark:text-gray-300">Include this Admin in billing cycle</label>
                            </div>
                        )}
                        {formData.role === UserRole.COOK && (
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="includeInBillingCook"
                                    className="h-4 w-4 rounded text-primary-600 focus:ring-primary-500"
                                    checked={(formData as Partial<Cook>).includeInBilling || false}
                                    onChange={e => setFormData({ ...formData, includeInBilling: e.target.checked })}
                                />
                                <label htmlFor="includeInBillingCook" className="text-sm font-medium text-gray-700 dark:text-gray-300">Include this Cook in billing cycle</label>
                            </div>
                        )}
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
                            <Button onClick={handleSave}>Save User</Button>
                        </div>
                    </div>
                </Modal>
            </Card>
            <UserBillDetailModal user={detailUser} onClose={() => setDetailUser(null)} />
        </>
    );
};


const ManageMenu = () => {
    const { user, tenantId } = useAuth();
    const { data, actions } = useData();
    const { addToast } = useToast();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [breakfastMenu, setBreakfastMenu] = useState('');
    const [dinnerMenu, setDinnerMenu] = useState('');

    useEffect(() => {
        if (!tenantId) return;
        const menu = actions.getMenuForDate(selectedDate, tenantId);
        setBreakfastMenu(menu?.[MealType.BREAKFAST] || '');
        setDinnerMenu(menu?.[MealType.DINNER] || '');
    }, [selectedDate, data.menus, actions, tenantId]);

    const handleSaveMenu = (meal: MealType) => {
        if(user && tenantId) {
            const dish = meal === MealType.BREAKFAST ? breakfastMenu : dinnerMenu;
            actions.setMenu(selectedDate, meal, dish, user.id, tenantId);
            addToast(`${meal} menu updated!`);
        }
    };
    
    return (
        <Card>
            <h3 className="text-xl font-semibold mb-4">Set Daily Menu</h3>
            <Input type="date" value={format(selectedDate, 'yyyy-MM-dd')} onChange={e => setSelectedDate(parseISO(e.target.value))} containerClassName="mb-4"/>
            <div className="space-y-4">
                <div>
                    <label className="font-semibold">Breakfast</label>
                    <div className="flex gap-2">
                        <Input value={breakfastMenu} onChange={e => setBreakfastMenu(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveMenu(MealType.BREAKFAST)} />
                        <Button onClick={() => handleSaveMenu(MealType.BREAKFAST)}>Save</Button>
                    </div>
                </div>
                <div>
                    <label className="font-semibold">Dinner</label>
                    <div className="flex gap-2">
                        <Input value={dinnerMenu} onChange={e => setDinnerMenu(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveMenu(MealType.DINNER)} />
                        <Button onClick={() => handleSaveMenu(MealType.DINNER)}>Save</Button>
                    </div>
                </div>
            </div>
        </Card>
    );
};

const ManageAttendance = () => {
    const { user: adminUser, tenantId } = useAuth();
    const { data, actions } = useData();
    const [selectedDate, setSelectedDate] = useState(new Date());
    
    const tenantUsers = useMemo(() => tenantId ? data.users.filter(u => u.tenantId === tenantId) : [], [data.users, tenantId]);

    const usersByRole = useMemo(() => ({
        students: tenantUsers.filter(u => u.role === UserRole.STUDENT) as Student[],
        admins: tenantUsers.filter(u => u.role === UserRole.ADMIN) as Admin[],
        cooks: tenantUsers.filter(u => u.role === UserRole.COOK) as Cook[],
    }), [tenantUsers]);

    const renderAttendanceTable = (users: AnyUser[], title: string) => (
        <div>
            <h4 className="text-lg font-semibold my-4">{title}</h4>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b dark:border-gray-700">
                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Name</th>
                            <th className="p-2 text-center font-semibold text-gray-600 dark:text-gray-400">Breakfast</th>
                            <th className="p-2 text-center font-semibold text-gray-600 dark:text-gray-400">Dinner</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-b dark:border-gray-700">
                                <td className="p-2 font-medium text-gray-900 dark:text-gray-100">{user.name}</td>
                                <td className="p-2 text-center">
                                    <input 
                                        type="checkbox"
                                        className="h-5 w-5 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
                                        checked={!!actions.getUserAttendance(user.id, selectedDate, MealType.BREAKFAST)}
                                        onChange={() => adminUser && actions.toggleAttendance(user.id, selectedDate, MealType.BREAKFAST, adminUser.id)}
                                    />
                                </td>
                                <td className="p-2 text-center">
                                     <input 
                                        type="checkbox"
                                        className="h-5 w-5 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
                                        checked={!!actions.getUserAttendance(user.id, selectedDate, MealType.DINNER)}
                                        onChange={() => adminUser && actions.toggleAttendance(user.id, selectedDate, MealType.DINNER, adminUser.id)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <Card>
            <h3 className="text-xl font-semibold mb-4">Manage User Attendance</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Mark attendance for meal planning. Financial charges depend on each user's billing settings.</p>
            <Input type="date" value={format(selectedDate, 'yyyy-MM-dd')} onChange={e => setSelectedDate(parseISO(e.target.value))} containerClassName="mb-4 max-w-xs"/>
            
            {adminUser && (
                <div className="mb-6 p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <h4 className="text-lg font-semibold mb-2">My Attendance for {format(selectedDate, 'dd MMM yyyy')}</h4>
                    <div className="flex items-center gap-8">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                className="h-5 w-5 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
                                checked={!!actions.getUserAttendance(adminUser.id, selectedDate, MealType.BREAKFAST)}
                                onChange={() => actions.toggleAttendance(adminUser.id, selectedDate, MealType.BREAKFAST, adminUser.id)}
                            />
                            <span>Breakfast</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                             <input
                                type="checkbox"
                                className="h-5 w-5 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
                                checked={!!actions.getUserAttendance(adminUser.id, selectedDate, MealType.DINNER)}
                                onChange={() => actions.toggleAttendance(adminUser.id, selectedDate, MealType.DINNER, adminUser.id)}
                            />
                            <span>Dinner</span>
                        </label>
                    </div>
                     {(adminUser as Admin).includeInBilling && <p className="text-xs text-gray-500 mt-2">Note: Your meals are currently included in the billing cycle.</p>}
                     {!(adminUser as Admin).includeInBilling && <p className="text-xs text-gray-500 mt-2">Note: Your meals are not currently included in the billing cycle.</p>}
                </div>
            )}

            {renderAttendanceTable(usersByRole.students, 'Students')}
            {renderAttendanceTable(usersByRole.admins.filter(a => a.id !== adminUser?.id), 'Other Admins')}
            {renderAttendanceTable(usersByRole.cooks, 'Cooks')}
        </Card>
    );
};

const Billing = () => {
    const { user, tenantId } = useAuth();
    const { data, actions } = useData();
    const { addToast } = useToast();
    const [miscDesc, setMiscDesc] = useState('');
    const [miscAmount, setMiscAmount] = useState('');
    const [miscDate, setMiscDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [miscMeal, setMiscMeal] = useState<MealType | 'Both'>(MealType.BREAKFAST);

    const [paymentUser, setPaymentUser] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    
    const [exportStart, setExportStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [exportEnd, setExportEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

    const tenantUsers = useMemo(() => tenantId ? data.users.filter(u => u.tenantId === tenantId) : [], [data.users, tenantId]);
    const tenantBillItems = useMemo(() => tenantId ? data.billItems.filter(b => b.tenantId === tenantId) : [], [data.billItems, tenantId]);
    
    const students = useMemo(() => tenantUsers.filter(u => u.role === UserRole.STUDENT) as Student[], [tenantUsers]);
    
    const billableUsers = useMemo(() => tenantUsers.filter(u => 
        u.role === UserRole.STUDENT || 
        (u.role === UserRole.ADMIN && (u as Admin).includeInBilling) ||
        (u.role === UserRole.COOK && (u as Cook).includeInBilling)
    ), [tenantUsers]);

    const handleAddMiscCharge = () => {
        const amount = parseFloat(miscAmount);
        if (miscDesc && !isNaN(amount) && amount > 0 && user && tenantId) {
            actions.addMiscCharge(miscDesc, amount, parseISO(miscDate), miscMeal, user.id, tenantId);
            setMiscDesc('');
            setMiscAmount('');
            addToast("Misc. charge added.");
        }
    };

    const handleAddPayment = () => {
        const amount = parseFloat(paymentAmount);
        if (paymentUser && !isNaN(amount) && amount > 0 && user) {
            actions.addPayment(paymentUser, amount, user.id);
            setPaymentUser('');
            setPaymentAmount('');
            addToast("Payment recorded.");
        }
    };

    const handleExport = () => {
        const startDate = parseISO(exportStart);
        const endDate = parseISO(exportEnd);
        if (!isValid(startDate) || !isValid(endDate) || endDate < startDate) {
            alert("Invalid date range selected for export.");
            return;
        }
        exportBillToExcel(students, tenantBillItems, startDate, endDate);
    };

    return (
        <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <h3 className="text-xl font-semibold mb-4">Add Meal Expense / Misc. Charge</h3>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">This amount will be equally divided among all billable users who attended the selected meal on the specified date.</p>
                <div className="space-y-4">
                    <Input label="Description" value={miscDesc} onChange={e => setMiscDesc(e.target.value)} />
                    <Input label="Total Amount (PKR)" type="number" value={miscAmount} onChange={e => setMiscAmount(e.target.value)} />
                    <div className="flex gap-2">
                        <Input label="Date" type="date" value={miscDate} onChange={e => setMiscDate(e.target.value)} />
                        <div className="w-full">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meal</label>
                          <select value={miscMeal} onChange={e => setMiscMeal(e.target.value as MealType | 'Both')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                              <option value={MealType.BREAKFAST}>Breakfast</option>
                              <option value={MealType.DINNER}>Dinner</option>
                              <option value="Both">Both (Breakfast & Dinner)</option>
                          </select>
                        </div>
                    </div>
                    <Button onClick={handleAddMiscCharge} className="w-full">Add Charge</Button>
                </div>
            </Card>
            <Card>
                <h3 className="text-xl font-semibold mb-4">Record Payment</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User</label>
                        <select value={paymentUser} onChange={e => setPaymentUser(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                            <option value="">Select User</option>
                            {billableUsers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                        </select>
                    </div>
                    <Input label="Amount Received (PKR)" type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                    <Button onClick={handleAddPayment} className="w-full">Record Payment</Button>
                </div>
            </Card>
            <Card className="md:col-span-2">
                <h3 className="text-xl font-semibold mb-4">Export Bills</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Select a date range to export the bill summary for all students to an Excel file.</p>
                 <div className="flex items-end gap-4">
                    <Input label="Start Date" type="date" value={exportStart} onChange={e => setExportStart(e.target.value)} />
                    <Input label="End Date" type="date" value={exportEnd} onChange={e => setExportEnd(e.target.value)} />
                    <Button onClick={handleExport} variant="secondary">
                        <Icons.FileDown className="mr-2 h-4 w-4"/> Export Bill
                    </Button>
                </div>
            </Card>
        </div>
    );
};

const CookMoney = () => {
    const { user, tenantId } = useAuth();
    const { data, actions } = useData();
    const { addToast } = useToast();
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'given' | 'adjustment'>('given');
    const [reason, setReason] = useState('');

    const cookTransactions = useMemo(() => tenantId ? data.cookTransactions.filter(t => t.tenantId === tenantId) : [], [data.cookTransactions, tenantId]);

    const handleSubmit = () => {
        const numAmount = parseFloat(amount);
        if (!isNaN(numAmount) && numAmount > 0 && user && tenantId) {
            actions.addCookTransaction(type, numAmount, user.id, tenantId, type === 'adjustment' ? reason : undefined);
            setAmount('');
            setReason('');
            addToast("Cook transaction recorded.");
        }
    };
    
    return (
        <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <h3 className="text-xl font-semibold mb-4">Manage Cook's Finances</h3>
                <div className="space-y-4">
                    <Input label="Amount (PKR)" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transaction Type</label>
                        <select value={type} onChange={e => setType(e.target.value as any)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                            <option value="given">Money Given</option>
                            <option value="adjustment">Adjustment</option>
                        </select>
                    </div>
                    {type === 'adjustment' && <Input label="Reason for Adjustment" value={reason} onChange={e => setReason(e.target.value)} />}
                    <Button onClick={handleSubmit} className="w-full">Submit Transaction</Button>
                </div>
            </Card>
            <Card>
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

const ManageSettings = () => {
    const { user, tenantId } = useAuth();
    const { data, actions } = useData();
    const { addToast } = useToast();
    
    const tenant = tenantId ? data.tenants.find(t => t.id === tenantId) : null;
    const [settings, setSettings] = useState(tenant?.settings);

    useEffect(() => {
        const currentTenant = tenantId ? data.tenants.find(t => t.id === tenantId) : null;
        if (currentTenant) {
            setSettings(currentTenant.settings);
        }
    }, [tenantId, data.tenants]);

    if (!settings) return <p>Loading settings...</p>;

    const to12Hour = (hour24: number) => {
        const ampm = hour24 >= 12 ? 'PM' : 'AM';
        let hour12 = hour24 % 12;
        hour12 = hour12 || 12;
        return { hour: hour12, ampm };
    };

    const to24Hour = (hour12: number, ampm: 'AM' | 'PM') => {
        if (ampm === 'PM' && hour12 < 12) return hour12 + 12;
        if (ampm === 'AM' && hour12 === 12) return 0;
        return hour12;
    };

    const handleTimeChange = (meal: MealType, field: 'start' | 'end', hour12: number, ampm: 'AM' | 'PM') => {
        const hour24 = to24Hour(hour12, ampm);
        setSettings(prev => prev ? ({
            ...prev,
            mealTimes: {
                ...prev.mealTimes,
                [meal]: { ...prev.mealTimes[meal], [field]: hour24 }
            }
        }) : undefined);
    };

    const handleSave = () => {
        if(user && tenantId && settings) {
            actions.updateSettings(tenantId, settings, user.id);
            addToast("Settings saved!");
        }
    };
    
    const selectClassName = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100";
    
    const TimeSelector = ({ meal, field, value }: { meal: MealType, field: 'start' | 'end', value: number }) => {
        const { hour, ampm } = to12Hour(value);
        const hours = Array.from({ length: 12 }, (_, i) => i + 1);

        return (
            <div className="flex gap-2">
                <select value={hour} onChange={e => handleTimeChange(meal, field, parseInt(e.target.value), ampm as 'AM' | 'PM')} className={selectClassName}>
                    {hours.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select value={ampm} onChange={e => handleTimeChange(meal, field, hour, e.target.value as 'AM' | 'PM')} className={selectClassName}>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                </select>
            </div>
        );
    };

    return (
        <Card>
             <h3 className="text-xl font-semibold mb-4">Meal Time Settings</h3>
             <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Define the time window during which students can mark their attendance for each meal.</p>
             <div className="space-y-6">
                <div>
                    <h4 className="font-semibold text-lg mb-2">Breakfast</h4>
                    <div className="grid grid-cols-2 items-center gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                            <TimeSelector meal={MealType.BREAKFAST} field="start" value={settings.mealTimes[MealType.BREAKFAST].start} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
                            <TimeSelector meal={MealType.BREAKFAST} field="end" value={settings.mealTimes[MealType.BREAKFAST].end} />
                        </div>
                    </div>
                </div>
                 <div>
                    <h4 className="font-semibold text-lg mb-2">Dinner</h4>
                    <div className="grid grid-cols-2 items-center gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                             <TimeSelector meal={MealType.DINNER} field="start" value={settings.mealTimes[MealType.DINNER].start} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
                            <TimeSelector meal={MealType.DINNER} field="end" value={settings.mealTimes[MealType.DINNER].end} />
                        </div>
                    </div>
                </div>
             </div>
             <div className="mt-6 border-t pt-4 dark:border-gray-700">
                <Button onClick={handleSave}>Save Settings</Button>
             </div>
        </Card>
    );
};

const SendNotifications = () => {
    const { user, tenantId } = useAuth();
    const { data, actions } = useData();
    const { addToast } = useToast();
    const [content, setContent] = useState('');
    const [target, setTarget] = useState('all-students');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    
    const tenantUsers = useMemo(() => tenantId ? data.users.filter(u => u.tenantId === tenantId) : [], [data.users, tenantId]);
    const students = useMemo(() => tenantUsers.filter(u => u.role === UserRole.STUDENT), [tenantUsers]);
    const cook = useMemo(() => tenantUsers.find(u => u.role === UserRole.COOK), [tenantUsers]);
    
    const handleSend = () => {
        if (!content.trim() || !user || !tenantId) return;
        
        let recipientIds: string[] = [];
        if (target === 'all-students') {
            recipientIds = students.map(s => s.id);
        } else if (target === 'cook' && cook) {
            recipientIds = [cook.id];
        } else if (target === 'custom') {
            recipientIds = selectedUsers;
        }

        if (recipientIds.length > 0) {
            actions.sendNotification(content, recipientIds, user.id, tenantId);
            setContent('');
            setSelectedUsers([]);
            addToast("Notification sent!");
        } else {
            alert("No recipients selected.");
        }
    };
    
    return (
        <Card>
            <h3 className="text-xl font-semibold mb-4">Send Notifications</h3>
            <div className="space-y-4">
                <div>
                    <label htmlFor="notif-content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                    <textarea id="notif-content" rows={4} value={content} onChange={e => setContent(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700"></textarea>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recipient</label>
                    <select value={target} onChange={e => setTarget(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                        <option value="all-students">All Students</option>
                        {cook && <option value="cook">The Cook</option>}
                        <option value="custom">Specific Students</option>
                    </select>
                </div>
                {target === 'custom' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Students</label>
                         <select multiple value={selectedUsers} onChange={e => setSelectedUsers(Array.from(e.target.selectedOptions, option => option.value))} className="w-full h-40 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                           {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                )}
                <Button onClick={handleSend} className="w-full"><Icons.Send className="mr-2 h-4 w-4"/> Send Notification</Button>
            </div>
        </Card>
    );
};

const HistoryLog = () => {
    const { tenantId } = useAuth();
    const { data } = useData();

    const tenantHistory = useMemo(() => tenantId ? data.history.filter(h => h.tenantId === tenantId) : [], [data.history, tenantId]);

    const getIconForHistoryType = (type: HistoryType) => {
        switch(type) {
            case HistoryType.USER_MANAGEMENT: return <Icons.Users className="h-5 w-5 text-blue-500" />;
            case HistoryType.MENU_MANAGEMENT: return <Icons.Calendar className="h-5 w-5 text-green-500" />;
            case HistoryType.ATTENDANCE_MANAGEMENT: return <Icons.CheckCircle className="h-5 w-5 text-yellow-500" />;
            case HistoryType.FINANCIAL_ADMIN: return <Icons.DollarSign className="h-5 w-5 text-red-500" />;
            case HistoryType.SYSTEM: return <Icons.Settings className="h-5 w-5 text-purple-500" />;
            default: return <Icons.History className="h-5 w-5 text-gray-500" />;
        }
    };

    return (
        <Card>
            <h3 className="text-xl font-semibold mb-4">System History Log</h3>
            <div className="max-h-[600px] overflow-y-auto pr-2">
                {tenantHistory.map((entry: HistoryEntry) => (
                    <div key={entry.id} className="flex items-start gap-4 py-3 border-b dark:border-gray-700 last:border-b-0">
                        <div className="mt-1">{getIconForHistoryType(entry.type)}</div>
                        <div>
                            <p className="font-medium text-gray-800 dark:text-gray-200">{entry.description}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {format(parseISO(entry.timestamp), 'dd MMM yyyy, hh:mm:ss a')} by {data.users.find(u => u.id === entry.actorId)?.name || entry.actorId}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

const ManageRegistrationRequests = () => {
    const { data, actions } = useData();
    const { user: adminUser } = useAuth();
    const { addToast } = useToast();

    const pendingRequests = useMemo(() => data.registrationRequests.filter(r => r.status === 'pending'), [data.registrationRequests]);
    
    const handleApprove = (requestId: string) => {
        if (adminUser) {
            actions.approveRegistrationRequest(requestId, adminUser.id);
            addToast("Registration approved!");
        }
    };

    const handleReject = (requestId: string) => {
        if (adminUser) {
            actions.rejectRegistrationRequest(requestId, adminUser.id);
            addToast("Registration rejected.");
        }
    };

    return (
        <Card>
            <h3 className="text-xl font-semibold mb-4">Pending Registration Requests</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b dark:border-gray-700 bg-gray-100 dark:bg-gray-700/50">
                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Name</th>
                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Username</th>
                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Contact</th>
                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400">Date</th>
                            <th className="p-2 font-semibold text-gray-600 dark:text-gray-400 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingRequests.map((req: RegistrationRequest) => (
                            <tr key={req.id} className="border-b dark:border-gray-700">
                                <td className="p-2">{req.name} ({req.age}, {req.profession})</td>
                                <td className="p-2">{req.username}</td>
                                <td className="p-2">{req.contactNumber}</td>
                                <td className="p-2">{format(parseISO(req.timestamp), 'dd MMM yyyy')}</td>
                                <td className="p-2 text-right">
                                    <Button size="sm" onClick={() => handleApprove(req.id)} className="mr-2"><Icons.CheckCircle className="h-4 w-4 mr-1"/>Approve</Button>
                                    <Button size="sm" variant="danger" onClick={() => handleReject(req.id)}><Icons.XCircle className="h-4 w-4 mr-1"/>Reject</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {pendingRequests.length === 0 && <p className="text-center p-4 text-gray-500 dark:text-gray-400">No pending requests.</p>}
            </div>
        </Card>
    );
};


const AdminPage = () => {
    const { user, logout, isSuperAdmin } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('users');
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

    const baseTabs = [
        { id: 'users', label: 'Manage Users', icon: Icons.Users },
        { id: 'menu', label: 'Manage Menu', icon: Icons.Calendar },
        { id: 'attendance', label: 'Manage Attendance', icon: Icons.CheckCircle },
        { id: 'billing', label: 'Billing System', icon: Icons.DollarSign },
        { id: 'cookMoney', label: "Cook's Finances", icon: Icons.Wallet },
        { id: 'notifications', label: 'Notifications', icon: Icons.MessageSquare },
        { id: 'settings', label: 'Settings', icon: Icons.Settings },
        { id: 'history', label: 'History Log', icon: Icons.History },
    ];

    const tabs = isSuperAdmin ? [
        ...baseTabs,
        { id: 'requests', label: 'Registration Requests', icon: Icons.User, superAdmin: true }
    ] : baseTabs;
    
    const activeTabInfo = tabs.find(t => t.id === activeTab);

    const renderContent = () => {
        switch (activeTab) {
            case 'users': return <ManageUsers />;
            case 'menu': return <ManageMenu />;
            case 'attendance': return <ManageAttendance />;
            case 'billing': return <Billing />;
            case 'cookMoney': return <CookMoney />;
            case 'notifications': return <SendNotifications />;
            case 'settings': return <ManageSettings />;
            case 'history': return <HistoryLog />;
            case 'requests': return isSuperAdmin ? <ManageRegistrationRequests /> : null;
            default: return null;
        }
    };
    
    return (
         <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 relative">
            {/* Sidebar */}
            <aside className={`bg-white dark:bg-gray-800 shadow-xl flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
                <div className={`p-4 border-b dark:border-gray-700 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {!isSidebarCollapsed && <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">Admin</h1>}
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

export default AdminPage;
