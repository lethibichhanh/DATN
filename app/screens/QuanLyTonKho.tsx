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
import { db } from "../../firebaseConfig";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { BarChart, PieChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";

type Thuoc = {
  id: string;
  ten: string;
  soluong: number;
  hanSuDung?: string;
  giaBan?: number;
  giaNhap?: number;
  [key: string]: any;
};

const screenW = Dimensions.get("window").width;

// ✅ Parse ngày
const parseDate = (dateStr?: string): Date | null => {
  if (!dateStr) return null;
  const s = dateStr.trim();
  if (!s) return null;
  const iso = new Date(s);
  if (!isNaN(iso.getTime())) return iso;
  const parts = s.includes("-") ? s.split("-") : s.includes("/") ? s.split("/") : [];
  if (parts.length !== 3) return null;
  if (parts[0].length === 4) {
    const [y, m, d] = parts.map(Number);
    return new Date(y, m - 1, d);
  } else {
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
  return diff >= 0 && diff <= 30;
};

export default function QuanLyTonKhoScreen() {
  const [thuocs, setThuocs] = useState<Thuoc[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigation = useNavigation<any>();

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "thuocs"),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Thuoc[];
        const normalized = data.map((t) => ({ ...t, soluong: Number(t.soluong || 0) }));
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
  const totalQty = thuocs.reduce((s, t) => s + (t.soluong || 0), 0);
  const totalValue = thuocs.reduce(
    (s, t) => s + (t.giaNhap || 0) * (t.soluong || 0),
    0
  ); // 💰 Giá trị hàng tồn kho
  const sapHetCount = thuocs.filter((t) => (t.soluong || 0) <= 10).length;
  const hetHanCount = thuocs.filter((t) => isHetHan(t.hanSuDung)).length;
  const sapHetHanCount = thuocs.filter((t) => isSapHetHan(t.hanSuDung)).length;

  const topByQty = useMemo(() => {
    return [...thuocs].sort((a, b) => (b.soluong || 0) - (a.soluong || 0)).slice(0, 6);
  }, [thuocs]);

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
      const header = ["id", "ten", "soluong", "hanSuDung", "giaNhap", "giaBan"];
      const rows = thuocs.map((t) =>
        header
          .map((h) => {
            let v = (t as any)[h];
            if (v === undefined || v === null) v = "";
            return `"${String(v).replace(/"/g, '""')}"`;
          })
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
        table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 6px; }
        th { background: #f4f6fb; text-align: left; }
      </style>
      </head><body>
      <h1>📦 Báo cáo tồn kho</h1>
      <p>Ngày xuất: ${new Date().toLocaleString()}</p>
      <p>Tổng loại thuốc: ${totalTypes} — Tổng tồn: ${totalQty}</p>
      <p>💰 Giá trị tồn kho: ${totalValue.toLocaleString("vi-VN")} ₫</p>
      <table>
        <thead><tr><th>#</th><th>Tên</th><th>Số lượng</th><th>Hạn sử dụng</th><th>Giá nhập</th><th>Giá bán</th></tr></thead>
        <tbody>
      `;
      thuocs.forEach((t, i) => {
        html += `<tr>
          <td>${i + 1}</td>
          <td>${t.ten ?? ""}</td>
          <td>${t.soluong ?? ""}</td>
          <td>${t.hanSuDung ?? ""}</td>
          <td>${t.giaNhap ?? ""}</td>
          <td>${t.giaBan ?? ""}</td>
        </tr>`;
      });
      html += `</tbody></table></body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      if (uri) await Sharing.shareAsync(uri);
    } catch (err) {
      console.error(err);
      Alert.alert("Lỗi", "Không thể xuất PDF");
    }
  };

  const renderItem = ({ item }: { item: Thuoc }) => {
    const qty = Number(item.soluong || 0);
    const expired = isHetHan(item.hanSuDung);
    const nearExpire = isSapHetHan(item.hanSuDung);
    const lowStock = qty <= 10;

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
          <Text style={styles.itemSub}>Số lượng: {qty}</Text>
          <Text style={styles.itemSub}>HSD: {item.hanSuDung ?? "N/A"}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontWeight: "700" }}>
            {item.giaBan ? `${item.giaBan.toLocaleString("vi-VN")} ₫` : ""}
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
            <Text style={styles.statValue}>{totalTypes}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#FFF7EA" }]}>
            <Text>Tổng tồn</Text>
            <Text style={styles.statValue}>{totalQty}</Text>
          </View>
        </View>

        <View style={styles.cardRow}>
          <View style={[styles.statCard, { backgroundColor: "#E9F7EF" }]}>
            <Text>💰 Giá trị tồn kho</Text>
            <Text style={styles.statValue}>
              {totalValue.toLocaleString("vi-VN")} ₫
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#FDE8EC" }]}>
            <Text>Sắp hết</Text>
            <Text style={styles.statValue}>{sapHetCount}</Text>
          </View>
        </View>

        {/* Biểu đồ tồn kho */}
        <Text style={styles.sectionTitle}>📊 Biểu đồ tồn kho (Top theo số lượng)</Text>
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
  },
  itemTitle: { fontSize: 16, fontWeight: "700", color: "#1f3a3d" },
  itemSub: { color: "#666", marginTop: 4 },
  itemSafe: { backgroundColor: "#F2FFF7" },
  itemLow: { backgroundColor: "#FFF8E6" },
  itemNearExpire: { backgroundColor: "#FFFAE6" },
  itemExpired: { backgroundColor: "#FFECEF" },
  smallBtn: {
    marginTop: 10,
    backgroundColor: "#4a90e2",
    padding: 6,
    borderRadius: 8,
  },
});
