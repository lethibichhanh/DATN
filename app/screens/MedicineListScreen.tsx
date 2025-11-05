// DanhSachThuoc.tsx — Trang danh sách thuốc có ảnh, tìm kiếm, lọc, xem chi tiết

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { db } from '../../firebaseConfig';
import type { RootStackParamList, Thuoc } from '../../types';

// Ảnh mặc định nếu thuốc chưa có hình
const DEFAULT_IMAGE_URL = 'https://via.placeholder.com/100?text=No+Image';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DanhSachThuocScreen() {
    const [thuocs, setThuocs] = useState<Thuoc[]>([]);
    const [filtered, setFiltered] = useState<Thuoc[]>([]);
    const [danhMucs, setDanhMucs] = useState<string[]>([]);
    const [selectedDanhMuc, setSelectedDanhMuc] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const navigation = useNavigation<NavigationProp>();

    // 🔹 Load danh sách thuốc từ Firestore
    useEffect(() => {
        const unsub = onSnapshot(
            collection(db, 'thuocs'),
            (snap) => {
                const data = snap.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Thuoc[];
                setThuocs(data);
                setLoading(false);
            },
            (error) => {
                console.error('Lỗi khi tải danh sách thuốc:', error);
                setLoading(false);
                Alert.alert('Lỗi', 'Không thể tải dữ liệu thuốc.');
            },
        );
        return () => unsub();
    }, []);

    // 🔹 Load danh mục thuốc từ Firestore
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'danhmucs'), (snap) => {
            // Đảm bảo chỉ lấy ra tên (thuộc tính 'ten')
            const list = snap.docs.map((doc) => doc.data().ten as string).filter(Boolean);
            setDanhMucs(list);
        });
        return () => unsub();
    }, []);

    // 🔹 Lọc và tìm kiếm
    useEffect(() => {
        const filteredData = thuocs.filter((t) => {
            // Tìm theo tên
            const matchName = t.ten?.toLowerCase().includes(search.toLowerCase());
            // Lọc theo danh mục
            const matchCategory = selectedDanhMuc ? t.danhMuc === selectedDanhMuc : true;
            return matchName && matchCategory;
        });
        setFiltered(filteredData);
    }, [search, selectedDanhMuc, thuocs]);

    // 🔹 Hiển thị mỗi thuốc (Dạng thẻ ngang mới)
    const renderItem = ({ item }: { item: Thuoc }) => {
        // Ép kiểu để truy cập các trường mở rộng như heSoQuyDoi
        const itemData = item as any;

        const heSoQuyDoi = itemData.heSoQuyDoi || 1;
        const tongSoLuongNho = item.soluong || 0;

        // 🔥 TÍNH TOÁN: Chuyển đổi số lượng từ đơn vị nhỏ (Viên) sang Đơn vị LỚN (Lọ/Hộp)
        const soLuongLonHienThi = heSoQuyDoi > 0 ? tongSoLuongNho / heSoQuyDoi : tongSoLuongNho;

        // Định dạng chuỗi hiển thị (sử dụng đơn vị lớn là donViTinh)
        const donViLon = item.donViTinh || 'Đơn vị';

        // SỬA LỖI: Sử dụng toLocaleString với options để định dạng và làm tròn số nguyên
        const soLuongHienThiText = `${soLuongLonHienThi.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} ${donViLon}`;


        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('ChiTietThuoc', { thuoc: item })}
            >
                <Image
                    source={{
                        uri:
                            item.imageUrl && item.imageUrl.startsWith('http')
                                ? item.imageUrl
                                : DEFAULT_IMAGE_URL,
                    }}
                    style={styles.image}
                    resizeMode="cover"
                />

                {/* Container chứa thông tin */}
                <View style={styles.infoContainer}>
                    <Text style={styles.name} numberOfLines={1}>
                        {item.ten || 'Chưa có tên'}
                    </Text>
                    <Text style={styles.details}>
                        Danh mục: <Text style={{ fontWeight: '600' }}>{item.danhMuc || 'Không'}</Text>
                    </Text>
                    <Text style={styles.details}>
                        Còn lại:
                        {/* 🎯 Dòng đã sửa để hiển thị Số lượng LỚN */}
                        <Text style={styles.soluongText}> {soLuongHienThiText}</Text>
                    </Text>
                    <Text style={styles.details}>
                        Giá bán:
                        <Text style={styles.giaText}> {item.giaBan?.toLocaleString('vi-VN') || '0'} VNĐ</Text>
                    </Text>
                </View>

                {/* Icon chi tiết */}
                <Ionicons name="chevron-forward-outline" size={24} color="#888" />
            </TouchableOpacity>
        );
    };

    // 🔹 Hiển thị loading
    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#4a90e2" />
                <Text style={{ marginTop: 10 }}>Đang tải danh sách thuốc...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>📦 Danh sách thuốc</Text>

            <View style={styles.header}>
                {/* 🔍 Ô tìm kiếm */}
                <TextInput
                    placeholder="🔍 Tìm tên thuốc..."
                    value={search}
                    onChangeText={setSearch}
                    style={styles.input}
                />
            </View>

            {/* 🔹 Bộ lọc danh mục */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterContainer}
            >
                {/* Nút "Tất cả" */}
                <TouchableOpacity
                    style={[
                        styles.filterBtn,
                        selectedDanhMuc === '' && styles.filterBtnSelected,
                    ]}
                    onPress={() => setSelectedDanhMuc('')}
                >
                    <Text style={[styles.filterText, { color: selectedDanhMuc === '' ? '#fff' : '#333' }]}>
                        Tất cả
                    </Text>
                </TouchableOpacity>

                {/* Các danh mục */}
                {danhMucs.map((item, index) => (
                    <TouchableOpacity
                        key={item + index}
                        style={[
                            styles.filterBtn,
                            selectedDanhMuc === item && styles.filterBtnSelected,
                        ]}
                        onPress={() => setSelectedDanhMuc(item)}
                    >
                        <Text style={[styles.filterText, { color: selectedDanhMuc === item ? '#fff' : '#333' }]}>
                            {item}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* 🔹 Danh sách thuốc */}
            {filtered.length === 0 ? (
                <Text style={styles.empty}>Không có thuốc nào phù hợp.</Text>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    // Thêm style để áp dụng padding cho danh sách, tránh bị dính sát
                    contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 80 }}
                />
            )}

            {/* ➕ Nút thêm thuốc (FAB) */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('ThemThuoc')}
            >
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

