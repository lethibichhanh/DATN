// app/screens/QuanLyTonKho.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Alert,
    ScrollView,
    Platform,
    ActivityIndicator,
} from "react-native";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig"; // Đảm bảo firebaseConfig đã được setup đúng
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { BarChart, PieChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";

// ✅ Cập nhật kiểu dữ liệu Thuoc để tính toán Giá vốn Bình quân Gia quyền (WAC)
type Thuoc = {
    id: string;
    ten: string;
    soluong: number; // Tổng tồn kho theo Đơn vị NHỎ
    hanSuDung?: string;
    giaBan?: number; // Giá bán (Đơn vị LỚN)
    giaVon?: number; // ✅ Giá vốn bình quân (Đơn vị LỚN)
    donViTinh?: string; // Đơn vị LỚN
    donViNho?: string; // Đơn vị NHỎ
    heSoQuyDoi?: number; // Hệ số quy đổi (1 ĐV LỚN = N ĐV NHỎ)
    [key: string]: any;
};

const screenW = Dimensions.get("window").width;

// --- UTILS & FORMATTING ---
const formatCurrency = (amount: number) => {
    return Math.abs(amount).toLocaleString("vi-VN") + " ₫";
};

// ✅ Parse ngày
const parseDate = (dateStr?: string): Date | null => {
    if (!dateStr) return null;
    const s = dateStr.trim();
    if (!s) return null;
    // Thử parse ISO format
    const iso = new Date(s);
    if (!isNaN(iso.getTime())) return iso;
    
    // Thử parse dd/mm/yyyy hoặc yyyy-mm-dd
    const parts = s.includes("-") ? s.split("-") : s.includes("/") ? s.split("/") : [];
    if (parts.length !== 3) return null;
    
    // Giả định yyyy-mm-dd
    if (parts[0].length === 4) {
        const [y, m, d] = parts.map(Number);
        return new Date(y, m - 1, d);
    } 
    // Giả định dd/mm/yyyy
    else {
        const [d, m, y] = parts.map(Number);
        return new Date(y, m - 1, d);
    }
};

const isHetHan = (han?: string) => {
    const d = parseDate(han);
    if (!d) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d.getTime() < today.getTime();
};

const isSapHetHan = (han?: string) => {
    const d = parseDate(han);
    if (!d) return false;
    const diff = (d.getTime() - Date.now()) / (1000 * 3600 * 24);
    // Sắp hết hạn trong 30 ngày tới
    return diff >= 0 && diff <= 30; 
};

// --- COMPONENT CHÍNH ---

export default function QuanLyTonKhoScreen() {
    const [thuocs, setThuocs] = useState<Thuoc[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const navigation = useNavigation<any>();

    useEffect(() => {
        // Cần thay thế 'db' bằng instance Firebase thực tế
        const unsub = onSnapshot(
            collection(db, "thuocs"),
            (snapshot) => {
                const data = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Thuoc[];
                // Đảm bảo các trường số lượng/giá trị tồn tại và là số
                const normalized = data.map((t) => ({ 
                    ...t, 
                    soluong: Number(t.soluong || 0),
                    heSoQuyDoi: Number(t.heSoQuyDoi || 1), // Mặc định 1
                    giaVon: Number(t.giaVon || 0), // Giá vốn BQ
                    giaBan: Number(t.giaBan || 0),
                    // Đảm bảo đơn vị tồn tại
                    donViTinh: t.donViTinh || "Hộp",
                    donViNho: t.donViNho || "Viên",
                }));
                setThuocs(normalized);
                setLoading(false);
            },
            (err) => {
                console.error("Lỗi lấy dữ liệu:", err);
                setLoading(false);
            }
        );
        return () => unsub();
    }, []);

    // 📊 Thống kê nhanh
    const totalTypes = thuocs.length;
    const totalQty = thuocs.reduce((s, t) => s + (t.soluong || 0), 0); // Tổng tồn kho theo Đơn vị NHỎ

    // ✅ Tính Giá trị tồn kho (totalValue) theo Giá vốn Bình quân (giaVon)
    const totalValue = useMemo(() => {
        return thuocs.reduce((sum, t) => {
            const qtyNho = t.soluong || 0;
            const heSo = t.heSoQuyDoi || 1;
            const giaVonLon = t.giaVon || 0;
            // Giá trị tồn kho = Tổng (Số lượng Đơn vị LỚN * Giá vốn Đơn vị LỚN)
            const qtyLon = qtyNho / heSo;
            return sum + qtyLon * giaVonLon;
        }, 0);
    }, [thuocs]);

    // Ngưỡng cảnh báo tồn kho thấp (ví dụ: <= 10 đơn vị nhỏ)
    const LOW_STOCK_THRESHOLD_NHO = 10; 
    
    // Số lượng loại thuốc có tồn kho thấp
    const sapHetCount = thuocs.filter((t) => (t.soluong || 0) <= LOW_STOCK_THRESHOLD_NHO).length; 
    const hetHanCount = thuocs.filter((t) => isHetHan(t.hanSuDung)).length;
    const sapHetHanCount = thuocs.filter((t) => isSapHetHan(t.hanSuDung)).length;

    const topByQty = useMemo(() => {
        return [...thuocs].sort((a, b) => (b.soluong || 0) - (a.soluong || 0)).slice(0, 6);
    }, [thuocs]);

    // Data cho Pie Chart
    const pieData = [
        {
            name: "An toàn",
            count: Math.max(0, totalTypes - sapHetCount - sapHetHanCount - hetHanCount),
        },
        { name: "Sắp hết", count: sapHetCount },
        { name: "Sắp hết hạn", count: sapHetHanCount },
        { name: "Hết hạn", count: hetHanCount },
    ].map((p, i) => ({
        name: p.name,
        population: p.count,
        color: ["#A0E9D1", "#FFD6A5", "#FFE5A7", "#FFB3BA"][i % 4],
        legendFontColor: "#333",
        legendFontSize: 12,
    }));

    // 📤 Xuất CSV
    const exportCSV = async () => {
        try {
            if (thuocs.length === 0) {
                Alert.alert("Không có dữ liệu để xuất");
                return;
            }
            // ✅ Cập nhật header và data: dùng giaVon và soluong_nho
            const header = ["id", "ten", "soluong_nho", "donViNho", "hanSuDung", "giaVon_lon", "giaBan_lon", "heSoQuyDoi"];
            const rows = thuocs.map((t) =>
                [
                    t.id ?? "",
                    t.ten ?? "",
                    t.soluong ?? "", // Số lượng đơn vị nhỏ
                    t.donViNho ?? "",
                    t.hanSuDung ?? "",
                    t.giaVon ?? "", // Giá vốn đơn vị LỚN (đã là BQGQ)
                    t.giaBan ?? "", // Giá bán đơn vị LỚN
                    t.heSoQuyDoi ?? "",
                ]
                    .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                    .join(",")
            );
            const csv = [header.join(","), ...rows].join("\n");
            const filename = `${FileSystem.documentDirectory}tonkho_${Date.now()}.csv`;
            await FileSystem.writeAsStringAsync(filename, csv, {
                encoding: FileSystem.EncodingType.UTF8,
            });
            await Sharing.shareAsync(filename, { mimeType: "text/csv", dialogTitle: "Xuất tồn kho" });
        } catch (err) {
            console.error(err);
            Alert.alert("Lỗi", "Không thể xuất CSV");
        }
    };

    // 📑 Xuất PDF
    const exportPDF = async () => {
        try {
            if (thuocs.length === 0) {
                Alert.alert("Không có dữ liệu để xuất");
                return;
            }
            let html = `
            <html><head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            <style>
                body { font-family: Arial; padding: 12px; color: #333; }
                h1 { color: #3A7CA5; }
                p { margin-bottom: 5px; }
                table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
                th, td { border: 1px solid #ddd; padding: 6px; }
                th { background: #f4f6fb; text-align: left; }
                td:nth-child(3), td:nth-child(5), td:nth-child(6) { text-align: right; }
            </style>
            </head><body>
            <h1>📦 Báo cáo tồn kho</h1>
            <p>Ngày xuất: ${new Date().toLocaleString('vi-VN')}</p>
            <p>Tổng loại thuốc: ${totalTypes.toLocaleString('vi-VN')} — Tổng tồn (ĐV nhỏ): ${totalQty.toLocaleString('vi-VN')}</p>
            <p>💰 Giá trị tồn kho: ${formatCurrency(totalValue)}</p>
            <table>
                <thead><tr><th>#</th><th>Tên</th><th>Số lượng tồn (ĐV lớn)</th><th>Đơn vị lớn</th><th>Giá vốn (ĐV lớn)</th><th>Giá bán (ĐV lớn)</th><th>Hạn sử dụng</th></tr></thead>
                <tbody>
            `;
            thuocs.forEach((t, i) => {
                // Tính số lượng đơn vị LỚN để hiển thị
                const qtyLon = (t.soluong || 0) / (t.heSoQuyDoi || 1); 
                
                html += `<tr>
                    <td>${i + 1}</td>
                    <td>${t.ten ?? ""}</td>
                    <td>${qtyLon.toLocaleString('vi-VN')}</td>
                    <td>${t.donViTinh ?? ""}</td>
                    <td>${(t.giaVon ?? 0).toLocaleString('vi-VN')}</td>
                    <td>${(t.giaBan ?? 0).toLocaleString('vi-VN')}</td>
                    <td>${t.hanSuDung ?? ""}</td>
                </tr>`;
            });
            html += `</tbody></table></body></html>`;
            const { uri } = await Print.printToFileAsync({ html });
            if (uri) await Sharing.shareAsync(uri);
        } catch (err) {
            console.error("Lỗi xuất PDF:", err);
            Alert.alert("Lỗi", "Không thể xuất PDF");
        }
    };

    const renderItem = ({ item }: { item: Thuoc }) => {
        const qty = Number(item.soluong || 0); // Đơn vị NHỎ
        const qtyLon = qty / (item.heSoQuyDoi || 1); // Đơn vị LỚN
        const expired = isHetHan(item.hanSuDung);
        const nearExpire = isSapHetHan(item.hanSuDung);
        
        // ✅ Cập nhật: Cảnh báo tồn kho thấp theo ĐV nhỏ để đồng bộ với sapHetCount
        const lowStock = qty <= LOW_STOCK_THRESHOLD_NHO; 

        let bg = styles.itemSafe;
        if (expired) bg = styles.itemExpired;
        else if (nearExpire) bg = styles.itemNearExpire;
        else if (lowStock) bg = styles.itemLow;

        return (
            <TouchableOpacity
                style={[styles.itemCard, bg]}
                onPress={() => navigation.navigate("ChiTietThuoc", { thuoc: item })}
            >
                <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{item.ten}</Text>
                    <Text style={styles.itemSub}>
                        Tồn: {qtyLon.toLocaleString('vi-VN')} {item.donViTinh} ({qty.toLocaleString('vi-VN')} {item.donViNho})
                    </Text>
                    <Text style={styles.itemSub}>HSD: {item.hanSuDung ?? "N/A"}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                    {/* Hiển thị Giá bán */}
                    <Text style={{ fontWeight: "700" }}>
                        {item.giaBan ? formatCurrency(item.giaBan) + ` / ${item.donViTinh}` : "N/A"}
                    </Text>
                    <TouchableOpacity
                        style={styles.smallBtn}
                        onPress={() => navigation.navigate("ThemThuoc", { id: item.id })}
                    >
                        <Ionicons name="create-outline" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color="#4a90e2" />
                <Text>Đang tải dữ liệu...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>📦 Quản lý tồn kho</Text>
                <View style={{ flexDirection: "row" }}>
                    <TouchableOpacity style={styles.iconBtn} onPress={exportCSV}>
                        <Ionicons name="document-text-outline" size={22} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={exportPDF}>
                        <Ionicons name="print-outline" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Nội dung chính */}
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {/* Thống kê nhanh */}
                <View style={styles.cardRow}>
                    <View style={[styles.statCard, { backgroundColor: "#E8F8F5" }]}>
                        <Text>Tổng loại</Text>
                        <Text style={styles.statValue}>{totalTypes.toLocaleString('vi-VN')}</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: "#FFF7EA" }]}>
                        <Text>Tổng tồn (ĐV nhỏ)</Text>
                        <Text style={styles.statValue}>{totalQty.toLocaleString('vi-VN')}</Text>
                    </View>
                </View>

                <View style={styles.cardRow}>
                    <View style={[styles.statCard, { backgroundColor: "#E9F7EF" }]}>
                        <Text>💰 **Giá trị tồn kho** (Giá vốn)</Text>
                        <Text style={styles.statValue}>
                            {formatCurrency(totalValue)}
                        </Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: "#FDE8EC" }]}>
                        <Text>Sắp hết (≤{LOW_STOCK_THRESHOLD_NHO} ĐV nhỏ)</Text>
                        <Text style={styles.statValue}>{sapHetCount.toLocaleString('vi-VN')}</Text>
                    </View>
                </View>

                {/* Biểu đồ tồn kho */}
                <Text style={styles.sectionTitle}>📊 Biểu đồ tồn kho (Top theo số lượng ĐV nhỏ)</Text>
                {topByQty.length ? (
                    <BarChart
                        data={{
                            labels: topByQty.map((t) =>
                                t.ten.length > 10 ? t.ten.slice(0, 10) + "…" : t.ten
                            ),
                            datasets: [{ data: topByQty.map((t) => Number(t.soluong || 0)) }],
                        }}
                        width={screenW - 32}
                        height={220}
                        yAxisLabel=""
                        yAxisSuffix=""
                        chartConfig={{
                            backgroundGradientFrom: "#fff",
                            backgroundGradientTo: "#fff",
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(127, 199, 175, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
                        }}
                        style={{ borderRadius: 12 }}
                    />
                ) : (
                    <Text style={{ color: "#888", marginVertical: 8 }}>
                        Chưa có dữ liệu biểu đồ
                    </Text>
                )}

                {/* Biểu đồ tròn */}
                <Text style={styles.sectionTitle}>📈 Phân loại thuốc theo tình trạng</Text>
                <PieChart
                    data={pieData}
                    width={screenW - 32}
                    height={200}
                    accessor={"population"}
                    backgroundColor={"transparent"}
                    paddingLeft={"16"}
                    absolute
                    chartConfig={{
                        color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
                    }}
                />

                {/* Danh sách thuốc */}
                <Text style={styles.sectionTitle}>📋 Danh sách thuốc</Text>
                <FlatList
                    data={thuocs}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    scrollEnabled={false}
                />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FCFEFF" },
    header: {
        paddingTop: Platform.OS === "ios" ? 50 : 30,
        paddingHorizontal: 16,
        paddingBottom: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#4a90e2",
    },
    headerTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },
    iconBtn: {
        marginLeft: 8,
        backgroundColor: "#7FC7AF",
        padding: 8,
        borderRadius: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#184E77",
        marginTop: 16,
        marginBottom: 8,
    },
    cardRow: { flexDirection: "row", justifyContent: "space-between" },
    statCard: {
        flex: 1,
        margin: 6,
        padding: 12,
        borderRadius: 12,
        alignItems: "center",
    },
    statValue: { fontSize: 16, fontWeight: "bold", marginTop: 4 },
    itemCard: {
        flexDirection: "row",
        padding: 12,
        borderRadius: 12,
        marginVertical: 6,
        alignItems: "center",
        backgroundColor: "#fff",
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    itemTitle: { fontSize: 16, fontWeight: "700", color: "#1f3a3d" },
    itemSub: { color: "#666", marginTop: 4 },
    itemSafe: { backgroundColor: "#F2FFF7" },
    itemLow: { backgroundColor: "#FFF8E6", borderColor: '#FFC107', borderWidth: 1 }, // Highlight cảnh báo
    itemNearExpire: { backgroundColor: "#FFFAE6", borderColor: '#FF9800', borderWidth: 1 },
    itemExpired: { backgroundColor: "#FFECEF", borderColor: '#DC3545', borderWidth: 1 },
    smallBtn: {
        marginTop: 10,
        backgroundColor: "#4a90e2",
        padding: 6,
        borderRadius: 8,
    },
});