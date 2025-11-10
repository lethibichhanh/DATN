import { Ionicons } from "@expo/vector-icons";
import { collection, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { 
    Alert, 
    FlatList, 
    StyleSheet, 
    Text, 
    TouchableOpacity, 
    View, 
    SafeAreaView, 
    ActivityIndicator 
} from "react-native";
import { db } from "../../firebaseConfig";
import type { User } from "../../types";

export default function QuanLyNhanVienScreen({ navigation }: any) {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
            // Lọc các user không hợp lệ (ví dụ: thiếu tên) để tránh lỗi 'charAt'
            const data = snapshot.docs
                .map((d) => ({ uid: d.id, ...d.data() } as User))
                .filter(user => user.name && typeof user.name === 'string'); 

            setUsers(data);
            setIsLoading(false);
        }, (error) => {
            console.error("Lỗi khi tải dữ liệu nhân viên:", error);
            setIsLoading(false);
            Alert.alert("Lỗi", "Không thể tải danh sách nhân viên.");
        });
        return () => unsub();
    }, []);

    const handleDelete = (uid: string, name: string) => {
        Alert.alert(
            "Xác nhận xóa", 
            `Bạn có chắc chắn muốn xóa nhân viên ${name} không?`, 
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, "users", uid));
                        } catch (error) {
                            console.error("Lỗi xóa nhân viên:", error);
                            Alert.alert("Lỗi", "Không thể xóa nhân viên này.");
                        }
                    },
                },
            ]
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text style={{ marginTop: 10 }}>Đang tải danh sách nhân viên...</Text>
            </View>
        );
    }
    
    // Mảng định nghĩa các nút chức năng
    const actionButtons = [
        { name: "Chỉnh sửa", icon: "create-outline", color: "#FF9800", nav: "DangKyNhanVien", paramsKey: "editUser" },
        { name: "Lịch làm việc", icon: "calendar-outline", color: "#2196F3", nav: "LichLamViec", paramsKey: "user" },
        { name: "Chấm công", icon: "checkmark-done-outline", color: "#4CAF50", nav: "ChamCong", paramsKey: "user" },
        { name: "Bảng lương", icon: "cash-outline", color: "#9C27B0", nav: "BangLuong", paramsKey: "user" },
    ];

    const renderItem = ({ item }: { item: User }) => {
        // Kiểm tra an toàn cho item.name
        const initial = item.name ? item.name.charAt(0).toUpperCase() : '?'; 

        return (
            <View style={styles.itemCard}>
                {/* Employee Info */}
                <View style={styles.infoContainer}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initial}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 15 }}>
                        <Text style={styles.name}>
                            {item.name} <Text style={styles.roleText}>({item.role})</Text>
                        </Text>
                        <Text style={styles.email}>{item.email}</Text>
                        <Text style={styles.salaryText}>
                            Lương: <Text style={{ fontWeight: '600', color: '#333' }}>
                                {item.salary ? `${item.salary.toLocaleString('vi-VN')} VNĐ` : "Chưa thiết lập"}
                            </Text>
                        </Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonRow}>
                    {actionButtons.map((btn) => (
                        <TouchableOpacity
                            key={btn.name}
                            style={[styles.actionBtn, { backgroundColor: btn.color }]}
                            onPress={() => navigation.navigate(btn.nav, { [btn.paramsKey]: item })}
                        >
                            <Ionicons name={btn.icon as any} size={18} color="#fff" />
                        </TouchableOpacity>
                    ))}
                    
                    {/* Delete Button (Separate for emphasis) */}
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.deleteBtn]}
                        onPress={() => handleDelete(item.uid, item.name)}
                    >
                        <Ionicons name="trash-outline" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <Text style={styles.headerTitle}>
                    <Ionicons name="people-circle" size={26} color="#007bff" /> Quản lý nhân viên
                </Text>

                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => navigation.navigate("DangKyNhanVien")}
                >
                    <Ionicons name="person-add" size={20} color="#fff" />
                    <Text style={styles.addBtnText}>Thêm nhân viên mới</Text>
                </TouchableOpacity>

                <FlatList
                    data={users}
                    keyExtractor={(item) => item.uid}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Chưa có nhân viên nào được thêm.</Text>
                            <Text style={styles.emptyTextSecondary}>Hãy nhấn "Thêm nhân viên mới" để bắt đầu.</Text>
                        </View>
                    )}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f5f5f5', 
    },
    container: { 
        flex: 1, 
        paddingHorizontal: 16, 
        paddingTop: 10,
    },
    loadingContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    headerTitle: { 
        fontSize: 24, 
        fontWeight: "700", 
        marginBottom: 20, 
        color: '#333', 
        textAlign: 'center' 
    },
    // Nút Thêm
    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: 'center',
        backgroundColor: "#007bff", 
        padding: 14,
        borderRadius: 10,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 4.65,
        elevation: 6,
    },
    addBtnText: { 
        color: "#fff", 
        marginLeft: 10, 
        fontSize: 16, 
        fontWeight: '600' 
    },
    // Card Nhân viên
    itemCard: {
        backgroundColor: "#fff", 
        padding: 15, 
        borderRadius: 12,
        marginBottom: 15,
        borderLeftWidth: 5, 
        borderLeftColor: '#007bff',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 10,
    },
    avatar: {
        width: 45,
        height: 45,
        borderRadius: 25,
        backgroundColor: '#4a90e2', // Màu avatar đẹp
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    name: { 
        fontWeight: "700", 
        fontSize: 18, 
        color: '#333' 
    },
    roleText: {
        fontWeight: '500',
        fontSize: 14,
        color: '#666'
    },
    email: { 
        color: "#888", 
        fontSize: 14, 
        marginTop: 2 
    },
    salaryText: {
        fontSize: 14,
        color: '#555',
        marginTop: 5,
    },
    // Hàng nút chức năng
    buttonRow: { 
        flexDirection: "row", 
        justifyContent: 'flex-end',
        alignItems: 'center',
        flexWrap: 'wrap', 
        paddingTop: 5,
    },
    actionBtn: { 
        padding: 10, 
        borderRadius: 8, 
        marginHorizontal: 4,
        marginTop: 5,
    },
    deleteBtn: {
        backgroundColor: "#E53935", // Màu đỏ nổi bật
        marginLeft: 10,
    },
    // Khi danh sách trống
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        marginTop: 20,
    },
    emptyText: {
        fontSize: 16,
        color: '#555',
        fontWeight: '500',
    },
    emptyTextSecondary: {
        fontSize: 14,
        color: '#888',
        marginTop: 5,
    }
});