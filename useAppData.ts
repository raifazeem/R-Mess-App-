import { useState, useCallback, useEffect } from 'react';
import { AppData, AnyUser, UserRole, Student, Cook, Admin, Menu, MealType, Attendance, CookTransaction, BillItem, Notification, HistoryEntry, BillItemType, HistoryType, AppSettings, Tenant, RegistrationRequest } from '../types';
import { format, isWithinInterval, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

const MEAL_COST = {
    [MealType.BREAKFAST]: 50,
    [MealType.DINNER]: 80,
};

const getInitialData = (): AppData => {
  const adminId = 'admin1';
  const initialTenantId = 'tenant1';

  return {
    users: [
      { id: adminId, name: 'raif.azeem', role: UserRole.ADMIN, password: 'raif7071', includeInBilling: false, isSuperAdmin: true, tenantId: initialTenantId } as Admin,
    ],
    menus: [],
    attendance: [],
    cookTransactions: [],
    billItems: [],
    notifications: [],
    history: [
        { id: 'h1', type: HistoryType.SYSTEM, description: 'System initialized.', timestamp: new Date().toISOString(), actorId: 'system', tenantId: 'system' }
    ],
    tenants: [
      {
        id: initialTenantId,
        name: "R-Mess HQ",
        ownerId: adminId,
        settings: {
            mealTimes: {
                [MealType.BREAKFAST]: { start: 7, end: 10 },
                [MealType.DINNER]: { start: 19, end: 22 },
            }
        }
      }
    ],
    registrationRequests: []
  };
};

const loadDataFromLocalStorage = (): AppData => {
    try {
        const storedData = localStorage.getItem('messAppData');
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            // Ensure new fields from initial data exist if they are missing from storage
            return { ...getInitialData(), ...parsedData };
        }
    } catch (error) {
        console.error("Error reading from localStorage:", error);
        localStorage.removeItem('messAppData');
    }
    const initialData = getInitialData();
    localStorage.setItem('messAppData', JSON.stringify(initialData));
    return initialData;
};


