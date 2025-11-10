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
    Platform,
    KeyboardAvoidingView,
} from "react-native";
import { auth, db } from "../../firebaseConfig";

// --- Kiểu dữ liệu
interface Thuoc {
    id: string;
    ten: string;
    soluong: string | number; // Số lượng tồn kho (ĐANG LƯU theo ĐV NHỎ/BÁN LẺ)
    giaBan: string | number; // Giá bán (Là giá bán theo ĐV LỚN, vd: Lọ)
    donVi: string; // Đơn vị LỚN (vd: Lọ, Hộp)
    donViNho: string; // Đơn vị BÁN LẺ (vd: Viên)
    donViTinh: string; // Mặc định (có thể là ĐV LỚN)
    heSoQuyDoi?: number; // Hệ số quy đổi từ LỚN sang NHỎ (vd: 30)
    [key: string]: any;
}

// 🔥 State mới để theo dõi đơn vị bán được chọn cho mỗi thuốc
type SellingUnit = 'large' | 'small';

// 🔥 Type mới cho Phương thức thanh toán
type PaymentMethod = 'cash' | 'transfer'; 

export default function BanhangScreen() {
    const [thuocs, setThuocs] = useState<Thuoc[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    // Lưu số lượng bán. Key là ID, Value là số lượng (theo đơn vị đang được chọn)
    const [selected, setSelected] = useState<Record<string, number>>({}); 
    const [khachHang, setKhachHang] = useState<string>(""); 
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    
    // 🔥 State mới: Lưu đơn vị bán hiện tại của từng thuốc (Mặc định là 'large')
    const [unitMode, setUnitMode] = useState<Record<string, SellingUnit>>({}); 
    
    // 🔥 State mới: Lưu phương thức thanh toán (Mặc định là Tiền mặt)
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

    // Hàm làm tròn tiền Việt Nam (ví dụ: làm tròn đến hàng nghìn, trăm, hoặc giữ nguyên)
    const roundVND = (price: number): number => {
        // Tùy chỉnh: Làm tròn đến hàng đơn vị (vì tiền tệ Việt Nam không có tiền lẻ nhỏ hơn 1đ)
        return Math.round(price); 
    };

    // 1. FETCH DỮ LIỆU THUỐC (Giữ nguyên)
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

    // 🔥 LOGIC CHUYỂN ĐỔI ĐƠN VỊ BÁN (Giữ nguyên)
    const toggleUnitMode = (id: string) => {
        setUnitMode((prev) => {
            const currentMode = prev[id] || 'large';
            const newMode = currentMode === 'large' ? 'small' : 'large';
            
            // 🔥 Reset số lượng đã chọn khi chuyển đơn vị để tránh nhầm lẫn
            setSelected((prevSelected) => {
                const newState = { ...prevSelected };
                delete newState[id];
                return newState;
            });

            return {
                ...prev,
                [id]: newMode,
            };
        });
    };

    // --- 2. LOGIC XỬ LÝ SỐ LƯỢNG & KIỂM TRA TỒN KHO --- (Giữ nguyên)
    const handleQuantityChange = (id: string, value: string) => {
        const num = parseInt(value.replace(/[^0-9]/g, ''));
        let soLuongBan = isNaN(num) || num < 0 ? 0 : num;
        
        const item = thuocs.find((t) => t.id === id);
        if (!item) return;

        const heSoQuyDoi = (item.heSoQuyDoi as number) || 1;
        const tonKhoLe = parseFloat(String(item.soluong || 0)) || 0;
        const currentMode = unitMode[id] || 'large';

        let maxQuantity = 0;
        let unitName = "";

        // TÍNH TỒN KHO TỐI ĐA DỰA TRÊN ĐƠN VỊ ĐANG BÁN
        if (currentMode === 'large') {
            // Tồn kho LỚN (làm tròn xuống)
            maxQuantity = heSoQuyDoi > 0 ? Math.floor(tonKhoLe / heSoQuyDoi) : 0;
            unitName = item.donVi || item.donViTinh || 'Đơn vị lớn';
        } else {
            // Tồn kho LẺ (là giá trị trong DB)
            maxQuantity = tonKhoLe;
            unitName = item.donViNho || item.donViTinh || 'Đơn vị lẻ';
        }
        
        // KIỂM TRA TỒN KHO:
        if (soLuongBan > maxQuantity) {
            Alert.alert(
                "Lỗi tồn kho",
                `Số lượng bán (${soLuongBan} ${unitName}) vượt quá số lượng còn (${maxQuantity} ${unitName}).`
            );
            soLuongBan = maxQuantity; // Giới hạn số lượng bán bằng tồn kho
        }

        // Cập nhật state
        if (soLuongBan > 0 || value === "") {
            setSelected((prev) => ({
                ...prev,
                [id]: soLuongBan,
            }));
        } else {
            // Xóa khỏi selected nếu giá trị là 0 hoặc không hợp lệ (nhưng đã được set là 0 ở trên)
            setSelected((prev) => {
                const newState = { ...prev };
                delete newState[id];
                return newState;
            });
        }
    };

    // --- 3. CHUẨN BỊ DỮ LIỆU HÓA ĐƠN & TÍNH TỔNG TIỀN --- (Giữ nguyên)
    const { itemsToBuy, tongTien } = useMemo(() => {
        const calculatedItems = thuocs
            .filter((t) => selected[t.id] > 0) 
            .map((t) => {
                const soLuongBan = selected[t.id] || 0;
                const heSoQuyDoi = (t.heSoQuyDoi as number) || 1;
                const donGiaLon = parseFloat(String(t.giaBan || 0).replace(/[.,]/g, '')) || 0;
                
                // 🔥 Xác định đơn vị và đơn giá dựa trên unitMode
                const currentMode = unitMode[t.id] || 'large';
                let donGia = 0;
                let donViBan = '';

                if (currentMode === 'large') {
                    // BÁN THEO ĐƠN VỊ LỚN
                    donGia = donGiaLon; 
                    donViBan = t.donVi || t.donViTinh || 'Đơn vị lớn';
                } else {
                    // BÁN THEO ĐƠN VỊ LẺ
                    let donGiaGocLe = heSoQuyDoi > 0 ? donGiaLon / heSoQuyDoi : donGiaLon;
                    donGia = roundVND(donGiaGocLe); // 🔥 LÀM TRÒN GIÁ BÁN LẺ
                    donViBan = t.donViNho || t.donViTinh || 'Đơn vị lẻ';
                }

                // Tính thành tiền
                const thanhTien = donGia * soLuongBan;

                return {
                    id: t.id,
                    tenThuoc: t.ten,
                    soLuong: soLuongBan, 
                    donGia: donGia, 
                    thanhTien: thanhTien,
                    donViBan: donViBan,
                    heSoQuyDoi: heSoQuyDoi, // Cần cho việc trừ tồn kho
                    unitMode: currentMode, // Cần cho việc trừ tồn kho
                };
            });

        const total = calculatedItems.reduce((sum, item) => sum + item.thanhTien, 0);

        return { itemsToBuy: calculatedItems, tongTien: total };
    }, [thuocs, selected, unitMode]); // Phụ thuộc vào unitMode

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

            // 1. Lấy thông tin nhân viên (Giữ nguyên)
            const uid = auth.currentUser?.uid;
            let nhanVienName = "Unknown";
            if (uid) {
                const userDoc = await getDoc(doc(db, "users", uid));
                if (userDoc.exists()) {
                    nhanVienName = userDoc.data().name || "Unknown";
                }
            }

            // 2. Lưu hóa đơn
            const itemsToSave = itemsToBuy.map(item => ({ 
                tenThuoc: item.tenThuoc,
                soLuong: item.soLuong,
                donGia: item.donGia,
                thanhTien: item.thanhTien,
                donViBan: item.donViBan,
                id: item.id
            }));
            
            const newInvoiceRef = await addDoc(collection(db, "hoadons"), { 
                ngayBan: new Date(),
                items: itemsToSave,
                tongTien,
                nhanVien: nhanVienName,
                khachHang: khachHang || "Khách lẻ",
                sdtKhachHang: khachHang || "Khách lẻ", 
                nhanVienUid: uid,
                // 🔥 THÊM PHƯƠNG THỨC THANH TOÁN
                phuongThucThanhToan: paymentMethod, 
            });

            // 3. Cập nhật số lượng trong kho (trừ theo Đơn vị NHỎ/LẺ) (Giữ nguyên)
            for (const item of itemsToBuy) {
                const thuocRef = doc(db, "thuocs", item.id);
                const thuoc = thuocs.find((t) => t.id === item.id);

                if (thuoc) {
                    const soLuongHienTaiLe = parseFloat(String(thuoc.soluong || 0)) || 0;
                    
                    let soLuongCanTruLe = 0;
                    if (item.unitMode === 'large') {
                        // Nếu bán ĐV LỚN: Số lượng LẺ cần trừ = Số lượng LỚN * Hệ số
                        soLuongCanTruLe = item.soLuong * item.heSoQuyDoi; 
                    } else {
                        // Nếu bán ĐV LẺ: Số lượng LẺ cần trừ = Số lượng LẺ
                        soLuongCanTruLe = item.soLuong;
                    }
                    
                    const newSoLuongLe = soLuongHienTaiLe - soLuongCanTruLe; 

                    if (newSoLuongLe >= 0) {
                        await updateDoc(thuocRef, { soluong: newSoLuongLe }); 
                    } else {
                        // Dù đã check tồn kho, đây là lớp bảo vệ cuối cùng
                        console.warn(
                            `Lỗi: Số lượng mới của ${item.tenThuoc} là âm. Bỏ qua cập nhật.`
                        );
                    }
                }
            }
            
            // 4. LOGIC CẬP NHẬT TỔNG TIỀN MUA CHO KHÁCH HÀNG (Giữ nguyên)
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
                }
            }

            Alert.alert(
                "✅ Bán hàng thành công!",
                `Đã tạo hóa đơn ${newInvoiceRef.id} với tổng tiền: ${tongTien.toLocaleString('vi-VN')} VNĐ`
            );

            // 5. RESET TRẠNG THÁI
            setSelected({});
            setKhachHang("");
            setSearchTerm("");
            setUnitMode({}); 
            setPaymentMethod('cash'); // 🔥 Reset phương thức thanh toán
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

    // --- 5. TÌM KIẾM (Giữ nguyên) ---
    const filteredThuocs = thuocs.filter((t) =>
        t.ten && String(t.ten).toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- GIAO DIỆN HIỂN THỊ ---

    // renderItem (ĐÃ SỬA LỖI)
    const renderItem = ({ item }: { item: Thuoc }) => {
        const id = item.id;
        const currentMode = unitMode[id] || 'large'; // Đơn vị hiện tại
        const soLuongChon = selected[id];

        const heSoQuyDoi = (item.heSoQuyDoi as number) || 1;

        // Tồn kho LẺ (DB)
        const currentStockLe = parseFloat(String(item.soluong || 0)) || 0; 
        // Tồn kho LỚN (làm tròn xuống)
        const currentStockLon = heSoQuyDoi > 0 ? Math.floor(currentStockLe / heSoQuyDoi) : 0; 
        
        const isLowStock = currentStockLon <= 10 && currentStockLon > 0;
        const isOutOfStock = currentStockLe <= 0; // Check hết hàng theo đơn vị nhỏ nhất

        const donViLon = String(item.donVi || item.donViTinh || "Hộp");
        const donViBanLe = String(item.donViNho || item.donViTinh || "Viên");

        // TÍNH TOÁN GIÁ VÀ TỒN KHO HIỂN THỊ DỰA TRÊN CHẾ ĐỘ
        let displayPrice = 0;
        let displayUnitName = '';
        let displayStock = 0;
        
        const donGiaLon = parseFloat(String(item.giaBan || 0).replace(/[.,]/g, '')) || 0;
        let donGiaGocLe = heSoQuyDoi > 0 ? donGiaLon / heSoQuyDoi : donGiaLon;

        if (currentMode === 'large') {
            displayPrice = donGiaLon;
            displayUnitName = donViLon;
            displayStock = currentStockLon;
        } else {
            // Hiển thị giá lẻ đã làm tròn
            displayPrice = roundVND(donGiaGocLe);
            displayUnitName = donViBanLe;
            displayStock = currentStockLe;
        }
        
        // Cần phải check xem có bán lẻ được không (heSoQuyDoi > 1)
        const canSellSmall = heSoQuyDoi > 1;

        return (
            <View style={[styles.itemCard, isOutOfStock && styles.outOfStockCard]}>
                <Text style={styles.name}>{item.ten || "Tên thuốc không rõ"}</Text>
                
                <Text style={styles.unitDetail}>ĐV lớn: {donViLon} (Quy đổi: {heSoQuyDoi})</Text>
                <Text style={styles.unitDetail}>ĐV bán lẻ: {donViBanLe}</Text>

                <Text
                    style={{
                        color: "#007bff",
                        fontWeight: "bold",
                        marginTop: 5,
                    }}
                >
                    Giá bán: {displayPrice.toLocaleString('vi-VN')} VNĐ / ({displayUnitName})
                </Text>

                <Text
                    style={[
                        styles.stockText,
                        isLowStock && styles.lowStockText,
                        isOutOfStock && styles.outOfStockStockText,
                    ]}
                >
                    Tồn kho: {displayStock} ({displayUnitName})
                    {currentMode === 'large' && heSoQuyDoi > 1 && ` (Kho: ${currentStockLe} ${donViBanLe})`}
                </Text>

                {/* 🔥 NÚT CHUYỂN ĐỔI ĐƠN VỊ - ĐÃ SỬA LỖI TEXT STRING */}
                {canSellSmall && (
                    <TouchableOpacity
                        style={styles.unitToggle}
                        onPress={() => toggleUnitMode(id)}
                        disabled={isOutOfStock}
                    >
                        {/* SỬA LỖI: Thay thế chuỗi Markdown bằng <Text> lồng nhau để in đậm */}
                        <Text style={styles.unitToggleText}>
                            Đang bán theo: <Text style={{fontWeight: 'bold'}}>{displayUnitName}</Text> (Chạm để chuyển)
                        </Text>
                    </TouchableOpacity>
                )}
                
                <TextInput
                    placeholder={
                        isOutOfStock
                            ? "Hết hàng"
                            : `Số lượng bán (Đơn vị: ${displayUnitName})` 
                    }
                    keyboardType="numeric"
                    style={[styles.input, isOutOfStock && styles.inputDisabled]}
                    editable={!isOutOfStock}
                    value={soLuongChon > 0 ? String(soLuongChon) : ""}
                    onChangeText={(text) => handleQuantityChange(id, text)}
                />
            </View>
        );
    };

    // Modal Xác nhận Hóa đơn (ĐÃ SỬA LỖI)
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
                    
                    {/* SỬA LỖI: Thay thế chuỗi Markdown bằng <Text> lồng nhau để in đậm */}
                    <Text style={styles.modalSubTitle}>
                        Phương thức: <Text style={{fontWeight: 'bold'}}>{paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}</Text>
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

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#007bff" />
                        <Text style={styles.loadingText}>Đang tải dữ liệu thuốc...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredThuocs}
                        keyExtractor={(item) => String(item.id)}
                        extraData={[selected, unitMode, paymentMethod]} // Thêm paymentMethod vào extraData
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        ListEmptyComponent={() => (
                            <Text style={styles.emptyText}>Không tìm thấy thuốc nào.</Text>
                        )}
                    />
                )}

                <View style={styles.summaryBar}>
                    <View style={styles.paymentMethodContainer}>
                        <TouchableOpacity
                            style={[
                                styles.paymentButton,
                                paymentMethod === 'cash' && styles.paymentButtonActive
                            ]}
                            onPress={() => setPaymentMethod('cash')}
                            disabled={isProcessing}
                        >
                            <Text style={styles.paymentButtonText}>Tiền mặt</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.paymentButton,
                                paymentMethod === 'transfer' && styles.paymentButtonActive
                            ]}
                            onPress={() => setPaymentMethod('transfer')}
                            disabled={isProcessing}
                        >
                            <Text style={styles.paymentButtonText}>Chuyển khoản</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.invoiceActionContainer}>
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

    unitDetail: {
        color: "#666",
        fontSize: 13,
    },
    
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

    // Styles cho nút chuyển đổi Đơn vị
    unitToggle: {
        backgroundColor: '#e6f7ff',
        padding: 8,
        borderRadius: 5,
        marginTop: 10,
        alignItems: 'center',
    },
    unitToggleText: {
        color: '#1890ff',
        fontWeight: '600',
    },

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

    summaryBar: {
        flexDirection: "column", // Đổi thành column để chứa cả paymentMethodContainer
        paddingVertical: 10,
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
    // 🔥 Container mới cho phương thức thanh toán
    paymentMethodContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 10,
        paddingTop: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    paymentButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginHorizontal: 5,
        borderRadius: 5,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd'
    },
    paymentButtonActive: {
        backgroundColor: '#d6e9f8', // Màu xanh nhạt khi được chọn
        borderColor: '#4a90e2',
    },
    paymentButtonText: {
        color: '#333',
        fontWeight: 'bold',
    },
    
    // Container cho tổng tiền và nút tạo hóa đơn
    invoiceActionContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 5,
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

    // Styles cho Modal (Cập nhật tiêu đề)
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