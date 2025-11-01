// app/screens/XuatXu.tsx
import React, { useEffect, useState } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    FlatList, 
    TouchableOpacity, 
    StyleSheet, 
    Alert,
    ActivityIndicator,
    // SỬA LỖI: Thêm Button vào danh sách import từ react-native
    Button, 
} from 'react-native';
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    updateDoc, 
    deleteDoc, 
    doc, 
    query 
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

// Định nghĩa kiểu dữ liệu chi tiết
type XuatXuType = { 
    id: string; 
    ten: string; 
    ngayTao?: Date; 
};

export default function XuatXuScreen() {
    const [list, setList] = useState<XuatXuType[]>([]);
    const [tenMoi, setTenMoi] = useState('');
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // --- 1. Load Danh sách (Read) ---
    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'xuatxu'));
        
        const unsub = onSnapshot(q, (snap) => {
            const data: XuatXuType[] = snap.docs.map((document) => ({ 
                id: document.id, 
                ten: document.data().ten,
                // Chuyển Timestamp sang Date
                ngayTao: document.data().ngayTao?.toDate() || new Date(),
            }));
            setList(data);
            setLoading(false);
        }, (error) => {
            console.error("Lỗi tải dữ liệu xuất xứ:", error);
            setLoading(false);
            Alert.alert("Lỗi", "Không thể tải dữ liệu xuất xứ.");
        });

        return () => unsub();
    }, []);

    // --- 2. Thêm / Cập nhật (Create/Update) ---
    const handleSave = async () => {
        const tenTrimmed = tenMoi.trim();
        if (!tenTrimmed) {
            Alert.alert('Lỗi', 'Vui lòng nhập tên xuất xứ.');
            return;
        }

        try {
            if (editingId) {
                // Chế độ Cập nhật
                const existingItem = list.find(item => item.id === editingId);
                const data = {
                    ten: tenTrimmed,
                    ngayCapNhat: new Date(),
                    ngayTao: existingItem?.ngayTao || new Date(), // Giữ nguyên ngày tạo
                };
                await updateDoc(doc(db, 'xuatxu', editingId), data);
                Alert.alert('✅ Thành công', `Đã cập nhật xuất xứ: ${tenTrimmed}`);
            } else {
                // Chế độ Thêm mới
                await addDoc(collection(db, 'xuatxu'), { 
                    ten: tenTrimmed, 
                    ngayTao: new Date(),
                    ngayCapNhat: new Date(),
                });
                Alert.alert('✅ Thành công', `Đã thêm xuất xứ mới: ${tenTrimmed}`);
            }
        } catch (error) {
            console.error(error);
            Alert.alert('❌ Lỗi', 'Không thể lưu dữ liệu.');
        } finally {
            // Reset form
            setTenMoi('');
            setEditingId(null);
        }
    };

    // --- 3. Xóa (Delete) ---
    const handleDelete = (id: string, ten: string) => {
        Alert.alert('Xác nhận xóa', `Bạn có chắc chắn muốn xóa xuất xứ "${ten}"?`, [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteDoc(doc(db, 'xuatxu', id));
                        Alert.alert('🗑️ Đã xóa', `Đã xóa xuất xứ "${ten}" thành công.`);
                    } catch (error) {
                        console.error(error);
                        Alert.alert('❌ Lỗi', 'Không thể xóa xuất xứ này. Có thể nó đang được sử dụng ở nơi khác.');
                    } finally {
                        setEditingId(null);
                        setTenMoi('');
                    }
                },
            },
        ]);
    };

    // --- 4. Chuyển sang chế độ Sửa ---
    const handleEditStart = (item: XuatXuType) => {
        setTenMoi(item.ten);
        setEditingId(item.id);
    };

    const handleCancelEdit = () => {
        setTenMoi('');
        setEditingId(null);
    };

    // --- 5. Lọc danh sách (Tìm kiếm) ---
    const filteredList = list.filter((item) =>
        item.ten.toLowerCase().includes(search.toLowerCase())
    );

    // --- Component Item của FlatList ---
    const renderItem = ({ item }: { item: XuatXuType }) => (
        <View style={styles.item}>
            <Text style={styles.itemText}>🌐 {item.ten}</Text>
            <View style={styles.actions}>
                <TouchableOpacity
                    onPress={() => handleEditStart(item)}
                    style={[styles.actionButton, styles.editButton]}
                >
                    <Ionicons name="pencil-outline" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => handleDelete(item.id, item.ten)}
                    style={[styles.actionButton, styles.deleteButton]}
                >
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );

    // --- Component chính ---
    return (
        <View style={styles.container}>
            <Text style={styles.mainTitle}>🌍 Quản lý Xuất xứ</Text>

            {/* --- Form Thêm / Sửa --- */}
            <Text style={styles.label}>{editingId ? 'Cập nhật tên xuất xứ' : 'Thêm xuất xứ mới'}</Text>
            <View style={styles.inputRow}>
                <TextInput
                    value={tenMoi}
                    onChangeText={setTenMoi}
                    placeholder="Nhập tên xuất xứ (VD: Việt Nam, Mỹ, Pháp...)"
                    style={styles.input}
                />
                <TouchableOpacity 
                    style={[styles.button, editingId ? styles.updateButton : styles.addButton]} 
                    onPress={handleSave}
                >
                    <Text style={styles.buttonText}>{editingId ? 'Cập nhật' : 'Thêm'}</Text>
                </TouchableOpacity>
            </View>
            
            {editingId && (
                <View style={{ marginBottom: 15 }}>
                    {/* ĐÃ SỬA LỖI: Button đã được import */}
                    <Button 
                        title="✖️ Hủy chỉnh sửa" 
                        onPress={handleCancelEdit} 
                        color="#dc3545" 
                    />
                </View>
            )}

            <View style={styles.separator} />

            {/* --- Tìm kiếm --- */}
            <Text style={styles.label}>🔍 Tìm kiếm xuất xứ</Text>
            <TextInput
                placeholder="Tìm kiếm theo tên..."
                value={search}
                onChangeText={setSearch}
                style={[styles.input, { marginBottom: 15 }]}
            />

            <Text style={styles.listHeaderTitle}>Danh sách ({filteredList.length})</Text>

            {/* --- Danh sách --- */}
            {loading ? (
                <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={filteredList}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={<Text style={styles.empty}>Không tìm thấy xuất xứ nào.</Text>}
                />
            )}
        </View>
    );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        padding: 20, 
        backgroundColor: '#f5f5f5' 
    },
    mainTitle: { 
        fontSize: 24, 
        fontWeight: 'bold', 
        marginBottom: 20, 
        textAlign: 'center',
        color: '#333',
    },
    listHeaderTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 10,
        color: '#555',
    },
    label: {
        fontWeight: '600',
        marginBottom: 5,
        color: '#333',
    },
    inputRow: { 
        flexDirection: 'row', 
        marginBottom: 10 
    },
    input: { 
        flex: 1, 
        borderWidth: 1, 
        borderColor: '#ccc',
        borderRadius: 8, 
        padding: 12, 
        backgroundColor: '#fff',
        fontSize: 16,
    },
    button: { 
        marginLeft: 8, 
        paddingHorizontal: 15, 
        paddingVertical: 12,
        borderRadius: 8, 
        justifyContent: 'center' 
    },
    addButton: {
        backgroundColor: '#007bff', // Màu xanh dương cho Thêm
    },
    updateButton: {
        backgroundColor: '#FFA500', // Màu cam cho Cập nhật
    },
    buttonText: { 
        color: '#fff',
        fontWeight: 'bold', 
    },
    item: { 
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff', 
        padding: 15, 
        borderRadius: 8, 
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    itemText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    actions: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: 8,
        borderRadius: 5,
        marginLeft: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editButton: {
        backgroundColor: '#007bff',
    },
    deleteButton: {
        backgroundColor: '#dc3545',
    },
    empty: { 
        textAlign: 'center', 
        color: '#888', 
        marginTop: 20,
        fontSize: 16, 
    },
    separator: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 20,
    },
});