export const useAppData = () => {
    const [data, setData] = useState<AppData>(loadDataFromLocalStorage);

    useEffect(() => {
        try {
            localStorage.setItem('messAppData', JSON.stringify(data));
        } catch (error) {
            console.error("Error writing to localStorage:", error);
        }
    }, [data]);

    const addHistory = useCallback((type: HistoryType, description: string, actorId: string, tenantId: string | 'system') => {
        const newEntry: HistoryEntry = {
            id: `hist-${Date.now()}`,
            type,
            description,
            timestamp: new Date().toISOString(),
            actorId,
            tenantId,
        };
        setData(prev => ({ ...prev, history: [newEntry, ...prev.history] }));
    }, []);
    
    // User Management
    const findUserByUsername = (username: string) => data.users.find(u => u.name === username);
    const getUserById = (id: string) => data.users.find(u => u.id === id);
    
    const addUser = (user: Omit<AnyUser, 'id'>, actorId: string, tenantId: string) => {
        const newUser = { ...user, id: `user-${Date.now()}`, tenantId };
        
        if (newUser.role === UserRole.ADMIN || newUser.role === UserRole.COOK) {
            if (typeof (newUser as Admin | Cook).includeInBilling === 'undefined') {
                (newUser as Admin | Cook).includeInBilling = false;
            }
        }

        setData(prev => ({ ...prev, users: [...prev.users, newUser as AnyUser] }));
        addHistory(HistoryType.USER_MANAGEMENT, `Added new ${user.role}: ${user.name}.`, actorId, tenantId);
    };

    const updateUser = (userId: string, updates: Partial<AnyUser>, actorId: string) => {
        const oldUser = getUserById(userId);
        if(!oldUser) return;

        setData(prev => ({
            ...prev,
            users: prev.users.map(u => u.id === userId ? { ...u, ...updates } as AnyUser : u)
        }));

        const updatedFields = Object.keys(updates).filter(k => k !== 'password' && k !== 'id').join(', ');
        addHistory(HistoryType.USER_MANAGEMENT, `Updated ${oldUser.role} ${oldUser.name}'s details (${updatedFields}).`, actorId, oldUser.tenantId);
        
        if (oldUser.role === UserRole.STUDENT) {
            const oldStudent = oldUser as Student;
            const newStudent = updates as Partial<Student>;
            if (newStudent.arrears !== undefined && newStudent.arrears !== oldStudent.arrears) {
                 addHistory(HistoryType.FINANCIAL_ADMIN, `Updated ${oldUser.name}'s arrears from ${oldStudent.arrears} to ${newStudent.arrears}.`, actorId, oldUser.tenantId);
            }
            if (newStudent.securityFee !== undefined && newStudent.securityFee !== oldStudent.securityFee) {
                addHistory(HistoryType.FINANCIAL_ADMIN, `Updated ${oldUser.name}'s security fee from ${oldStudent.securityFee} to ${newStudent.securityFee}.`, actorId, oldUser.tenantId);
            }
        }
    };

    const deleteUser = (userId: string, actorId: string) => {
        const userToDelete = getUserById(userId);
        if (!userToDelete) return;

        setData(prev => ({
            ...prev,
            users: prev.users.filter(u => u.id !== userId)
        }));
        addHistory(HistoryType.USER_MANAGEMENT, `Deleted ${userToDelete.role}: ${userToDelete.name}.`, actorId, userToDelete.tenantId);
    };


    // Settings Management
    const updateSettings = (tenantId: string, newSettings: AppSettings, actorId: string) => {
        setData(prev => ({
            ...prev,
            tenants: prev.tenants.map(t => t.id === tenantId ? { ...t, settings: newSettings } : t)
        }));
        addHistory(HistoryType.SYSTEM, 'Updated meal time settings.', actorId, tenantId);
    };

    // Menu Management
    const getMenuForDate = (date: Date, tenantId: string) => {
        const dateString = format(date, 'yyyy-MM-dd');
        return data.menus.find(m => m.date === dateString && m.tenantId === tenantId);
    };

    const setMenu = (date: Date, meal: MealType, dish: string, actorId: string, tenantId: string) => {
        const dateString = format(date, 'yyyy-MM-dd');
        setData(prev => {
            const newMenus = [...prev.menus];
            let menu = newMenus.find(m => m.date === dateString && m.tenantId === tenantId);
            let menuChanged = true;

            if (menu) {
                if (menu[meal] === dish) {
                    menuChanged = false;
                } else {
                    menu[meal] = dish;
                }
            } else {
                newMenus.push({ date: dateString, [meal]: dish, tenantId });
            }

            if (!menuChanged) return prev;

            const studentIds = prev.users.filter(u => u.role === UserRole.STUDENT && u.tenantId === tenantId).map(u => u.id);
            const cook = prev.users.find(u => u.role === UserRole.COOK && u.tenantId === tenantId);
            const recipientIds = [...studentIds];
            if (cook) recipientIds.push(cook.id);
            
            const notificationContent = `Menu for ${meal} on ${format(date, 'dd MMM yyyy')} is updated to: "${dish}".`;
            
            const newNotif: Notification = {
                id: `notif-menu-${Date.now()}`,
                content: notificationContent,
                recipientIds,
                senderId: actorId,
                timestamp: new Date().toISOString(),
                readBy: [],
                tenantId,
            };
            
            addHistory(HistoryType.SYSTEM, `Sent menu update notification for ${dateString} ${meal}.`, actorId, tenantId);
            return { ...prev, menus: newMenus, notifications: [newNotif, ...prev.notifications] };
        });
        addHistory(HistoryType.MENU_MANAGEMENT, `Set ${meal} menu to "${dish}" for ${dateString}.`, actorId, tenantId);
    };

    // Attendance
    const isMealTime = (meal: MealType, tenantId: string) => {
        const tenant = data.tenants.find(t => t.id === tenantId);
        if (!tenant) return false;
        const now = new Date();
        const hour = now.getHours();
        const { start, end } = tenant.settings.mealTimes[meal];
        return hour >= start && hour < end;
    };

    const getUserAttendance = (userId: string, date: Date, meal: MealType) => {
        const dateString = format(date, 'yyyy-MM-dd');
        return data.attendance.find(a => a.userId === userId && a.date === dateString && a.meal === meal);
    };

    const toggleAttendance = (userId: string, date: Date, meal: MealType, actorId: string) => {
        const dateString = format(date, 'yyyy-MM-dd');
        const existingAttendance = getUserAttendance(userId, date, meal);
        const userToMark = getUserById(userId);
        if (!userToMark) return;
        const tenantId = userToMark.tenantId;
        
        const isBillable = userToMark.role === UserRole.STUDENT || 
                           (userToMark.role === UserRole.ADMIN && (userToMark as Admin).includeInBilling) ||
                           (userToMark.role === UserRole.COOK && (userToMark as Cook).includeInBilling);

        setData(prev => {
            let newAttendance = [...prev.attendance];
            let newBillItems = [...prev.billItems];
            const userName = userToMark?.name || 'Unknown User';

            if (existingAttendance) {
                newAttendance = newAttendance.filter(a => a !== existingAttendance);
                if (isBillable) {
                    newBillItems = newBillItems.filter(b => !(b.relatedMeal?.date === dateString && b.relatedMeal?.meal === meal && b.userId === userId));
                }
                addHistory(HistoryType.ATTENDANCE_MANAGEMENT, `Removed ${meal} attendance for ${userName} on ${dateString}.`, actorId, tenantId);
            } else {
                const newAtt: Attendance = { userId, date: dateString, meal, markedAt: new Date().toISOString(), tenantId };
                newAttendance.push(newAtt);
                
                if (isBillable) {
                    const newBill: BillItem = {
                        id: `bill-${Date.now()}`,
                        userId,
                        type: BillItemType.MEAL,
                        description: `${meal} on ${dateString}`,
                        amount: MEAL_COST[meal],
                        timestamp: new Date().toISOString(),
                        relatedMeal: { date: dateString, meal },
                        tenantId,
                    };
                    newBillItems.push(newBill);
                }
                addHistory(HistoryType.ATTENDANCE_MANAGEMENT, `Marked ${meal} attendance for ${userName} on ${dateString}.`, actorId, tenantId);
            }
            return { ...prev, attendance: newAttendance, billItems: newBillItems };
        });
    };

    // Billing
    const addMiscCharge = (description: string, totalAmount: number, date: Date, meal: MealType | 'Both', actorId: string, tenantId: string) => {
        const dateString = format(date, 'yyyy-MM-dd');
        const allAttendees = meal === 'Both' 
            ? data.attendance.filter(a => a.date === dateString && a.tenantId === tenantId)
            : data.attendance.filter(a => a.date === dateString && a.meal === meal && a.tenantId === tenantId);
            
        const uniqueAttendeeIds = [...new Set(allAttendees.map(a => a.userId))];

        const billableAttendeeIds = uniqueAttendeeIds.filter(id => {
            const user = getUserById(id);
            if (!user) return false;
            return user.role === UserRole.STUDENT ||
                   (user.role === UserRole.ADMIN && (user as Admin).includeInBilling) ||
                   (user.role === UserRole.COOK && (user as Cook).includeInBilling);
        });

        if (billableAttendeeIds.length === 0) {
            alert("No billable users attended this meal/day to apply charges to.");
            return;
        }
        const chargePerUser = totalAmount / billableAttendeeIds.length;
        const descriptionText = meal === 'Both' ? `${description} (Both meals on ${dateString})` : `${description} (${meal} on ${dateString})`;

        const newBillItems: BillItem[] = billableAttendeeIds.map(userId => ({
            id: `bill-misc-${userId}-${Date.now()}`,
            userId,
            type: BillItemType.MISC,
            description: descriptionText,
            amount: chargePerUser,
            timestamp: new Date().toISOString(),
            tenantId,
        }));
        
        setData(prev => ({ ...prev, billItems: [...prev.billItems, ...newBillItems] }));
        const historyDescription = `Added misc charge of Rs. ${totalAmount} for ${meal} on ${dateString}, affecting ${billableAttendeeIds.length} billable users.`;
        addHistory(HistoryType.FINANCIAL_ADMIN, historyDescription, actorId, tenantId);
    };

    const addPayment = (userId: string, amount: number, actorId: string) => {
        const user = getUserById(userId);
        if(!user) return;
        const newPayment: BillItem = {
            id: `bill-payment-${userId}-${Date.now()}`,
            userId,
            type: BillItemType.PAYMENT,
            description: 'Payment Received',
            amount: -amount,
            timestamp: new Date().toISOString(),
            tenantId: user.tenantId,
        };
        setData(prev => ({...prev, billItems: [...prev.billItems, newPayment]}));
        addHistory(HistoryType.FINANCIAL_ADMIN, `Recorded payment of Rs. ${amount} for user ${user.name}.`, actorId, user.tenantId);
    };
    
    // Cook finances
    const addCookTransaction = (type: 'given' | 'returned' | 'adjustment', amount: number, adminId: string, tenantId: string, reason?: string) => {
        const newTransaction: CookTransaction = {
            id: `cook-tx-${Date.now()}`,
            type,
            amount,
            reason,
            timestamp: new Date().toISOString(),
            adminId,
            tenantId,
        };
        setData(prev => ({ ...prev, cookTransactions: [newTransaction, ...prev.cookTransactions]}));
        addHistory(HistoryType.FINANCIAL_ADMIN, `Cook transaction: ${type} Rs. ${amount}.`, adminId, tenantId);
    };

    // Notifications
    const sendNotification = (content: string, recipientIds: string[], senderId: string, tenantId: string) => {
        const newNotif: Notification = {
            id: `notif-${Date.now()}`,
            content,
            recipientIds,
            senderId,
            timestamp: new
Date().toISOString(),
            readBy: [],
            tenantId,
        };
        setData(prev => ({ ...prev, notifications: [newNotif, ...prev.notifications] }));
        addHistory(HistoryType.SYSTEM, `Sent notification to ${recipientIds.length > 10 ? `${recipientIds.length} users` : recipientIds.join(', ')}.`, senderId, tenantId);
    };

    const markNotificationAsRead = (notificationId: string, userId: string) => {
        setData(prev => {
            const newNotifs = prev.notifications.map(n => {
                if (n.id === notificationId && !n.readBy.includes(userId)) {
                    return { ...n, readBy: [...n.readBy, userId] };
                }
                return n;
            });
            return { ...prev, notifications: newNotifs };
        });
    };
    
    // Registration
    const addRegistrationRequest = (requestData: Omit<RegistrationRequest, 'id' | 'status' | 'timestamp'>) => {
        const newRequest: RegistrationRequest = {
            ...requestData,
            id: `reg-${Date.now()}`,
            status: 'pending',
            timestamp: new Date().toISOString(),
        };
        setData(prev => ({ ...prev, registrationRequests: [newRequest, ...prev.registrationRequests] }));
        addHistory(HistoryType.TENANT_MANAGEMENT, `New registration request from ${requestData.name} (${requestData.username}).`, 'system', 'system');
    };

    const approveRegistrationRequest = (requestId: string, approverId: string) => {
        setData(prev => {
            const request = prev.registrationRequests.find(r => r.id === requestId);
            if (!request) return prev;
            
            const newTenantId = `tenant-${Date.now()}`;
            const newAdminId = `user-${Date.now()}`;

            const newAdmin: Admin = {
                id: newAdminId,
                name: request.username,
                password: request.password,
                role: UserRole.ADMIN,
                includeInBilling: false,
                isSuperAdmin: false,
                tenantId: newTenantId,
            };
            
            const newTenant: Tenant = {
                id: newTenantId,
                name: `${request.name}'s Mess`,
                ownerId: newAdminId,
                settings: getInitialData().tenants[0].settings // copy default settings
            };
            
            // FIX: Explicitly type `updatedRequests` to prevent TypeScript from widening the `status` property to `string`.
            const updatedRequests: RegistrationRequest[] = prev.registrationRequests.map(r => r.id === requestId ? { ...r, status: 'approved' } : r);

            addHistory(HistoryType.TENANT_MANAGEMENT, `Approved request for ${request.name}. Created new tenant: ${newTenant.name}.`, approverId, 'system');

            return {
                ...prev,
                users: [...prev.users, newAdmin],
                tenants: [...prev.tenants, newTenant],
                registrationRequests: updatedRequests,
            };
        });
    };

    const rejectRegistrationRequest = (requestId: string, approverId: string) => {
        const request = data.registrationRequests.find(r => r.id === requestId);
        if (!request) return;

        setData(prev => ({
            ...prev,
            registrationRequests: prev.registrationRequests.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r)
        }));
        addHistory(HistoryType.TENANT_MANAGEMENT, `Rejected registration request for ${request.name}.`, approverId, 'system');
    };

    return {
        data,
        actions: {
            findUserByUsername,
            getUserById,
            addUser,
            updateUser,
            deleteUser,
            updateSettings,
            getMenuForDate,
            setMenu,
            isMealTime,
            getUserAttendance,
            toggleAttendance,
            addMiscCharge,
            addPayment,
            addCookTransaction,
            sendNotification,
            markNotificationAsRead,
            addRegistrationRequest,
            approveRegistrationRequest,
            rejectRegistrationRequest,
        }
    };
};
