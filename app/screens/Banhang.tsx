import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
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
  ActivityIndicator, // Thêm ActivityIndicator cho Loading
} from "react-native";
import { auth, db } from "../../firebaseConfig"; 

export default function BanhangScreen() {
  const [thuocs, setThuocs] = useState<any[]>([]); 
  // Sử dụng state cho loading
  const [isLoading, setIsLoading] = useState(true); 
  const [selected, setSelected] = useState<Record<string, number>>({}); 
  const [khachHang, setKhachHang] = useState<string>(""); 
  const [isModalVisible, setIsModalVisible] = useState(false); 
  const [searchTerm, setSearchTerm] = useState(""); 
  const [isProcessing, setIsProcessing] = useState(false); // State cho lúc tạo hóa đơn

  // 1. FETCH DỮ LIỆU THUỐC
  useEffect(() => {
    setIsLoading(true);
    // Bổ sung query để sắp xếp hoặc lọc nếu cần (Ví dụ: chỉ lấy thuốc còn tồn kho)
    const unsub = onSnapshot(collection(db, "thuocs"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setThuocs(data);
      // Tắt loading sau khi có data
      setIsLoading(false); 
    }, (error) => {
      console.error("Lỗi fetching thuốc:", error);
      setIsLoading(false);
      Alert.alert("Lỗi dữ liệu", "Không thể tải danh sách thuốc.");
    });
    return () => unsub();
  }, []);

  // --- 2. LOGIC XỬ LÝ SỐ LƯỢNG & KIỂM TRA TỒN KHO ---
  const handleQuantityChange = (id: string, value: string) => {
    const num = parseInt(value);
    const item = thuocs.find(t => t.id === id);
    // Bảo vệ item?.soluong, fallback 0 nếu undefined
    const tonKho = item?.soluong || 0; 

    let soLuongBan = isNaN(num) || num < 0 ? 0 : num;

    // 🛑 KIỂM TRA TỒN KHO: 
    if (soLuongBan > tonKho) {
      Alert.alert("Lỗi tồn kho", `Số lượng bán (${soLuongBan}) vượt quá số lượng còn (${tonKho}).`);
      soLuongBan = tonKho; 
    }

    setSelected((prev) => ({
      ...prev,
      [id]: soLuongBan,
    }));
  };
  
  // --- 3. CHUẨN BỊ DỮ LIỆU HÓA ĐƠN (Sử dụng useMemo để tối ưu) ---
  const { itemsToBuy, tongTien } = useMemo(() => {
    const calculatedItems = thuocs
      .filter((t) => selected[t.id] > 0)
      .map((t) => {
        const donGia = t.giaBan || 0;
        const soLuong = selected[t.id];
        return {
          id: t.id,
          tenThuoc: t.ten, 
          soLuong: soLuong,
          donGia: donGia,
          thanhTien: donGia * soLuong,
        };
      });
    
    const total = calculatedItems.reduce((sum, item) => sum + item.thanhTien, 0);

    return { itemsToBuy: calculatedItems, tongTien: total };
  }, [thuocs, selected]); // Chỉ tính toán lại khi danh sách thuốc hoặc số lượng chọn thay đổi

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
      setIsProcessing(true); // Bật trạng thái xử lý
      
      // Lấy thông tin nhân viên
      const uid = auth.currentUser?.uid;
      let nhanVienName = "Unknown";
      
      if (uid) {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          nhanVienName = userDoc.data().name || "Unknown";
        }
      }

      // 1. Lưu hóa đơn
      await addDoc(collection(db, "hoadons"), {
        ngayBan: new Date(),
        items: itemsToBuy,
        tongTien,
        nhanVien: nhanVienName,
        khachHang: khachHang || "Khách lẻ", 
        // Thêm UID người bán để phục vụ báo cáo sau này
        nhanVienUid: uid, 
      });

      // 2. Cập nhật số lượng trong kho
      for (const item of itemsToBuy) {
        const thuocRef = doc(db, "thuocs", item.id);
        const thuoc = thuocs.find((t) => t.id === item.id);
        
        if (thuoc) {
          const newSoLuong = (thuoc.soluong || 0) - item.soLuong; 
          // Chỉ cập nhật nếu số lượng mới hợp lệ
          if (newSoLuong >= 0) {
            await updateDoc(thuocRef, { soluong: newSoLuong });
          } else {
            // Đây là trường hợp hiếm nếu đã check tồn kho, nhưng vẫn nên bảo vệ
            console.warn(`Lỗi: Số lượng mới của ${item.tenThuoc} là âm. Bỏ qua cập nhật.`);
          }
        }
      }

      Alert.alert("✅ Bán hàng thành công!", `Đã tạo hóa đơn với tổng tiền: ${tongTien.toLocaleString()} VNĐ`);
      
      // 3. RESET TRẠNG THÁI
      setSelected({});
      setKhachHang("");
      setSearchTerm("");

    } catch (error) {
      console.error("Lỗi tạo hóa đơn:", error);
      Alert.alert("❌ Lỗi khi tạo hóa đơn", "Vui lòng kiểm tra kết nối và thử lại.");
    } finally {
      setIsProcessing(false); // Tắt trạng thái xử lý
    }
  };
  
  // --- 5. TÌM KIẾM ---
  const filteredThuocs = thuocs.filter(t => 
    // Bảo vệ bằng cách ép kiểu sang String và kiểm tra tồn tại
    (t.ten && String(t.ten).toLowerCase().includes(searchTerm.toLowerCase()))
  );


  // --- GIAO DIỆN HIỂN THỊ ---

  const renderItem = ({ item }: { item: any }) => {
    const currentStock = item.soluong || 0; 
    const isLowStock = currentStock <= 10 && currentStock > 0;
    const isOutOfStock = currentStock <= 0;
    
    // ✅ CẬP NHẬT: Định nghĩa rõ Đơn vị lớn và Đơn vị bán lẻ
    // Đơn vị lớn (Ví dụ: Hộp, Vỉ)
    const donViLon = String(item.donVi || item.donViTinh || 'Không rõ'); 
    // Đơn vị bán lẻ (Ví dụ: Viên, Gói) - dùng cho nhập số lượng bán
    const donViBanLe = String(item.donViNho || item.donViTinh || 'Không rõ'); 

    return (
      <View style={[styles.itemCard, isOutOfStock && styles.outOfStockCard]}>
        <Text style={styles.name}>{item.ten || "Tên thuốc không rõ"}</Text>
        
        {/* HIỂN THỊ ĐƠN VỊ LỚN */}
        <Text style={{ color: '#666' }}>Đơn vị lớn: {donViLon}</Text>

        {/* HIỂN THỊ ĐƠN VỊ BÁN LẺ/NHỎ */}
        <Text style={{ color: '#666' }}>Đơn vị bán lẻ: {donViBanLe}</Text>

        <Text style={{ color: '#007bff', fontWeight: 'bold', marginTop: 5 }}>
          Giá bán: {(item.giaBan || 0).toLocaleString()} VNĐ
        </Text>

        <Text style={[styles.stockText, isLowStock && styles.lowStockText, isOutOfStock && styles.outOfStockStockText]}>
          Tồn kho: {currentStock} ({donViBanLe})
        </Text>
        
        <TextInput
          placeholder={isOutOfStock ? "Hết hàng" : `Số lượng bán (Đơn vị: ${donViBanLe})`} 
          keyboardType="numeric"
          style={[styles.input, isOutOfStock && styles.inputDisabled]}
          editable={!isOutOfStock}
          // Đảm bảo hiển thị giá trị hiện tại từ selected state
          value={selected[item.id] > 0 ? String(selected[item.id]) : ''}
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
          <Text style={styles.modalSubTitle}>Khách hàng: {khachHang || "Khách lẻ"}</Text>
          
          <ScrollView style={{ maxHeight: 200, marginBottom: 15 }}>
              {itemsToBuy.map((item) => (
                  <View key={item.id} style={styles.modalItem}>
                      <Text style={{ flex: 2 }}>{item.tenThuoc}</Text>
                      <Text style={{ flex: 1, textAlign: 'center' }}>x {item.soLuong}</Text>
                      <Text style={{ flex: 2, textAlign: 'right' }}>{item.thanhTien.toLocaleString()} VNĐ</Text>
                  </View>
              ))}
          </ScrollView>

          <Text style={styles.modalTotal}>
            Tổng tiền: <Text style={{ color: '#d0021b', fontWeight: 'bold' }}>{tongTien.toLocaleString()} VNĐ</Text>
          </Text>
          
          <View style={styles.modalButtonContainer}>
            <Button title="Hủy" onPress={() => setIsModalVisible(false)} color="#888" disabled={isProcessing} />
            {isProcessing ? (
              <ActivityIndicator size="small" color="#4a90e2" style={{ marginLeft: 10 }}/>
            ) : (
              <Button title="Xác nhận BÁN" onPress={handleCreateInvoice} color="#4a90e2" />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );


  return (
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
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>Không tìm thấy thuốc nào.</Text>
        )}
      />
    )}

      <View style={styles.summaryBar}>
          <Text style={styles.totalText}>
              Thành tiền: <Text style={{ fontWeight: 'bold', color: '#d0021b' }}>{tongTien.toLocaleString()} VNĐ</Text>
          </Text>
          <TouchableOpacity 
              onPress={handleConfirmInvoice} 
              style={[styles.invoiceButton, itemsToBuy.length === 0 && styles.invoiceButtonDisabled]}
              disabled={itemsToBuy.length === 0 || isProcessing} // Vô hiệu hóa khi đang xử lý
          >
              <Text style={styles.invoiceButtonText}>
                {isProcessing ? 'Đang xử lý...' : `Tạo Hóa Đơn (${itemsToBuy.length})`}
              </Text>
          </TouchableOpacity>
      </View>

      <InvoiceConfirmationModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 10, backgroundColor: '#f5f5f5' },
  title: { fontSize: 22, fontWeight: 'bold', marginVertical: 15, textAlign: "center", color: '#333' },
  
  searchBar: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  
  customerInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
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
      backgroundColor: '#fdd', 
      opacity: 0.7,
  },
  
  name: { fontSize: 18, fontWeight: "bold", marginBottom: 4, color: '#4a90e2' },
  
  stockText: {
      fontSize: 14,
      marginTop: 4,
      color: '#333',
  },
  lowStockText: {
      color: 'orange',
      fontWeight: 'bold',
  },
  outOfStockStockText: {
      color: 'red',
      fontWeight: 'bold',
  },
  
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
    backgroundColor: '#fff',
  },
  
  inputDisabled: {
      backgroundColor: '#eee',
  },
  
  // Styles mới
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#999',
  },
  
  // Styles cho phần Tóm tắt và Nút bán hàng cố định
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  totalText: {
      fontSize: 16,
      color: '#333',
  },
  invoiceButton: {
      backgroundColor: '#4CAF50', 
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderRadius: 8,
  },
  invoiceButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
  },
  invoiceButtonDisabled: {
      backgroundColor: '#ccc',
  },
  
  // Styles cho Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#4a90e2',
    textAlign: 'center',
  },
  modalSubTitle: {
      fontSize: 14,
      marginBottom: 10,
      fontStyle: 'italic',
      borderBottomWidth: 1,
      paddingBottom: 5,
      borderColor: '#eee',
  },
  modalItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 5,
      borderBottomWidth: 1,
      borderBottomColor: '#f5f5f5',
  },
  modalTotal: {
    fontSize: 18,
    marginTop: 15,
    textAlign: 'right',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
});