import React, { useEffect, useState } from "react";
import { 
    View, 
    Text, 
    FlatList, 
    StyleSheet, 
    TouchableOpacity, 
    Alert, 
    ActivityIndicator,
    SafeAreaView 
} from "react-native";
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";
// Đảm bảo firebaseConfig.ts có export 'db'
import { db } from "../../firebaseConfig"; 

// Khai báo kiểu dữ liệu cho dữ liệu chấm công
interface AttendanceRecord {
    id: string;
    uid: string;
    date: string; // YYYY-MM-DD
    checkIn: string | null; // ISO string
    checkOut: string | null; // ISO string
}

// Khai báo kiểu cho user
interface User {
    uid: string;
    name: string;
    // Thêm các trường khác nếu cần
}

export default function ChamCongScreen({ route }: any) {
    const { user } = route.params as { user: User }; 
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isChecking, setIsChecking] = useState(false);
    
    // Lấy ngày hiện tại ở định dạng YYYY-MM-DD
    const today = new Date().toISOString().slice(0, 10); 

    // Fetch dữ liệu chấm công của nhân viên
    useEffect(() => {
        setIsLoading(true);
        const q = query(collection(db, "attendance"), where("uid", "==", user.uid));
        
        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as AttendanceRecord[];
            
            // Sắp xếp client-side theo ngày giảm dần
            data.sort((a, b) => b.date.localeCompare(a.date));

            setAttendance(data);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching attendance:", error);
            setIsLoading(false);
        });
        
        return () => unsub();
    }, [user.uid]);

    // Lấy bản ghi chấm công của ngày hôm nay (YYYY-MM-DD)
    const todayRecord = attendance.find(a => a.date === today);

    const handleCheckIn = async () => {
        if (isChecking) return;
        
        if (todayRecord && todayRecord.checkIn) {
            Alert.alert("Thông báo", "Bạn đã Check-in hôm nay!");
            return;
        }
        
        try {
            setIsChecking(true);
            await addDoc(collection(db, "attendance"), {
                uid: user.uid,
                date: today,
                checkIn: new Date().toISOString(),
                checkOut: null,
            });
            Alert.alert("Thành công", `Check-in thành công lúc ${new Date().toLocaleTimeString('vi-VN')}!`);
        } catch (error) {
            console.error("Lỗi Check-in:", error);
            Alert.alert("Lỗi", "Không thể Check-in. Vui lòng thử lại.");
        } finally {
            setIsChecking(false);
        }
    };

    const handleCheckOut = async () => {
        if (isChecking) return;
        
        if (!todayRecord || !todayRecord.checkIn) {
            Alert.alert("Thông báo", "Vui lòng Check-in trước khi Check-out!");
            return;
        }
        
        if (todayRecord.checkOut) {
            Alert.alert("Thông báo", "Bạn đã Check-out hôm nay!");
            return;
        }
        
        try {
            setIsChecking(true);
            const attendanceRef = doc(db, "attendance", todayRecord.id);
            await updateDoc(attendanceRef, {
                checkOut: new Date().toISOString()
            });
            Alert.alert("Thành công", `Check-out thành công lúc ${new Date().toLocaleTimeString('vi-VN')}!`);
        } catch (error) {
            console.error("Lỗi Check-out:", error);
            Alert.alert("Lỗi", "Không thể Check-out. Vui lòng thử lại.");
        } finally {
            setIsChecking(false);
        }
    };

    // Tính toán trạng thái disabled
    const isCheckInDisabled = !!todayRecord?.checkIn || isChecking;
    const isCheckOutDisabled = !todayRecord?.checkIn || !!todayRecord?.checkOut || isChecking;

    // Hiển thị trạng thái chấm công hôm nay
    const renderTodayStatus = () => {
        const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
        const checkInTime = todayRecord?.checkIn 
            ? new Date(todayRecord.checkIn).toLocaleTimeString('vi-VN', timeOptions) 
            : "--:--";
        const checkOutTime = todayRecord?.checkOut 
            ? new Date(todayRecord.checkOut).toLocaleTimeString('vi-VN', timeOptions) 
            : "Chưa Check-out";
        
        let totalHours = null;
        if (todayRecord?.checkIn && todayRecord?.checkOut) {
            const diffInMilliseconds = new Date(todayRecord.checkOut).getTime() - new Date(todayRecord.checkIn).getTime();
            totalHours = (diffInMilliseconds / (1000 * 60 * 60)).toFixed(2);
        }

        return (
            <View style={styles.todayCard}>
                <Text style={styles.todayCardTitle}>Trạng thái ngày hôm nay ({new Date().toLocaleDateString('vi-VN')})</Text>
                
                <View style={styles.row}>
                    <Text style={styles.label}>Check-in:</Text>
                    <Text style={[styles.value, { color: todayRecord?.checkIn ? '#4CAF50' : '#E53935' }]}>
                        {checkInTime}
                    </Text>
                </View>
                
                <View style={styles.row}>
                    <Text style={styles.label}>Check-out:</Text>
                    <Text style={[styles.value, { color: todayRecord?.checkOut ? '#E53935' : '#777' }]}>
                        {checkOutTime}
                    </Text>
                </View>

                {totalHours && (
                    <View style={styles.row}>
                        <Text style={styles.label}>Tổng giờ làm:</Text>
                        <Text style={[styles.value, styles.totalHoursText]}>
                            {totalHours} giờ
                        </Text>
                    </View>
                )}
            </View>
        );
    }

    const renderItem = ({ item }: { item: AttendanceRecord }) => {
        const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
        
        const checkInTime = item.checkIn 
            ? new Date(item.checkIn).toLocaleTimeString('vi-VN', timeOptions) 
            : "--:--";
        
        const checkOutTime = item.checkOut 
            ? new Date(item.checkOut).toLocaleTimeString('vi-VN', timeOptions) 
            : "--:--";
        
        let totalHours = null;
        if (item.checkIn && item.checkOut) {
            const diffInMilliseconds = new Date(item.checkOut).getTime() - new Date(item.checkIn).getTime();
            totalHours = (diffInMilliseconds / (1000 * 60 * 60)).toFixed(2);
        }

        return (
            <View style={styles.item}>
                <Text style={styles.itemDate}>{item.date}</Text>

                <View style={styles.itemRow}>
                    <Text style={{ color: '#555' }}>⏰ Check-in: </Text>
                    <Text style={{ fontWeight: 'bold', color: '#4CAF50' }}>{checkInTime}</Text>
                </View>
                <View style={styles.itemRow}>
                    <Text style={{ color: '#555' }}>🚪 Check-out: </Text>
                    <Text style={{ fontWeight: 'bold', color: '#E53935' }}>{checkOutTime}</Text>
                </View>
                {totalHours && (
                    <View style={[styles.itemRow, { borderTopWidth: 1, borderTopColor: '#eee', marginTop: 5, paddingTop: 5 }]}>
                        <Text style={{ color: '#007bff', fontWeight: 'bold' }}>Tổng giờ:</Text>
                        <Text style={{ fontWeight: 'bold', color: '#007bff' }}>{totalHours} giờ</Text>
                    </View>
                )}
            </View>
        );
    };

    if (isLoading) {
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
                <Text style={styles.title}>CHẤM CÔNG NHÂN VIÊN</Text>

                {renderTodayStatus()}

                <View style={styles.buttonContainer}>
                    {/* Nút Check-in */}
                    <TouchableOpacity 
                        style={[styles.btn, { backgroundColor: isCheckInDisabled ? '#ccc' : '#4CAF50' }]} 
                        onPress={handleCheckIn}
                        disabled={isCheckInDisabled}
                    >
                        <Text style={styles.btnText}>
                            {isChecking && !todayRecord?.checkIn ? 'Đang Check-in...' : 'CHECK-IN'}
                        </Text>
                    </TouchableOpacity>
                    
                    {/* Nút Check-out */}
                    <TouchableOpacity 
                        style={[styles.btn, { backgroundColor: isCheckOutDisabled ? '#ccc' : '#E53935' }]} 
                        onPress={handleCheckOut}
                        disabled={isCheckOutDisabled}
                    >
                        <Text style={styles.btnText}>
                            {isChecking && !todayRecord?.checkOut ? 'Đang Check-out...' : 'CHECK-OUT'}
                        </Text>
                    </TouchableOpacity>
                </View>
                
                <Text style={styles.historyTitle}>Lịch sử chấm công ({attendance.length})</Text>

                <FlatList
                    data={attendance}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Chưa có dữ liệu chấm công nào.</Text>
                        </View>
                    }
                    contentContainerStyle={attendance.length === 0 ? { flexGrow: 1 } : {}}
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
        marginBottom: 10, 
        color: '#333', 
        textAlign: 'center',
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd'
    },
    // Trạng thái hôm nay
    todayCard: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        borderLeftWidth: 5,
        borderLeftColor: '#4a90e2',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    todayCardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#4a90e2',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f5',
        paddingBottom: 5,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3,
    },
    label: {
        fontSize: 15,
        color: '#555',
    },
    value: {
        fontSize: 15,
        fontWeight: '600',
    },
    totalHoursText: {
        color: '#007bff',
        fontWeight: 'bold',
    },
    // Nút
    buttonContainer: { 
        flexDirection: "row", 
        marginBottom: 20, 
        justifyContent: 'space-around', 
        paddingBottom: 15
    },
    btn: {
        padding: 12,
        borderRadius: 8,
        flex: 1,
        marginHorizontal: 5,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    btnText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 16,
    },
    // Lịch sử
    historyTitle: { 
        fontSize: 18, 
        fontWeight: '600', 
        marginBottom: 10, 
        color: '#4a90e2' 
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
    },
    itemDate: {
        fontSize: 17, 
        fontWeight: 'bold', 
        marginBottom: 5, 
        color: '#333',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 5
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 2,
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