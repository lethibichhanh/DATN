import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import * as Print from "expo-print"; // 💡 Import thêm Print
import * as Sharing from "expo-sharing"; // 💡 Import thêm Sharing
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
    Platform, // Import Platform để xử lý DatePicker
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { db } from "../../firebaseConfig";

// Kiểu dữ liệu chi tiết cần thiết cho nhập kho
type ThuocDetailType = {
    id: string;
    ten: string;
    soluong: number; // Tổng tồn kho theo Đơn vị NHỎ
    donViTinh: string; // Đơn vị LỚN
    donViNho: string; // Đơn vị NHỎ
    heSoQuyDoi: number; // Hệ số quy đổi
    giaVon: number; // Giá vốn (Đơn vị LỚN)
    // Thêm các trường khác cần thiết cho báo cáo (nếu có)
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
                xuatXu: doc.data().xuatXu || '', 
                danhMuc: doc.data().danhMuc || '',
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

        const html = `
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                <style>
                    body { font-family: 'Arial', sans-serif; padding: 20px; color: #333; }
                    h1 { color: #4a90e2; text-align: center; }
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
                <h3 style="text-align:center;">Mã phiếu: ${new Date().getTime()}</h3>
                <p style="text-align:right; font-style: italic;">Ngày lập: ${new Date().toLocaleDateString('vi-VN')}</p>
                <hr/>

                <h2>Thông tin nhập hàng</h2>
                <div class="header-info">
                    <p><b>Tên Thuốc:</b> ${data.tenThuoc}</p>
                    <p><b>Danh mục:</b> ${selectedThuoc?.danhMuc || 'N/A'}</p>
                    <p><b>Xuất xứ:</b> ${selectedThuoc?.xuatXu || 'N/A'}</p>
                    <p><b>Hạn sử dụng (Theo HSD đã lưu):</b> ${selectedThuoc?.hanSuDung || 'N/A'}</p>
                    <p><b>Ngày Nhập:</b> ${data.ngayNhap.toLocaleDateString('vi-VN')}</p>
                </div>
                
                <hr/>

                <h2>Chi tiết</h2>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Đơn vị tính</th>
                            <th>Số lượng</th>
                            <th>Giá nhập (ĐV LỚN)</th>
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
                            <td>${(data.giaNhapLon / data.heSoQuyDoi).toLocaleString('vi-VN')} VNĐ</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>

                <div class="wac-update">
                    <p><b>Cập nhật Giá vốn Bình quân:</b></p>
                    <p>Giá vốn cũ (ĐV LỚN): ${selectedThuoc?.giaVon.toLocaleString('vi-VN') || 0} VNĐ</p>
                    <p>Giá vốn <span style="color:#28a745; font-weight: bold;">MỚI</span> (ĐV LỚN): ${data.giaVonMoi.toLocaleString('vi-VN')} VNĐ</p>
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
            // Kiểm tra xem thiết bị có hỗ trợ chia sẻ không
            if (!(await Sharing.isAvailableAsync())) {
                 Alert.alert("Lỗi", "Thiết bị không hỗ trợ chia sẻ file.");
                 return;
            }
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) {
            Alert.alert("Lỗi xuất PDF", "Không thể tạo hoặc chia sẻ file PDF.");
            console.error(error);
        }
    }, [selectedThuoc]);

    // --- Hàm lưu phiếu nhập ---
    const handleSave = async () => {
        if (!thuocChonId || !soLuongNhapLon || !giaNhapLon) {
            Alert.alert("⚠️ Thiếu thông tin", "Vui lòng chọn thuốc, nhập số lượng và giá nhập.");
            return;
        }

        const soLuongLon = Number(soLuongNhapLon);
        const giaLon = Number(giaNhapLon);

        if (isNaN(soLuongLon) || soLuongLon <= 0) {
            Alert.alert("❌ Lỗi đầu vào", "Số lượng nhập phải là một số dương.");
            return;
        }
        if (isNaN(giaLon) || giaLon <= 0) {
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
        const tenThuoc = selectedThuoc.ten;

        try {
            // 1️⃣ Lưu phiếu nhập kho
            // (Bạn nên thêm trường `nhanVienUid` ở đây nếu có thông tin User đang đăng nhập)
            await addDoc(collection(db, "nhapkho"), {
                thuocId: thuocChonId,
                tenThuoc: tenThuoc,
                soLuongNhapLon: soLuongLon,
                giaNhapLon: giaLon,
                donViTinh: selectedThuoc.donViTinh,
                donViNho: selectedThuoc.donViNho,
                heSoQuyDoi: heSoQuyDoi,
                ngayNhap: ngayNhap,
                createdAt: serverTimestamp(),
            });

            // 2️⃣ Cập nhật số lượng thuốc và Giá vốn trong kho
            const thuocRef = doc(db, "thuocs", thuocChonId);
            const thuocSnap = await getDoc(thuocRef);

            if (thuocSnap.exists()) {
                const data = thuocSnap.data() as ThuocDetailType;

                // --- ⚙️ BẮT ĐẦU NGHIỆP VỤ KẾ TOÁN: TÍNH GIÁ VỐN BÌNH QUÂN GIA QUYỀN (WAC) ---

                // 1. Lấy tồn kho hiện tại (đơn vị NHỎ)
                const soLuongTonKhoHienTaiNho = data.soluong || 0;

                // 2. Chuyển đổi sang đơn vị LỚN để tính giá trị
                const QtyLonHienTai = soLuongTonKhoHienTaiNho / heSoQuyDoi;
                const GiaVonLonHienTai = data.giaVon || 0;

                // 3. Tính Tổng giá trị tồn cũ (Old Value)
                const OldValue = QtyLonHienTai * GiaVonLonHienTai;

                // 4. Tính Tổng giá trị nhập mới (New Import Value)
                const NewImportValue = soLuongLon * giaLon; // soLuongLon * giaNhapLon

                // 5. Tính Tổng số lượng LỚN mới (Total Quantity)
                const NewQtyLon = QtyLonHienTai + soLuongLon;

                if (NewQtyLon > 0) {
                    // 6. Tính Giá vốn Bình quân Gia quyền (WAC)
                    const NewTotalValue = OldValue + NewImportValue;
                    newGiaVonLon = NewTotalValue / NewQtyLon;
                }

                // --- KẾT THÚC NGHIỆP VỤ KẾ TOÁN ---

                // Tổng tồn kho NHỎ mới
                const soLuongTonKhoMoiNho = soLuongTonKhoHienTaiNho + soLuongNhoThem;

                await updateDoc(thuocRef, {
                    soluong: soLuongTonKhoMoiNho, // Cập nhật tổng SL theo Đơn vị NHỎ
                    giaVon: newGiaVonLon, // Cập nhật Giá vốn Bình quân mới
                    ngayCapNhat: new Date(),
                });

                // Dữ liệu cho PDF
                const phieuData: PhieuNhapKhoData = {
                    thuocId: thuocChonId,
                    tenThuoc: tenThuoc,
                    soLuongNhapLon: soLuongLon,
                    giaNhapLon: giaLon,
                    donViTinh: selectedThuoc.donViTinh,
                    donViNho: selectedThuoc.donViNho,
                    heSoQuyDoi: heSoQuyDoi,
                    ngayNhap: ngayNhap,
                    giaVonMoi: newGiaVonLon,
                    soLuongNhoThem: soLuongNhoThem,
                };
                
                // 3️⃣ XUẤT PHIẾU NHẬP (PDF)
                await generateAndSharePDF(phieuData);

                // Thông báo (sau khi đã xuất PDF)
                Alert.alert("✅ Nhập kho thành công", `Đã nhập ${soLuongLon} ${selectedThuoc.donViTinh} (${soLuongNhoThem} ${selectedThuoc.donViNho}) vào kho. Giá vốn bình quân mới là ${newGiaVonLon.toLocaleString('vi-VN')} VNĐ/${selectedThuoc.donViTinh}.`);
                
                // Reset form
                setThuocChonId("");
                setSoLuongNhapLon("");
                setGiaNhapLon("");
                setNgayNhap(new Date());

            } else {
                 Alert.alert("❌ Lỗi dữ liệu", "Thuốc đã chọn không còn tồn tại trong kho.");
            }


        } catch (error) {
            console.error("Lỗi khi lưu phiếu nhập:", error);
            Alert.alert("❌ Lỗi", "Không thể lưu phiếu nhập kho. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}><MaterialIcons name="inventory" size={24} color="#4a90e2" /> Phiếu Nhập kho thuốc</Text>

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
                        Tồn kho hiện tại: <Text style={{fontWeight: 'bold', color: '#007aff'}}>{(selectedThuoc.soluong / selectedThuoc.heSoQuyDoi).toLocaleString('vi-VN')}</Text> {selectedThuoc.donViTinh} (Tổng {selectedThuoc.soluong.toLocaleString('vi-VN')} {selectedThuoc.donViNho})
                    </Text>
                    <Text style={styles.infoText}>
                        Đơn vị nhập: <Text style={{fontWeight: 'bold'}}>{selectedThuoc.donViTinh}</Text> (1 {selectedThuoc.donViTinh} = {selectedThuoc.heSoQuyDoi} {selectedThuoc.donViNho})
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
            <Text style={styles.label}>Giá nhập (VNĐ) (Theo Đơn vị LỚN) (*)</Text>
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
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                        <MaterialIcons name="save" size={24} color="#fff" />
                        <Text style={styles.buttonText}>Lưu phiếu nhập & Xuất PDF</Text>
                    </>
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