import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../../firebaseConfig"; // Đảm bảo firebaseConfig.ts có db
import { doc, onSnapshot } from "firebase/firestore"; // Import Firestore functions

interface Shift {
    day: string; // Tên ngày (ví dụ: Thứ Hai)
    start: string; // Giờ bắt đầu (ví dụ: 08:00)
    end: string; // Giờ kết thúc (ví dụ: 17:00)
}

interface UserInfo {
    uid: string; // Cần uid để fetch data
    name: string;
    shiftSchedule?: Shift[]; 
    [key: string]: any;
}

export default function LichLamViecScreen({ route, navigation }: any) {
    const { user } = route.params as { user: UserInfo };
    // Khởi tạo state cho lịch làm việc và loading
    const [schedule, setSchedule] = useState<Shift[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user.uid) {
            setIsLoading(false);
            return;
        }

        // ⭐ Lắng nghe thay đổi trên document của user để lấy shiftSchedule
        const userRef = doc(db, "users", user.uid);
        const unsub = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const userData = docSnap.data() as UserInfo;
                // Lấy schedule, đảm bảo là mảng rỗng nếu không có
                setSchedule((userData.shiftSchedule as Shift[] | undefined) || []);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Lỗi fetching schedule:", error);
            setIsLoading(false);
        });

        return () => unsub();
    }, [user.uid]);

    const renderItem = ({ item }: { item: Shift }) => {
        // Nếu giờ bắt đầu và kết thúc giống nhau (ví dụ: 00:00 - 00:00), coi là nghỉ
        const isDayOff = item.start === item.end;

        return (
            <View style={styles.item}>
                <Text style={styles.dayText}>🗓 {item.day}</Text>
                <Text style={[styles.shiftText, { color: isDayOff ? '#d0021b' : '#333' }]}>
                    {isDayOff 
                        ? "NGHỈ"
                        : (<>
                            <Text style={{fontWeight: 'bold', color: '#007bff'}}>{item.start}</Text> 
                            - 
                            <Text style={{fontWeight: 'bold', color: '#d0021b'}}>{item.end}</Text>
                          </>)
                    }
                </Text>
            </View>
        );
    };
    
    // Hiển thị loading
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4a90e2" />
                <Text>Đang tải lịch làm việc...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={{flex: 1}}>
            <View style={styles.container}>
                <Text style={styles.title}>🗓 Lịch làm việc: {user.name}</Text>
                
                {/* ⭐ Nút Thêm/Chỉnh sửa (Chuyển đến màn hình SetupLichLamViec) */}
                <TouchableOpacity 
                    style={styles.setupButton}
                    onPress={() => navigation.navigate("SetupLichLamViec", { user })}
                >
                    <Ionicons name="settings-outline" size={20} color="#fff" />
                    <Text style={styles.setupButtonText}>{schedule.length > 0 ? "Chỉnh sửa Lịch làm việc" : "Thiết lập Lịch làm việc"}</Text>
                </TouchableOpacity>

                <FlatList
                    data={schedule}
                    keyExtractor={(item) => item.day}
                    renderItem={renderItem}
                    ListEmptyComponent={() => (
                        <Text style={styles.emptyText}>Chưa có lịch làm việc được thiết lập.</Text>
                    )}
                />
            </View>
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
    },
    dayText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    shiftText: {
        fontSize: 16,
        color: '#555',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 30,
        fontSize: 16,
        color: '#999',
        fontStyle: 'italic',
    }
});