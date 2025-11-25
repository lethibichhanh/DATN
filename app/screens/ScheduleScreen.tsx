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

// ⭐ Import TYPES từ React Navigation và file types gốc
import { NativeStackScreenProps } from '@react-navigation/native-stack';
// Giả định file types nằm ở thư mục gốc của project
import type { RootStackParamList, User, Timestamp } from "../../types"; 

// 💡 Do bạn đã xóa import từ "../../types" cho Shift và định nghĩa lại. 
// Tôi sẽ sử dụng định nghĩa Shift đã được bổ sung dateKey của bạn.
interface Shift {
    day: string; // Thứ Hai, Thứ Ba, ...
    dateKey: string; // YYYY-MM-DD (Bắt buộc để KeyExtractor hoạt động)
    start: string; // Giờ bắt đầu (HH:mm) hoặc "OFF"
    end: string; // Giờ kết thúc (HH:mm) hoặc "OFF"
}

// 💡 Cập nhật lại định nghĩa User để sử dụng kiểu Shift mới 
// và loại bỏ định nghĩa User trùng lặp nếu nó đã có trong "../../types"
interface LocalUser extends Omit<User, 'shiftSchedule'> {
    shiftSchedule?: Shift[]; // Sử dụng kiểu Shift đã cập nhật
}


// ⭐ KHẮC PHỤC LỖI TS2322 BẰNG CÁCH SỬ DỤNG UTILITY TYPE CHUẨN CỦA RN
// Lỗi TS2322 trong AppNavigator.tsx sẽ được giải quyết khi dùng kiểu này.
type LichLamViecScreenProps = NativeStackScreenProps<RootStackParamList, 'LichLamViec'>;


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

// Sử dụng LichLamViecScreenProps
export default function LichLamViecScreen({ route, navigation }: LichLamViecScreenProps) {
    // route.params chắc chắn có user vì đã khai báo trong RootStackParamList
    const { user } = route.params; 
    
    const [schedule, setSchedule] = useState<Shift[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Thiết lập tiêu đề màn hình
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
                // Ép kiểu sang LocalUser để đảm bảo shiftSchedule có định dạng dateKey
                const userData = docSnap.data() as LocalUser; 
                const currentSchedule = userData.shiftSchedule || [];
                
                // Sắp xếp theo dateKey để lịch làm việc hiển thị theo thứ tự thời gian
                const sortedSchedule = (currentSchedule as Shift[]).sort((a, b) => {
                    // Chuyển đổi dateKey sang Date object để so sánh
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

        // Cleanup function
        return () => unsub();
    }, [user.uid, user.name, navigation]);

    const formatTime = (time: string) => (time === "OFF" ? "NGHỈ" : time);

    const isDayOff = (shift: Shift) => shift.start === "OFF" && shift.end === "OFF";
    
    const handleSetup = () => {
        // Điều hướng đến màn hình thiết lập lịch mẫu
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
                keyExtractor={(item) => item.dateKey} 
                renderItem={({ item }) => (
                    <View style={[styles.item, isDayOff(item) && styles.dayOffItem]}>
                        <View>
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
                        <Text style={{ marginBottom: 5 }}>Nhân viên chưa có lịch làm việc được thiết lập cho tuần này.</Text>
                        <Text style={{ fontWeight: '500' }}>Vui lòng nhấn nút "Thiết Lập Lịch Tuần Hiện Tại".</Text>
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