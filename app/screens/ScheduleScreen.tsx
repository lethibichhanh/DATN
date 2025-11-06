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
import { doc, onSnapshot } from "firebase/firestore"; // Import Firestore functions
import { db } from "../../firebaseConfig"; // Đảm bảo firebaseConfig.ts có db
import type { User, Shift } from "../../types"; // ⭐ Import type từ file types

// Khai báo kiểu dữ liệu cho route.params
interface LichLamViecProps {
    route: {
        params: {
            user: User; // Sử dụng type User từ types.ts
        };
    };
    navigation: any;
}


export default function LichLamViecScreen({ route, navigation }: LichLamViecProps) {
    // Ép kiểu cho route.params để TypeScript hiểu được cấu trúc
    const { user } = route.params; 
    
    // Khởi tạo state cho lịch làm việc và loading
    const [schedule, setSchedule] = useState<Shift[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Cập nhật tiêu đề màn hình với tên nhân viên
        if (user?.name) {
            navigation.setOptions({ title: `Lịch làm việc của ${user.name}` });
        }
        
        if (!user.uid) {
            setIsLoading(false);
            Alert.alert("Lỗi", "Không tìm thấy UID nhân viên.");
            return;
        }

        // ⭐ Lắng nghe thay đổi trên document của user để lấy shiftSchedule
        const userRef = doc(db, "users", user.uid);
        const unsub = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const userData = docSnap.data() as User;
                // Nếu shiftSchedule tồn tại, cập nhật state
                const currentSchedule = userData.shiftSchedule || [];
                setSchedule(currentSchedule);
            } else {
                setSchedule([]); // Không có dữ liệu lịch làm việc
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Lỗi khi fetch lịch làm việc:", error);
            Alert.alert("Lỗi", "Không thể tải lịch làm việc.");
            setIsLoading(false);
        });

        return () => unsub();
    }, [user.uid, user.name, navigation]);


    // Hàm định dạng thời gian HH:mm (đơn giản, giả sử input đã sạch)
    const formatTime = (time: string) => time || "Ngày nghỉ";

    const isDayOff = (shift: Shift) => shift.start === "Ngày nghỉ" && shift.end === "Ngày nghỉ";
    
    // Hàm chuyển sang màn hình thiết lập lịch
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
                <Text style={styles.setupButtonText}>Thiết Lập Lịch Làm Việc</Text>
            </TouchableOpacity>

            <FlatList
                data={schedule}
                keyExtractor={(item, index) => item.day + index}
                renderItem={({ item }) => (
                    <View style={[styles.item, isDayOff(item) && styles.dayOffItem]}>
                        <View>
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
                        <Text>Nhân viên chưa có lịch làm việc được thiết lập.</Text>
                        <Text>Vui lòng nhấn nút "Thiết Lập Lịch Làm Việc".</Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { 
        fontSize: 22, 
        fontWeight: "bold", 
        marginBottom: 20, 
        color: '#333', 
        textAlign: 'center' 
    },
    // Style cho nút Setup
    setupButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4a90e2',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        // Hiệu ứng nhẹ
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
        borderLeftColor: '#4a90e2', // Màu mặc định cho ngày làm việc
    },
    dayOffItem: {
        backgroundColor: '#fff0f0', // Nền nhẹ hơn cho ngày nghỉ
        borderLeftColor: '#f00', // Border đỏ cho ngày nghỉ
    },
    dayTitle: {
        fontSize: 16,
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