import React, { useEffect, useState } from "react";
import { 
    View, 
    Text, 
    FlatList, 
    StyleSheet, 
    SafeAreaView, 
    TouchableOpacity, 
    ActivityIndicator,
    Alert 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, onSnapshot } from "firebase/firestore"; 
import { db } from "../../firebaseConfig"; 
// DÒNG NÀY ĐÃ ĐƯỢC XÓA: import type { User, Shift } from "../../types"; 

// ⭐ ĐỊNH NGHĨA LẠI TYPES ĐỂ SỬA LỖI (Bổ sung dateKey)
interface Shift {
    day: string; // Thứ Hai, Thứ Ba, ...
    dateKey: string; // YYYY-MM-DD
    start: string; // Giờ bắt đầu (HH:mm) hoặc "OFF"
    end: string; // Giờ kết thúc (HH:mm) hoặc "OFF"
}

interface User {
    uid: string;
    email: string;
    name?: string;
    shiftSchedule?: Shift[]; // Thêm để tránh lỗi khi đọc data
}
// END OF TYPE DEFINITIONS

// Khai báo kiểu dữ liệu cho route.params
interface LichLamViecProps {
    route: {
        params: {
            user: User; 
        };
    };
    navigation: any;
}

// Hàm tiện ích để chuyển đổi YYYY-MM-DD sang DD/MM/YYYY
const formatDate = (dateKey: string) => {
    try {
        const [year, month, day] = dateKey.split('-');
        if (year && month && day) {
            return `${day}/${month}/${year}`;
        }
        return dateKey;
    } catch (e) {
        return dateKey;
    }
};

export default function LichLamViecScreen({ route, navigation }: LichLamViecProps) {
    const { user } = route.params; 
    
    const [schedule, setSchedule] = useState<Shift[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user?.name) {
            navigation.setOptions({ title: `Lịch làm việc của ${user.name}` });
        }
        
        if (!user.uid) {
            setIsLoading(false);
            Alert.alert("Lỗi", "Không tìm thấy UID nhân viên.");
            return;
        }

        const userRef = doc(db, "users", user.uid);
        const unsub = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const userData = docSnap.data() as User;
                const currentSchedule = userData.shiftSchedule || [];
                
                // ⭐ Lỗi 2339 đã được sửa do Shift đã có dateKey
                const sortedSchedule = (currentSchedule as Shift[]).sort((a, b) => {
                    return new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime();
                });
                
                setSchedule(sortedSchedule);
            } else {
                setSchedule([]); 
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Lỗi khi fetch lịch làm việc:", error);
            Alert.alert("Lỗi", "Không thể tải lịch làm việc.");
            setIsLoading(false);
        });

        return () => unsub();
    }, [user.uid, user.name, navigation]);

    const formatTime = (time: string) => (time === "OFF" ? "NGHỈ" : time);

    const isDayOff = (shift: Shift) => shift.start === "OFF" && shift.end === "OFF";
    
    const handleSetup = () => {
        navigation.navigate("SetupLichLamViec", { user: user });
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text style={{ marginTop: 10 }}>Đang tải lịch làm việc...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <TouchableOpacity style={styles.setupButton} onPress={handleSetup}>
                <Ionicons name="settings-outline" size={20} color="#fff" />
                <Text style={styles.setupButtonText}>Thiết Lập Lịch Tuần Hiện Tại</Text>
            </TouchableOpacity>
            
            <FlatList
                data={schedule}
                // ⭐ Lỗi 2339 đã được sửa
                keyExtractor={(item) => item.dateKey} 
                renderItem={({ item }) => (
                    <View style={[styles.item, isDayOff(item) && styles.dayOffItem]}>
                        <View>
                            {/* ⭐ Lỗi 2339 đã được sửa */}
                            <Text style={styles.dateTitle}>{formatDate(item.dateKey)}</Text>
                            <Text style={styles.dayTitle}>{item.day}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            {isDayOff(item) ? (
                                <Text style={styles.timeTextOff}>NGHỈ</Text>
                            ) : (
                                <Text style={styles.timeText}>{formatTime(item.start)} - {formatTime(item.end)}</Text>
                            )}
                        </View>
                    </View>
                )}
                ListEmptyComponent={() => (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text>Nhân viên chưa có lịch làm việc được thiết lập cho tuần này.</Text>
                        <Text>Vui lòng nhấn nút "Thiết Lập Lịch Tuần Hiện Tại".</Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    setupButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4a90e2',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3, 
    },
    setupButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    item: { 
        padding: 15, 
        backgroundColor: "#fff", 
        marginBottom: 10, 
        borderRadius: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1.41,
        elevation: 2,
        borderLeftWidth: 4,
        borderLeftColor: '#4a90e2', 
    },
    dayOffItem: {
        backgroundColor: '#fff0f0', 
        borderLeftColor: '#f00', 
    },
    dateTitle: { 
        fontSize: 14,
        color: '#777',
        fontWeight: '400',
    },
    dayTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    timeText: {
        fontSize: 16,
        color: '#555',
        fontWeight: '500',
    },
    timeTextOff: {
        fontSize: 16,
        color: '#f00',
        fontWeight: '600',
    },
});