// BanhangScreen.tsx — Màn hình bán hàng chính

import {
    addDoc,
    collection,
    doc,
    getDoc,
    onSnapshot,
    updateDoc,
    query, 
    where, 
    getDocs, 
} from "firebase/firestore";
import React, { useEffect, useState, useMemo } from "react";
import {
    Alert,
    Button,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    View,
    TouchableOpacity,
    Modal,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { auth, db } from "../../firebaseConfig";

// --- Kiểu dữ liệu (Mặc định cho các trường của thuốc)
interface Thuoc {
    id: string;
    ten: string;
    soluong: string | number; // Số lượng tồn kho (có thể là chuỗi hoặc số)
    giaBan: string | number; // Giá bán (có thể là chuỗi hoặc số) - Là giá bán theo ĐV LỚN (vd: Lọ)
    donVi: string; // Đơn vị LỚN (vd: Lọ, Hộp)
    donViNho: string; // Đơn vị BÁN LẺ (vd: Viên)
    donViTinh: string; // Mặc định (có thể là ĐV LỚN)
    heSoQuyDoi?: number; // Hệ số quy đổi từ LỚN sang NHỎ (vd: 30)
    [key: string]: any;
}

export default function BanhangScreen() {
    const [thuocs, setThuocs] = useState<Thuoc[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selected, setSelected] = useState<Record<string, number>>({});
    const [khachHang, setKhachHang] = useState<string>(""); 
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    // 1. FETCH DỮ LIỆU THUỐC
    useEffect(() => {
        setIsLoading(true);
        const unsub = onSnapshot(
            collection(db, "thuocs"),
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Thuoc[];
                setThuocs(data);
                setIsLoading(false);
            },
            (error) => {
                console.error("Lỗi fetching thuốc:", error);
                setIsLoading(false);
                Alert.alert("Lỗi dữ liệu", "Không thể tải danh sách thuốc.");
            }
        );
        return () => unsub();
    }, []);

    // --- 2. LOGIC XỬ LÝ SỐ LƯỢNG & KIỂM TRA TỒN KHO ---
    const handleQuantityChange = (id: string, value: string) => {
        // 1. Chỉ giữ lại số nguyên
        const num = parseInt(value.replace(/[^0-9]/g, ''));

        // 2. Ép kiểu giá trị bán (0 nếu không hợp lệ)
        let soLuongBan = isNaN(num) || num < 0 ? 0 : num;

        const item = thuocs.find((t) => t.id === id);

        // 3. Ép kiểu tồn kho an toàn (LƯU Ý: tồn kho đang lưu theo ĐV NHỎ/Bán lẻ)
        const tonKho = parseFloat(String(item?.soluong || 0)) || 0;

        // 4. KIỂM TRA TỒN KHO:
        if (soLuongBan > tonKho) {
            Alert.alert(
                "Lỗi tồn kho",
                `Số lượng bán (${soLuongBan}) vượt quá số lượng còn (${tonKho}).`
            );
            soLuongBan = tonKho; // Giới hạn số lượng bán bằng tồn kho
        }

        // 5. Cập nhật state, chỉ khi số lượng > 0 hoặc khi nhập/xóa
        if (soLuongBan > 0 || value === "") {
            setSelected((prev) => ({
                ...prev,
                [id]: soLuongBan,
            }));
        } else if (soLuongBan === 0 && value !== "") {
            // Nếu người dùng nhập ký tự không hợp lệ, giữ nguyên giá trị cũ
            setSelected((prev) => ({
                ...prev,
                [id]: 0,
            }));
        } else {
            // Xóa khỏi selected nếu giá trị là 0
            setSelected((prev) => {
                const newState = { ...prev };
                delete newState[id];
                return newState;
            });
        }
    };

    // --- 3. CHUẨN BỊ DỮ LIỆU HÓA ĐƠN & TÍNH TỔNG TIỀN (SỬ DỤNG GIÁ BÁN LẺ) ---
    const { itemsToBuy, tongTien } = useMemo(() => {
        // 1. Tính toán chi tiết từng mặt hàng
        const calculatedItems = thuocs
            .filter((t) => selected[t.id] > 0) // Chỉ lấy các mặt hàng có số lượng > 0
            .map((t) => {
                const heSoQuyDoi = (t.heSoQuyDoi as number) || 1;
                
                // *** 1A. TÍNH GIÁ BÁN LẺ (Giá/Viên) ***
                // Giá bán được lưu là giá LỚN (VD: Lọ). Chia cho hệ số quy đổi để ra giá BÁN LẺ.
                const donGiaLon = parseFloat(String(t.giaBan || 0).replace(/[.,]/g, '')) || 0;
                const donGiaLe = heSoQuyDoi > 0 ? donGiaLon / heSoQuyDoi : donGiaLon;

                const soLuong = selected[t.id] || 0; // Số lượng đang bán (là ĐV Bán lẻ)

                // Tính thành tiền: Thành tiền = Giá bán lẻ * Số lượng bán lẻ
                const thanhTien = donGiaLe * soLuong;

                return {
                    id: t.id,
                    tenThuoc: t.ten,
                    soLuong: soLuong, // Số lượng bán lẻ
                    donGia: donGiaLe, // Đơn giá bán lẻ
                    thanhTien: thanhTien,
                    donViBan: t.donViNho || t.donViTinh || 'Đơn vị',
                };
            });

        // 2. Tính Tổng tiền bằng hàm reduce
        const total = calculatedItems.reduce((sum, item) => sum + item.thanhTien, 0);

        return { itemsToBuy: calculatedItems, tongTien: total };
    }, [thuocs, selected]); // Phụ thuộc vào danh sách thuốc và số lượng chọn

    // --- 4. XÁC NHẬN VÀ THỰC HIỆN TẠO HÓA ĐƠN ---
    const handleConfirmInvoice = () => {
        if (itemsToBuy.length === 0) {
            Alert.alert("❗ Lỗi", "Bạn chưa chọn thuốc để bán.");
            return;
        }
        setIsModalVisible(true);
    };

    const handleCreateInvoice = async () => {
        setIsModalVisible(false);
        if (itemsToBuy.length === 0) return;

        try {
            setIsProcessing(true); 

            // 1. Lấy thông tin nhân viên
            const uid = auth.currentUser?.uid;
            let nhanVienName = "Unknown";

            if (uid) {
                const userDoc = await getDoc(doc(db, "users", uid));
                if (userDoc.exists()) {
                    nhanVienName = userDoc.data().name || "Unknown";
                }
            }

            // 2. Lưu hóa đơn
            const newInvoiceRef = await addDoc(collection(db, "hoadons"), { 
                ngayBan: new Date(),
                items: itemsToBuy,
                tongTien,
                nhanVien: nhanVienName,
                khachHang: khachHang || "Khách lẻ",
                sdtKhachHang: khachHang || "Khách lẻ", 
                nhanVienUid: uid,
            });

            // 3. Cập nhật số lượng trong kho (Số lượng tồn kho là ĐV NHỎ/Bán lẻ)
            for (const item of itemsToBuy) {
                const thuocRef = doc(db, "thuocs", item.id);
                const thuoc = thuocs.find((t) => t.id === item.id);

                if (thuoc) {
                    const soLuongHienTai = parseFloat(String(thuoc.soluong || 0)) || 0;
                    const newSoLuong = soLuongHienTai - item.soLuong; // Trừ số lượng bán lẻ

                    if (newSoLuong >= 0) {
                        await updateDoc(thuocRef, { soluong: newSoLuong });
                    } else {
                        console.warn(
                            `Lỗi: Số lượng mới của ${item.tenThuoc} là âm. Bỏ qua cập nhật.`
                        );
                    }
                }
            }
            
            // 4. LOGIC CẬP NHẬT TỔNG TIỀN MUA CHO KHÁCH HÀNG (CRM)
            if (khachHang && khachHang !== "Khách lẻ") { 
                const customerQuery = query(
                    collection(db, "khachhangs"),
                    where('sdt', '==', khachHang) 
                );
                const customerSnapshot = await getDocs(customerQuery);
                
                if (!customerSnapshot.empty) {
                    const customerDoc = customerSnapshot.docs[0];
                    const customerData = customerDoc.data();

                    const currentTotal = parseFloat(String(customerData.tongTienMua || 0)) || 0;
                    const newTotal = currentTotal + tongTien; 

                    await updateDoc(customerDoc.ref, {
                        tongTienMua: newTotal,
                    });
                    console.log(`Đã cập nhật Tổng Tiền Mua cho KH: ${khachHang}. Mới: ${newTotal}`);
                } else {
                    console.warn(`Không tìm thấy khách hàng với SĐT/ID: ${khachHang} để cập nhật CRM.`);
                }
            }
            // ------------------------------------------------------------------

            Alert.alert(
                "✅ Bán hàng thành công!",
                `Đã tạo hóa đơn ${newInvoiceRef.id} với tổng tiền: ${tongTien.toLocaleString('vi-VN')} VNĐ`
            );

            // 5. RESET TRẠNG THÁI
            setSelected({});
            setKhachHang("");
            setSearchTerm("");
        } catch (error) {
            console.error("Lỗi tạo hóa đơn:", error);
            Alert.alert(
                "❌ Lỗi khi tạo hóa đơn",
                "Vui lòng kiểm tra kết nối và thử lại."
            );
        } finally {
            setIsProcessing(false); 
        }
    };

    // --- 5. TÌM KIẾM ---
    const filteredThuocs = thuocs.filter((t) =>
        t.ten && String(t.ten).toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- GIAO DIỆN HIỂN THỊ (Sửa Lỗi Giá Bán Lẻ) ---

    const renderItem = ({ item }: { item: Thuoc }) => {
        const currentStock = parseFloat(String(item.soluong || 0)) || 0; 
        const isLowStock = currentStock <= 10 && currentStock > 0;
        const isOutOfStock = currentStock <= 0;

        const donViLon = String(item.donVi || item.donViTinh || "Không rõ");
        const donViBanLe = String(item.donViNho || item.donViTinh || "Không rõ");

        // Lấy giá bán LỚN và Hệ số Quy đổi
        const donGiaLon = parseFloat(String(item.giaBan || 0).replace(/[.,]/g, '')) || 0;
        const heSoQuyDoi = (item.heSoQuyDoi as number) || 1;

        // 🔥 TÍNH GIÁ BÁN LẺ (Giá/Viên)
        const priceForDisplay = heSoQuyDoi > 0 ? donGiaLon / heSoQuyDoi : donGiaLon;


        return (
            <View style={[styles.itemCard, isOutOfStock && styles.outOfStockCard]}>
                <Text style={styles.name}>{item.ten || "Tên thuốc không rõ"}</Text>

                {/* HIỂN THỊ ĐƠN VỊ LỚN */}
                <Text style={{ color: "#666" }}>Đơn vị lớn: {donViLon}</Text>

                {/* HIỂN THỊ ĐƠN VỊ BÁN LẺ/NHỎ */}
                <Text style={{ color: "#666" }}>Đơn vị bán lẻ: {donViBanLe}</Text>

                <Text
                    style={{
                        color: "#007bff",
                        fontWeight: "bold",
                        marginTop: 5,
                    }}
                >
                    {/* 🎯 SỬA LỖI: Hiển thị giá BÁN LẺ theo đơn vị BÁN LẺ */}
                    Giá bán: {priceForDisplay.toLocaleString('vi-VN')} VNĐ / ({donViBanLe})
                </Text>

                <Text
                    style={[
                        styles.stockText,
                        isLowStock && styles.lowStockText,
                        isOutOfStock && styles.outOfStockStockText,
                    ]}
                >
                    Tồn kho: {currentStock} ({donViBanLe})
                </Text>

                <TextInput
                    placeholder={
                        isOutOfStock
                            ? "Hết hàng"
                            : `Số lượng bán (Đơn vị: ${donViBanLe})`
                    }
                    keyboardType="numeric"
                    style={[styles.input, isOutOfStock && styles.inputDisabled]}
                    editable={!isOutOfStock}
                    value={selected[item.id] > 0 ? String(selected[item.id]) : ""}
                    onChangeText={(text) => handleQuantityChange(item.id, text)}
                />
            </View>
        );
    };

    // Modal Xác nhận Hóa đơn
    const InvoiceConfirmationModal = () => (
        <Modal
            animationType="fade"
            transparent={true}
            visible={isModalVisible}
            onRequestClose={() => setIsModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Xác nhận Hóa đơn</Text>
                    <Text style={styles.modalSubTitle}>
                        Khách hàng: {khachHang || "Khách lẻ"}
                    </Text>

                    <ScrollView style={{ maxHeight: 200, marginBottom: 15 }}>
                        {itemsToBuy.map((item) => (
                            <View key={item.id} style={styles.modalItem}>
                                <Text style={{ flex: 2 }}>
                                    {item.tenThuoc} (@{item.donViBan})
                                </Text>
                                <Text style={{ flex: 1, textAlign: "center" }}>
                                    x {item.soLuong}
                                </Text>
                                <Text style={{ flex: 2, textAlign: "right" }}>
                                    {item.thanhTien.toLocaleString('vi-VN')} VNĐ
                                </Text>
                            </View>
                        ))}
                    </ScrollView>

                    <Text style={styles.modalTotal}>
                        Tổng tiền:{" "}
                        <Text style={{ color: "#d0021b", fontWeight: "bold" }}>
                            {tongTien.toLocaleString('vi-VN')} VNĐ
                        </Text>
                    </Text>

                    <View style={styles.modalButtonContainer}>
                        <Button
                            title="Hủy"
                            onPress={() => setIsModalVisible(false)}
                            color="#888"
                            disabled={isProcessing}
                        />
                        {isProcessing ? (
                            <ActivityIndicator
                                size="small"
                                color="#4a90e2"
                                style={{ marginLeft: 10 }}
                            />
                        ) : (
                            <Button
                                title="Xác nhận BÁN"
                                onPress={handleCreateInvoice}
                                color="#4a90e2"
                            />
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <View style={styles.container}>
                <Text style={styles.title}>🛒 Bán hàng - Quản lý Thuốc</Text>

                <TextInput
                    style={styles.searchBar}
                    placeholder="🔍 Tìm kiếm thuốc theo tên..."
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                />

                <TextInput
                    style={styles.customerInput}
                    placeholder="👤 Nhập Tên/SĐT Khách hàng (Nếu có)"
                    value={khachHang}
                    onChangeText={setKhachHang}
                />

                {/* Hiển thị Loading */}
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#007bff" />
                        <Text style={styles.loadingText}>Đang tải dữ liệu thuốc...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredThuocs}
                        keyExtractor={(item) => String(item.id)}
                        extraData={selected}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        ListEmptyComponent={() => (
                            <Text style={styles.emptyText}>Không tìm thấy thuốc nào.</Text>
                        )}
                    />
                )}

                <View style={styles.summaryBar}>
                    <Text style={styles.totalText}>
                        Thành tiền:{" "}
                        <Text style={{ fontWeight: "bold", color: "#d0021b" }}>
                            {tongTien.toLocaleString('vi-VN')} VNĐ
                        </Text>
                    </Text>
                    <TouchableOpacity
                        onPress={handleConfirmInvoice}
                        style={[
                            styles.invoiceButton,
                            itemsToBuy.length === 0 && styles.invoiceButtonDisabled,
                        ]}
                        disabled={itemsToBuy.length === 0 || isProcessing} 
                    >
                        <Text style={styles.invoiceButtonText}>
                            {isProcessing
                                ? "Đang xử lý..."
                                : `Tạo Hóa Đơn (${itemsToBuy.length})`}
                        </Text>
                    </TouchableOpacity>
                </View>

                <InvoiceConfirmationModal />
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 10, backgroundColor: "#f5f5f5" },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        marginVertical: 15,
        textAlign: "center",
        color: "#333",
    },

    searchBar: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        backgroundColor: "#fff",
    },

    customerInput: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
        backgroundColor: "#fff",
    },

    itemCard: {
        padding: 15,
        backgroundColor: "#fff",
        marginBottom: 10,
        borderRadius: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 2,
    },

    outOfStockCard: {
        backgroundColor: "#fdd",
        opacity: 0.7,
    },

    name: { fontSize: 18, fontWeight: "bold", marginBottom: 4, color: "#4a90e2" },

    stockText: {
        fontSize: 14,
        marginTop: 4,
        color: "#333",
    },
    lowStockText: {
        color: "orange",
        fontWeight: "bold",
    },
    outOfStockStockText: {
        color: "red",
        fontWeight: "bold",
    },

    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 8,
        marginTop: 10,
        backgroundColor: "#fff",
    },

    inputDisabled: {
        backgroundColor: "#eee",
    },

    // Styles mới
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        textAlign: "center",
        marginTop: 10,
        fontSize: 16,
        color: "#666",
    },
    emptyText: {
        textAlign: "center",
        marginTop: 20,
        fontSize: 16,
        color: "#999",
    },

    // Styles cho phần Tóm tắt và Nút bán hàng cố định
    summaryBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 15,
        paddingHorizontal: 10,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#eee",
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    totalText: {
        fontSize: 16,
        color: "#333",
    },
    invoiceButton: {
        backgroundColor: "#4CAF50",
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
    },
    invoiceButtonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
    invoiceButtonDisabled: {
        backgroundColor: "#ccc",
    },

    // Styles cho Modal
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
        width: "90%",
        backgroundColor: "white",
        borderRadius: 12,
        padding: 20,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 10,
        color: "#4a90e2",
        textAlign: "center",
    },
    modalSubTitle: {
        fontSize: 14,
        marginBottom: 10,
        fontStyle: "italic",
        borderBottomWidth: 1,
        paddingBottom: 5,
        borderColor: "#eee",
    },
    modalItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: "#f5f5f5",
    },
    modalTotal: {
        fontSize: 18,
        marginTop: 15,
        textAlign: "right",
    },
    modalButtonContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginTop: 20,
    },
});