// 💅 Styles (Đã cập nhật)
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa' }, // Soft background
    title: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 12,
        color: '#1e3c72', // Deep blue
        paddingTop: 8,
    },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10, // More rounded
        padding: 12,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 3,
        elevation: 2,
        marginBottom: 10,
    },
    // --- Filter Styles ---
    filterContainer: {
        marginBottom: 10,
        paddingHorizontal: 16, // Thêm padding cho scroll view
    },
    filterBtn: {
        backgroundColor: '#fff',
        paddingVertical: 8,
        paddingHorizontal: 15,
        marginRight: 8,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    filterBtnSelected: {
        backgroundColor: '#4a90e2', // Primary color
        borderColor: '#4a90e2',
    },
    filterText: {
        fontWeight: '500',
        fontSize: 14,
    },
    // --- Card Styles (List View) ---
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 15,
        marginHorizontal: 16, // Căn lề cho thẻ
        marginBottom: 10,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 6,
        elevation: 5,
    },
    image: {
        width: 60,
        height: 60,
        borderRadius: 10, // Slightly rounded image
        marginRight: 15,
        backgroundColor: '#e6f0ff', // Light blue placeholder background
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    infoContainer: {
        flex: 1,
        marginRight: 10,
    },
    name: {
        fontWeight: '700',
        fontSize: 16,
        color: '#333',
        marginBottom: 4,
    },
    details: {
        fontSize: 13,
        color: '#666',
    },
    soluongText: {
        fontWeight: 'bold',
        color: '#007bff', // Blue for quantity
    },
    giaText: {
        fontWeight: 'bold',
        color: '#28a745', // Green for price
    },
    // --- FAB Styles ---
    fab: {
        position: 'absolute',
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        right: 20,
        bottom: 20,
        backgroundColor: '#28a745', // Green for Add button
        borderRadius: 30,
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 5,
    },
    empty: { textAlign: 'center', color: '#888', marginTop: 30 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
});