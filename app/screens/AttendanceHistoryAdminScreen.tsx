import React, { useEffect, useState } from "react";
import { 
    View, 
    Text, 
    FlatList, 
    StyleSheet, 
    SafeAreaView, 
    ActivityIndicator,
    Alert 
} from "react-native";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig"; 

// Khai báo kiểu dữ liệu cho dữ liệu chấm công
interface AttendanceRecord {
    id: string;
    uid: string;
    date: string; // YYYY-MM-DD
    checkIn: string | null; // ISO string
    checkOut: string | null; // ISO string
}

// Khai báo kiểu cho dữ liệu người dùng (dùng để tra tên)
interface UserInfo {
    uid: string;
    name: string;
    [key: string]: any;
}

export default function AttendanceHistoryAdminScreen() {
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [users, setUsers] = useState<UserInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // 1. Fetch danh sách Users (để ánh xạ UID ra tên nhân viên)
    useEffect(() => {
        const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
            const usersData = snapshot.docs.map((d) => ({ uid: d.id, ...d.data() })) as UserInfo[];
            setUsers(usersData);
        }, (error) => {
            console.error("Lỗi tải danh sách người dùng:", error);
        });
        return () => unsubUsers();
    }, []);

    // 2. Fetch toàn bộ Attendance Records (thời gian thực)
    useEffect(() => {
        setIsLoading(true);
        // ⭐ QUAN TRỌNG: Truy vấn toàn bộ collection 'attendance'
        const q = collection(db, "attendance");
        
        const unsubAttendance = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as AttendanceRecord[];
            
            // Sắp xếp dữ liệu theo ngày mới nhất (giảm dần)
            data.sort((a, b) => b.date.localeCompare(a.date));

            setAttendanceRecords(data);
            setIsLoading(false);
        }, (error) => {
            console.error("Lỗi fetching attendance:", error);
            Alert.alert("Lỗi", "Không thể tải lịch sử chấm công.");
            setIsLoading(false);
        });
        
        return () => unsubAttendance();
    }, []);
    
    // Hàm tìm tên nhân viên
    const getUserName = (uid: string) => {
        const user = users.find(u => u.uid === uid);
        return user ? user.name : "Không rõ";
    }

    const renderItem = ({ item }: { item: AttendanceRecord }) => {
        const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
        
        const checkInTime = item.checkIn 
            ? new Date(item.checkIn).toLocaleTimeString('vi-VN', timeOptions) 
            : "--:--";
        
        const checkOutTime = item.checkOut 
            ? new Date(item.checkOut).toLocaleTimeString('vi-VN', timeOptions) 
            : "Chưa Check-out";
        
        let totalHours = null;
        if (item.checkIn && item.checkOut) {
            const diffInMilliseconds = new Date(item.checkOut).getTime() - new Date(item.checkIn).getTime();
            totalHours = (diffInMilliseconds / (1000 * 60 * 60)).toFixed(2);
        }

        return (
            <View style={styles.item}>
                <Text style={styles.itemDate}>{item.date}</Text>
                <Text style={styles.itemName}>Nhân viên: {getUserName(item.uid)}</Text>

                <View style={styles.itemRow}>
                    <Text style={{ color: '#555' }}>⏰ Check-in: </Text>
                    <Text style={{ fontWeight: 'bold', color: '#4CAF50' }}>{checkInTime}</Text>
                </View>
                <View style={styles.itemRow}>
                    <Text style={{ color: '#555' }}>🚪 Check-out: </Text>
                    <Text style={{ fontWeight: 'bold', color: item.checkOut ? '#E53935' : '#777' }}>{checkOutTime}</Text>
                </View>
                {totalHours && (
                    <View style={[styles.itemRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>Tổng giờ làm:</Text>
                        <Text style={styles.totalValue}>{totalHours} giờ</Text>
                    </View>
                )}
            </View>
        );
    };

    if (isLoading || users.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text style={{marginTop: 10, color: '#555'}}>Đang tải dữ liệu chấm công...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <Text style={styles.title}>LỊCH SỬ CHẤM CÔNG (Admin)</Text>
                
                <FlatList
                    data={attendanceRecords}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Chưa có dữ liệu chấm công nào từ nhân viên.</Text>
                        </View>
                    }
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f0f0f5' },
    container: { flex: 1, padding: 16, backgroundColor: '#f0f0f5' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { 
        fontSize: 20, 
        fontWeight: "bold", 
        marginBottom: 20, 
        color: '#333', 
        textAlign: 'center',
    },
    item: { 
        padding: 15, 
        backgroundColor: "#fff", 
        marginBottom: 10, 
        borderRadius: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        borderLeftWidth: 5,
        borderLeftColor: '#4a90e2'
    },
    itemDate: {
        fontSize: 18, 
        fontWeight: 'bold', 
        marginBottom: 5, 
        color: '#333',
    },
    itemName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 10,
        color: '#007bff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 5
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 2,
    },
    totalRow: {
        borderTopWidth: 1, 
        borderTopColor: '#eee', 
        marginTop: 5, 
        paddingTop: 5,
    },
    totalLabel: {
        color: '#007bff', 
        fontWeight: 'bold' 
    },
    totalValue: {
        fontWeight: 'bold', 
        color: '#007bff'
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 50,
    },
    emptyText: {
        textAlign: 'center', 
        color: '#999', 
        fontSize: 16
    }
});