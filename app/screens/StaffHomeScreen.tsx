import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
// Firebase & Firestore Imports
import { User as FirebaseAuthUser, getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, doc, onSnapshot } from "firebase/firestore";
// React Imports
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { db } from "../../firebaseConfig";
import type { RootStackParamList, User } from "../../types";

// =======================================================
// ⭐ CUSTOM HOOK: LẤY THÔNG TIN USER TỪ FIREBASE AUTH VÀ FIRESTORE
// =======================================================
const useCurrentUser = (): User | null => {
    // State chứa đối tượng User đầy đủ từ Firestore
    const [currentUser, setCurrentUser] = useState<User | null>(null); 
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);

    useEffect(() => {
        // Khởi tạo Auth
        const auth = getAuth(); 
        let unsubscribeFirestore: (() => void) | null = null;
        
        // 1. Lắng nghe trạng thái đăng nhập (Authentication State)
        const unsubscribeAuth = onAuthStateChanged(auth, (authUser: FirebaseAuthUser | null) => {
            if (authUser) {
                // 2. Nếu đã đăng nhập, lắng nghe dữ liệu User từ Firestore
                const userRef = doc(db, "users", authUser.uid);
                
                unsubscribeFirestore = onSnapshot(userRef, (docSnap) => {
                    setIsLoadingAuth(false);
                    if (docSnap.exists()) {
                        // 3. Lấy dữ liệu và cập nhật State
                        const userData = docSnap.data() as Omit<User, 'uid'>;
                        setCurrentUser({ uid: authUser.uid, ...userData });
                    } else {
                        // User không có dữ liệu trong collection 'users'
                        setCurrentUser(null);
                    }
                }, (error) => {
                    console.error("Lỗi khi tải dữ liệu user từ Firestore:", error);
                    setIsLoadingAuth(false);
                    setCurrentUser(null);
                });

            } else {
                // Người dùng đã đăng xuất
                setIsLoadingAuth(false);
                setCurrentUser(null);
                // Hủy lắng nghe Firestore nếu có
                if (unsubscribeFirestore) {
                    unsubscribeFirestore();
                    unsubscribeFirestore = null;
                }
            }
        });

        // Cleanup: Hủy lắng nghe Auth và Firestore
        return () => {
            unsubscribeAuth();
            if (unsubscribeFirestore) {
                unsubscribeFirestore();
            }
        };
    }, []);

    // Bạn có thể trả về một đối tượng chứa currentUser và isLoadingAuth nếu cần
    return currentUser; 
};


// =======================================================
// 💊 CÁC CHỨC NĂNG CHUNG CỦA NHÂN VIÊN
// =======================================================
const features = [
    // Chức năng quản lý
    { title: "Quản lý Hóa đơn", icon: "receipt-outline", screen: "HoaDon" },
    { title: "Quản lý Nhập kho", icon: "download-outline", screen: "NhapKho" },
    // Nhân viên không nên có quyền Thống kê chi tiết, nhưng nếu cần:
    { title: "Xem Thống kê", icon: "bar-chart-outline", screen: "ThongKe" }, 
    { title: "Quản lý Kiểm kho", icon: "search-circle-outline", screen: "KiemKho" },

    // Kho thuốc
    { title: "Quản lý Thuốc", icon: "medkit-outline", screen: "DanhSachThuoc" },
    { title: "Thêm thuốc", icon: "add-circle-outline", screen: "ThemThuoc" },

    // Các danh mục
    { title: "Quản lý Xuất xứ", icon: "globe-outline", screen: "XuatXu" },
    { title: "Quản lý Đơn vị tính", icon: "grid-outline", screen: "DonViTinh" },
    { title: "Quản lý Danh mục", icon: "folder-outline", screen: "DanhMuc" },
];

