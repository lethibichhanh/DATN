import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    onSnapshot,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";
import React, { useEffect, useState, useCallback } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { db } from "../../firebaseConfig"; // Đảm bảo đường dẫn này chính xác

// Kiểu dữ liệu chi tiết cần thiết cho nhập kho
type ThuocDetailType = {
    id: string;
    ten: string;
    soluong: number; // Tổng tồn kho theo Đơn vị NHỎ
    donViTinh: string; // Đơn vị LỚN
    donViNho: string; // Đơn vị NHỎ
    heSoQuyDoi: number; // Hệ số quy đổi (Luôn >= 1)
    giaVon: number; // Giá vốn (Đơn vị LỚN)
    xuatXu: string; 
    danhMuc: string;
    hanSuDung: string;
};

// Định nghĩa kiểu dữ liệu Phiếu nhập kho (để in báo cáo)
type PhieuNhapKhoData = {
    thuocId: string;
    tenThuoc: string;
    soLuongNhapLon: number;
    giaNhapLon: number;
    donViTinh: string;
    donViNho: string;
    heSoQuyDoi: number;
    ngayNhap: Date;
    giaVonMoi: number;
    soLuongNhoThem: number;
    danhMuc: string;
    xuatXu: string;
    hanSuDung: string;
};

export default function NhapKhoScreen({ navigation }: any) {
    const [thuocs, setThuocs] = useState<ThuocDetailType[]>([]);
    const [thuocChonId, setThuocChonId] = useState<string>("");
    const [soLuongNhapLon, setSoLuongNhapLon] = useState(""); // SL nhập theo Đơn vị LỚN
    const [giaNhapLon, setGiaNhapLon] = useState(""); // Giá nhập theo Đơn vị LỚN
    const [ngayNhap, setNgayNhap] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    // Lấy thông tin thuốc đang được chọn
    const selectedThuoc = thuocs.find(t => t.id === thuocChonId);

    // --- Lấy danh sách thuốc ---
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "thuocs"), (snapshot) => {
            const data: ThuocDetailType[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                ten: doc.data().ten || 'Không tên',
                soluong: doc.data().soluong || 0,
                donViTinh: doc.data().donViTinh || '',
                donViNho: doc.data().donViNho || 'đơn vị nhỏ',
                heSoQuyDoi: doc.data().heSoQuyDoi || 1,
                giaVon: doc.data().giaVon || 0,
                xuatXu: doc.data().xuatXu || 'N/A', 
                danhMuc: doc.data().danhMuc || 'N/A',
                hanSuDung: doc.data().hanSuDung || 'N/A',
            }));
            setThuocs(data);
        });
        return () => unsubscribe();
    }, []);

    // --- Xử lý DatePicker ---
    const onChangeDate = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || ngayNhap;
        setShowDatePicker(Platform.OS === 'ios');
        if (currentDate) setNgayNhap(currentDate);
    };

    // --- Hàm Export PDF ---
    const generateAndSharePDF = useCallback(async (data: PhieuNhapKhoData) => {
        if (!data) return;

        const tongGiaTriNhap = data.soLuongNhapLon * data.giaNhapLon;
        const giaNhapNho = data.giaNhapLon / data.heSoQuyDoi;

        const html = `
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                <style>
                    body { font-family: 'Arial', sans-serif; padding: 20px; color: #333; }
                    h1 { color: #4a90e2; text-align: center; margin-bottom: 5px; }
                    h3 { text-align: center; font-weight: normal; margin: 0 0 20px 0;}
                    hr { border: 0; border-top: 2px dashed #eee; margin: 20px 0; }
                    .header-info, .detail-table, .footer-info { width: 100%; margin-bottom: 20px; }
                    .header-info p { margin: 5px 0; font-size: 14pt; }
                    table { width: 100%; border-collapse: collapse; font-size: 14pt; }
                    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                    th { background-color: #e6f0ff; color: #4a90e2; }
                    .total { font-size: 16pt; font-weight: bold; color: #d0021b; }
                    .wac-update { margin-top: 15px; padding: 10px; border: 1px solid #28a745; background-color: #e6ffe6; border-radius: 5px; }
                </style>
            </head>
            <body>
                <h1>📝 PHIẾU NHẬP KHO THUỐC</h1>
                <h3>Ngày nhập: ${data.ngayNhap.toLocaleDateString('vi-VN')}</h3>
                <hr/>

                <h2>Thông tin sản phẩm</h2>
                <div class="header-info">
                    <p><b>Tên Thuốc:</b> ${data.tenThuoc}</p>
                    <p><b>Danh mục:</b> ${data.danhMuc}</p>
                    <p><b>Xuất xứ:</b> ${data.xuatXu}</p>
                    <p><b>Hạn sử dụng:</b> ${data.hanSuDung}</p>
                </div>
                
                <hr/>

                <h2>Chi tiết nhập hàng</h2>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Đơn vị</th>
                            <th>Số lượng</th>
                            <th>Giá nhập</th>
                            <th>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${data.donViTinh} (ĐV LỚN)</td>
                            <td>${data.soLuongNhapLon.toLocaleString('vi-VN')}</td>
                            <td>${data.giaNhapLon.toLocaleString('vi-VN')} VNĐ</td>
                            <td class="total">${tongGiaTriNhap.toLocaleString('vi-VN')} VNĐ</td>
                        </tr>
                        <tr>
                            <td>${data.donViNho} (ĐV NHỎ)</td>
                            <td>${data.soLuongNhoThem.toLocaleString('vi-VN')}</td>
                            <td>${giaNhapNho.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} VNĐ</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>

                <div class="wac-update">
                    <p><b>Cập nhật Giá vốn Bình quân (ĐV LỚN):</b></p>
                    <p>Giá vốn <span style="color:#28a745; font-weight: bold;">MỚI</span>: ${data.giaVonMoi.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} VNĐ / ${data.donViTinh}</p>
                </div>

                <div style="margin-top: 50px; text-align: right;">
                    <p>Ký tên nhân viên nhập:</p>
                    <p style="margin-top: 50px;">_________________________</p>
                </div>

            </body>
            </html>
        `;

        try {
            const { uri } = await Print.printToFileAsync({ html });
            if (!(await Sharing.isAvailableAsync())) {
                Alert.alert("Lỗi", "Thiết bị không hỗ trợ chia sẻ file.");
                return;
            }
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) {
            Alert.alert("Lỗi xuất PDF", "Không thể tạo hoặc chia sẻ file PDF. Vui lòng kiểm tra quyền truy cập.");
            console.error(error);
        }
    }, []); // Rút gọn dependencies vì đã dùng selectedThuoc trong handleSave

    // --- Hàm lưu phiếu nhập ---
    const handleSave = async () => {
        // Làm sạch đầu vào (chỉ giữ lại số) và chuyển đổi
        const soLuongLon = Number(soLuongNhapLon.replace(/[^0-9]/g, ''));
        const giaLon = Number(giaNhapLon.replace(/[^0-9]/g, ''));
        
        if (!thuocChonId || !soLuongNhapLon || !giaNhapLon) {
            Alert.alert("⚠️ Thiếu thông tin", "Vui lòng chọn thuốc, nhập số lượng và giá nhập.");
            return;
        }

        if (soLuongLon <= 0 || isNaN(soLuongLon)) {
            Alert.alert("❌ Lỗi đầu vào", "Số lượng nhập phải là một số nguyên dương.");
            return;
        }
        if (giaLon <= 0 || isNaN(giaLon)) {
            Alert.alert("❌ Lỗi đầu vào", "Giá nhập phải là một số tiền dương.");
            return;
        }

        if (!selectedThuoc) {
            Alert.alert("❌ Lỗi dữ liệu", "Không tìm thấy thông tin chi tiết của thuốc.");
            return;
        }

        setLoading(true);

        // Khai báo biến
        let newGiaVonLon = selectedThuoc.giaVon || 0;
        const heSoQuyDoi = selectedThuoc.heSoQuyDoi || 1;
        const soLuongNhoThem = soLuongLon * heSoQuyDoi;
        const thuocId = thuocChonId;
        
        try {
            // Lấy dữ liệu tồn kho hiện tại (đảm bảo là mới nhất)
            const thuocRef = doc(db, "thuocs", thuocId);
            const thuocSnap = await getDoc(thuocRef);
            
            if (!thuocSnap.exists()) {
                Alert.alert("❌ Lỗi dữ liệu", "Thuốc đã chọn không còn tồn tại trong kho.");
                setLoading(false);
                return;
            }
            
            const data = thuocSnap.data() as ThuocDetailType;
            const soLuongTonKhoHienTaiNho = data.soluong || 0;
            const GiaVonLonHienTai = data.giaVon || 0;
            
            // Chuyển tồn kho nhỏ về tồn kho lớn để tính giá vốn
            const QtyLonHienTai = soLuongTonKhoHienTaiNho / heSoQuyDoi;

            // --- ⚙️ BẮT ĐẦU NGHIỆP VỤ KẾ TOÁN: TÍNH GIÁ VỐN BÌNH QUÂN GIA QUYỀN (WAC) ---
            const OldValue = QtyLonHienTai * GiaVonLonHienTai;
            const NewImportValue = soLuongLon * giaLon; // SL nhập * Giá nhập (ĐV LỚN)
            const NewQtyLon = QtyLonHienTai + soLuongLon;

            if (NewQtyLon > 0) {
                const NewTotalValue = OldValue + NewImportValue;
                newGiaVonLon = NewTotalValue / NewQtyLon;
            }
            // Làm tròn giá vốn mới (ví dụ: về số nguyên)
            const newGiaVonLonRounded = Math.round(newGiaVonLon);
            // --- KẾT THÚC NGHIỆP VỤ KẾ TOÁN ---

            // Tổng tồn kho NHỎ mới
            const soLuongTonKhoMoiNho = soLuongTonKhoHienTaiNho + soLuongNhoThem;

            // 1️⃣ Lưu phiếu nhập kho
            await addDoc(collection(db, "nhapkho"), {
                thuocId: thuocId,
                tenThuoc: selectedThuoc.ten,
                soLuong: soLuongNhoThem, // Lưu số lượng theo Đơn vị NHỎ
                giaNhap: giaLon, // Lưu giá nhập theo Đơn vị LỚN
                soLuongNhapLon: soLuongLon,
                donViTinh: selectedThuoc.donViTinh,
                donViNho: selectedThuoc.donViNho,
                heSoQuyDoi: heSoQuyDoi,
                giaVonCu: GiaVonLonHienTai,
                giaVonMoi: newGiaVonLonRounded,
                ngayNhap: ngayNhap,
                createdAt: serverTimestamp(),
            });

            // 2️⃣ Cập nhật số lượng thuốc và Giá vốn trong kho
            await updateDoc(thuocRef, {
                soluong: soLuongTonKhoMoiNho, // Cập nhật tổng SL theo Đơn vị NHỎ
                giaVon: newGiaVonLonRounded, // Cập nhật Giá vốn Bình quân mới
                ngayCapNhat: new Date(),
            });

            // Dữ liệu cho PDF (dùng selectedThuoc để đảm bảo có đủ data)
            const phieuData: PhieuNhapKhoData = {
                thuocId: thuocId,
                tenThuoc: selectedThuoc.ten,
                soLuongNhapLon: soLuongLon,
                giaNhapLon: giaLon,
                donViTinh: selectedThuoc.donViTinh,
                donViNho: selectedThuoc.donViNho,
                heSoQuyDoi: heSoQuyDoi,
                ngayNhap: ngayNhap,
                giaVonMoi: newGiaVonLonRounded,
                soLuongNhoThem: soLuongNhoThem,
                danhMuc: selectedThuoc.danhMuc,
                xuatXu: selectedThuoc.xuatXu,
                hanSuDung: selectedThuoc.hanSuDung,
            };
            
            // 3️⃣ XUẤT PHIẾU NHẬP (PDF)
            await generateAndSharePDF(phieuData);

            // Thông báo 
            Alert.alert("✅ Nhập kho thành công", `Đã nhập ${soLuongLon.toLocaleString('vi-VN')} ${selectedThuoc.donViTinh} (${soLuongNhoThem.toLocaleString('vi-VN')} ${selectedThuoc.donViNho}). Giá vốn bình quân mới: ${newGiaVonLonRounded.toLocaleString('vi-VN')} VNĐ/${selectedThuoc.donViTinh}.`);
            
            // Reset form
            setThuocChonId("");
            setSoLuongNhapLon("");
            setGiaNhapLon("");
            setNgayNhap(new Date());

        } catch (error) {
            console.error("Lỗi khi lưu phiếu nhập:", error);
            Alert.alert("❌ Lỗi", "Không thể lưu phiếu nhập kho. Vui lòng kiểm tra kết nối và thử lại.");
        } finally {
            setLoading(false);
        }
    };

    // --- Xử lý chuyển trang lịch sử ---
    const goToHistory = () => {
        navigation.navigate('LichSuNhapKho'); // Giả định tên route là 'LichSuNhapKho'
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}><MaterialIcons name="inventory" size={24} color="#4a90e2" /> Phiếu Nhập kho thuốc</Text>

            {/* --- Nút Lịch sử nhập kho --- */}
            <TouchableOpacity 
                style={styles.historyButton} 
                onPress={goToHistory}
            >
                <MaterialIcons name="history" size={20} color="#007aff" />
                <Text style={styles.historyButtonText}>Xem Lịch sử nhập kho</Text>
            </TouchableOpacity>

            {/* --- 1. Chọn thuốc --- */}
            <Text style={styles.label}>Tên thuốc (*)</Text>
            <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={thuocChonId}
                    onValueChange={(val) => setThuocChonId(String(val))}
                    style={styles.picker}
                >
                    <Picker.Item label="-- Chọn thuốc cần nhập --" value="" />
                    {thuocs.map((t) => (
                        <Picker.Item key={t.id} label={t.ten} value={t.id} />
                    ))}
                </Picker>
            </View>
            
            {/* --- Hiển thị thông tin tồn kho và đơn vị --- */}
            {selectedThuoc && (
                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        Tồn kho hiện tại (ĐV LỚN): <Text style={{fontWeight: 'bold', color: '#007aff'}}>{(selectedThuoc.soluong / selectedThuoc.heSoQuyDoi).toLocaleString('vi-VN')}</Text> {selectedThuoc.donViTinh}
                    </Text>
                    <Text style={styles.infoText}>
                        Hệ số quy đổi: <Text style={{fontWeight: 'bold'}}>{selectedThuoc.heSoQuyDoi}</Text> ({selectedThuoc.donViTinh} = {selectedThuoc.heSoQuyDoi} {selectedThuoc.donViNho})
                    </Text>
                    <Text style={styles.infoText}>
                        Giá vốn cũ (ĐV LỚN): <Text style={{fontWeight: 'bold'}}>{selectedThuoc.giaVon.toLocaleString('vi-VN')} VNĐ</Text>
                    </Text>
                </View>
            )}


            {/* --- 2. Số lượng nhập (Đơn vị LỚN) --- */}
            <Text style={styles.label}>Số lượng nhập (Đơn vị LỚN: {selectedThuoc?.donViTinh || '...'}) (*)</Text>
            <TextInput
                value={soLuongNhapLon}
                onChangeText={setSoLuongNhapLon}
                keyboardType="numeric"
                style={styles.input}
                placeholder={`Nhập số lượng theo ${selectedThuoc?.donViTinh || 'Đơn vị LỚN'}`}
            />

            {/* --- 3. Giá nhập (Đơn vị LỚN) --- */}
            <Text style={styles.label}>Giá nhập (VNĐ) (Theo Đơn vị LỚN: {selectedThuoc?.donViTinh || '...'}) (*)</Text>
            <TextInput
                value={giaNhapLon}
                onChangeText={setGiaNhapLon}
                keyboardType="numeric"
                style={styles.input}
                placeholder={`Giá nhập của 1 ${selectedThuoc?.donViTinh || 'Đơn vị LỚN'}`}
            />

            {/* --- 4. Ngày nhập --- */}
            <Text style={styles.label}>Ngày nhập (*)</Text>
            <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={styles.dateButton}
            >
                <MaterialIcons name="calendar-today" size={16} color="#4a90e2" />
                <Text style={{ marginLeft: 8 }}>{ngayNhap.toLocaleDateString('vi-VN')}</Text>
            </TouchableOpacity>

            {showDatePicker && (
                <DateTimePicker
                    testID="dateTimePicker"
                    value={ngayNhap}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onChangeDate}
                />
            )}

            {/* --- Nút Lưu --- */}
            <TouchableOpacity 
                style={[styles.button, loading && { opacity: 0.6 }]} 
                onPress={handleSave} 
                disabled={loading}
            >
                {/* Đã bọc icon và text trong <View> để tránh lỗi "Text strings must be rendered within a Text component" không rõ nguyên nhân ở cấp độ hệ thống */}
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialIcons name="save" size={24} color="#fff" />
                        <Text style={styles.buttonText}>Lưu phiếu nhập & Xuất PDF</Text>
                    </View>
                )}
            </TouchableOpacity>
            
            <View style={{height: 50}} /> 
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f9f9f9", padding: 16 },
    title: { 
        fontSize: 22, 
        fontWeight: "bold", 
        marginBottom: 20, 
        textAlign: "center",
        color: "#333",
    },
    historyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#e6f0ff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#4a90e2',
    },
    historyButtonText: {
        marginLeft: 8,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#007aff',
    },
    label: { marginTop: 15, fontWeight: "bold", color: '#555' },
    input: {
        borderWidth: 1,
        borderColor: "#ddd",
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginTop: 6,
        fontSize: 16,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: "#ddd",
        backgroundColor: '#fff',
        borderRadius: 8,
        marginTop: 6,
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        width: '100%',
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: "#ddd",
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        marginTop: 6,
    },
    button: {
        backgroundColor: "#4a90e2", 
        padding: 15,
        borderRadius: 10,
        marginTop: 30,
        alignItems: "center",
        flexDirection: 'row',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 5,
    },
    buttonText: { color: "#fff", fontWeight: "bold", fontSize: 18, marginLeft: 10 },
    infoBox: {
        backgroundColor: '#e6f7ff',
        borderLeftColor: '#4a90e2',
        borderLeftWidth: 4,
        padding: 12,
        borderRadius: 8,
        marginTop: 15,
    },
    infoText: {
        fontSize: 14,
        lineHeight: 20,
        color: '#333'
    }
});