export default function StaffHomeScreen() {
    const navigation = useNavigation<any>(); 
    const currentUser = useCurrentUser(); // Lấy thông tin user hiện tại thực tế
    
    const [doanhThu, setDoanhThu] = useState(0);
    const [muaHang, setMuaHang] = useState(0);
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    // =======================================================
    // 🔹 LOGIC THỐNG KÊ (Giữ nguyên)
    // =======================================================
    useEffect(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const unsubscribeFunctions: (() => void)[] = [];

        // Doanh thu từ "hoadons"
        const unsub1 = onSnapshot(collection(db, "hoadons"), (snapshot) => {
            let total = 0;
            snapshot.forEach((doc) => {
                const data = doc.data();
                const ngay = data.ngayBan?.toDate?.() || (data.ngayBan ? new Date(data.ngayBan.seconds * 1000) : null);

                if (ngay && ngay >= startOfMonth && ngay <= endOfMonth) {
                    total += data.tongTien || 0;
                }
            });
            setDoanhThu(total);
            setIsLoadingStats(false);
        }, (error) => {
            console.error("Lỗi khi tải doanh thu:", error);
            setIsLoadingStats(false);
        });
        unsubscribeFunctions.push(unsub1);

        // Mua hàng từ "phieunhap"
        const unsub2 = onSnapshot(collection(db, "phieunhap"), (snapshot) => {
            let total = 0;
            snapshot.forEach((doc) => {
                const data = doc.data();
                const ngay = data.ngayNhap?.toDate?.() || (data.ngayNhap ? new Date(data.ngayNhap.seconds * 1000) : null);

                if (ngay && ngay >= startOfMonth && ngay <= endOfMonth) {
                    total += data.tongGiaTri || 0; 
                }
            });
            setMuaHang(total);
        }, (error) => {
            console.error("Lỗi khi tải mua hàng:", error);
        });
        unsubscribeFunctions.push(unsub2);

        return () => {
            unsubscribeFunctions.forEach(unsub => unsub());
        };
    }, []);

    // Hiển thị loading nếu đang chờ thông tin người dùng
    if (!currentUser) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text style={{ marginTop: 10 }}>Đang tải thông tin người dùng...</Text>
            </View>
        );
    }

    const loiNhuan = doanhThu - muaHang;

    const stats = [
        { label: "Doanh thu (tháng này)", value: `${doanhThu.toLocaleString()} VNĐ`, color: "#d1f5d3" },
        { label: "Mua hàng", value: `${muaHang.toLocaleString()} VNĐ`, color: "#ffe0b2" },
        { label: "Lợi nhuận", value: `${loiNhuan.toLocaleString()} VNĐ`, color: "#b3e5fc" },
    ];

    // =======================================================
    // 🔹 COMPONENTS
    // =======================================================

    // Nút chức năng HR cá nhân
    const HRActionButton = ({ icon, title, screen }: { icon: any, title: string, screen: keyof RootStackParamList }) => (
        <TouchableOpacity 
            style={styles.hrActionButton} 
            onPress={() => navigation.navigate(screen as any, { user: currentUser })} 
        >
            <Ionicons name={icon} size={28} color="#fff" />
            <Text style={styles.hrActionButtonText}>{title}</Text>
        </TouchableOpacity>
    );

    const renderStat = ({ item }: any) => (
        <View style={[styles.statBox, { backgroundColor: item.color }]}>
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
        </View>
    );

    const renderFeature = ({ item }: any) => (
        <TouchableOpacity
            style={styles.featureCard}
            onPress={() => navigation.navigate(item.screen)}
        >
            <Ionicons name={item.icon} size={28} color="#4a90e2" />
            <Text style={styles.featureText}>{item.title}</Text>
        </TouchableOpacity>
    );

    // =======================================================
    // 🔹 RENDER CHÍNH
    // =======================================================
    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContainer}>
            <View style={styles.container}>
                {/* HIỂN THỊ TÊN NHÂN VIÊN ĐANG ĐĂNG NHẬP */}
                <Text style={styles.welcomeText}>Xin chào, {currentUser.name}!</Text> 
                
                {/* ⭐ DÒNG ĐÃ SỬA LỖI - SỬ DỤNG 'admin' để so sánh với kiểu đã cho */}
                <Text style={styles.roleText}>
                    👩‍⚕️ Vai trò: {currentUser.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                </Text>

                {/* ⭐ KHU VỰC CHỨC NĂNG CÁ NHÂN (HR) */}
                <View style={styles.hrSection}>
                    <HRActionButton 
                        icon="time-outline" 
                        title="Chấm Công" 
                        screen="ChamCong" 
                    />
                    <HRActionButton 
                        icon="wallet-outline" 
                        title="Bảng Lương" 
                        screen="BangLuong" 
                    />
                </View>
                <View style={styles.separator} />


                <Text style={styles.sectionTitle}>📊 Thống kê</Text>
                {isLoadingStats ? (
                     <ActivityIndicator size="small" color="#4a90e2" style={{ marginBottom: 20 }} />
                ) : (
                    <FlatList
                        data={stats}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => item.label}
                        renderItem={renderStat}
                        contentContainerStyle={styles.statsContainer}
                    />
                )}
                
                <View style={styles.separator} />


                <Text style={styles.sectionTitle}>📋 Danh sách chức năng</Text>

                <FlatList
                    data={features}
                    numColumns={3}
                    keyExtractor={(item) => item.title}
                    renderItem={renderFeature}
                    contentContainerStyle={styles.gridContainer}
                    scrollEnabled={false} 
                />
            </View>
        </ScrollView>
    );
}

// =======================================================
// 🎨 STYLES
// =======================================================
const styles = StyleSheet.create({
    scrollContainer: { 
        paddingBottom: 20 
    },
    container: { flex: 1, backgroundColor: "#fff", padding: 16 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    welcomeText: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: '#333', 
        marginBottom: 5 
    }, 
    roleText: { 
        fontSize: 14, 
        color: "#666", 
        marginBottom: 12 
    },
    separator: { height: 1, backgroundColor: '#eee', marginVertical: 15 },

    // ⭐ STYLE CHO PHẦN HR MỚI
    hrSection: {
        flexDirection: 'row',
        justifyContent: 'space-around', 
        marginBottom: 10,
        marginTop: 10,
    },
    hrActionButton: {
        flex: 1,
        backgroundColor: '#4a90e2', 
        padding: 12,
        borderRadius: 10,
        marginHorizontal: 8, 
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 5,
    },
    hrActionButtonText: {
        marginTop: 5,
        fontSize: 12,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    // End HR styles

    statsContainer: { marginBottom: 20 },
    statBox: {
        padding: 12,
        borderRadius: 12,
        marginRight: 12,
        minWidth: 120,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 3,
    },
    statValue: { fontSize: 16, fontWeight: "bold", color: '#333' },
    statLabel: { fontSize: 12, color: '#666' },
    
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 12,
        color: "#333",
    },
    gridContainer: {
        marginHorizontal: -6, 
    },
    featureCard: {
        flex: 1,
        margin: 6,
        padding: 14,
        backgroundColor: "#f0f4f8",
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        maxWidth: "31%", 
        minHeight: 100,
        maxHeight: 120, 
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
        elevation: 1,
    },
    featureText: {
        marginTop: 8,
        fontSize: 12,
        textAlign: "center",
        fontWeight: '500',
        color: '#333'
    },
});