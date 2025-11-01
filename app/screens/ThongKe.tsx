import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Platform, // Cần để xử lý DateTimePicker
} from "react-native";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../firebaseConfig"; // Đảm bảo đường dẫn này đúng
import { BarChart, PieChart } from "react-native-chart-kit";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import DateTimePicker from "@react-native-community/datetimepicker";

// Hàm tạo màu ngẫu nhiên cho PieChart
const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

export default function ThongKeScreen() {
  const [hoaDons, setHoaDons] = useState<any[]>([]); // Dữ liệu Hóa đơn gốc (chưa lọc)
  const [filteredHoaDons, setFilteredHoaDons] = useState<any[]>([]); // Dữ liệu sau khi lọc
  const [chartData, setChartData] = useState<number[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  
  // Trạng thái cho DatePicker
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  // Bộ lọc thời gian (Mặc định 7 ngày gần nhất)
  const [fromDate, setFromDate] = useState(
    new Date(Date.now() - 7 * 86400000)
  );
  const [toDate, setToDate] = useState(new Date());

  // --- I. FETCH DATA (Lấy dữ liệu gốc) ---
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "hoadons"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id, // Giữ lại ID nếu cần sau này
        ...doc.data(),
        // Đảm bảo ngayBan là đối tượng Date để dễ xử lý
        ngayBan: doc.data().ngayBan.toDate ? doc.data().ngayBan.toDate() : new Date(doc.data().ngayBan.seconds * 1000)
      }));
      setHoaDons(data);
      // Gọi handleChart với dữ liệu mới
      handleChart(data); 
    });
    return () => unsub();
  }, []);

  // --- II. FILTER LOGIC (Lọc dữ liệu theo ngày) ---
  useEffect(() => {
    handleFilter(hoaDons, fromDate, toDate);
  }, [hoaDons, fromDate, toDate]); // Chạy lại khi dữ liệu gốc hoặc bộ lọc thay đổi

  const handleFilter = (data: any[], start: Date, end: Date) => {
    // Đặt thời gian về đầu ngày/cuối ngày để bao gồm cả ngày đó
    const startOfDay = new Date(start);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);

    const filtered = data.filter(
      (hd) => hd.ngayBan >= startOfDay && hd.ngayBan <= endOfDay
    );
    setFilteredHoaDons(filtered);
  };
  
  // --- III. DATE PICKER HANDLERS ---
  const onChangeFromDate = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || fromDate;
    setShowFrom(Platform.OS === 'ios');
    if (currentDate <= toDate) {
        setFromDate(currentDate);
    } else {
        alert("Ngày bắt đầu không thể lớn hơn ngày kết thúc!");
    }
  };

  const onChangeToDate = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || toDate;
    setShowTo(Platform.OS === 'ios');
    if (currentDate >= fromDate) {
        setToDate(currentDate);
    } else {
        alert("Ngày kết thúc không thể nhỏ hơn ngày bắt đầu!");
    }
  };


  // --- IV. CHART & THỐNG KÊ LOGIC ---

  // Biểu đồ doanh thu 7 ngày gần nhất (sử dụng dữ liệu gốc - không lọc theo DatePicker)
  const handleChart = (data: any[]) => {
    const map: Record<string, number> = {};
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toLocaleDateString('vi-VN'); // Dùng 'vi-VN' để định dạng ngày chuẩn
      map[key] = 0;
    }

    data.forEach((hd) => {
      // Đảm bảo dùng ngàyBan là đối tượng Date để gọi toLocaleDateString
      const dateStr = hd.ngayBan.toLocaleDateString('vi-VN');
      if (map[dateStr] !== undefined) map[dateStr] += hd.tongTien;
    });

    setChartData(Object.values(map));
    // Rút gọn label thành DD/MM
    setLabels(Object.keys(map).map((k) => k.split("/").slice(0, 2).join("/")));
  };

  // Thống kê nhân viên (sử dụng dữ liệu đã lọc)
  const thongKeNhanVien = (data: any[]) => {
    const result: Record<string, number> = {};
    data.forEach((hd) => {
      // Giả định hd.nhanVienId chứa tên hoặc ID nhân viên
      const nv = hd.nhanVienId || "Chưa rõ"; 
      if (!result[nv]) result[nv] = 0;
      result[nv] += hd.tongTien;
    });
    return result;
  };

  // Thống kê thuốc (sử dụng dữ liệu đã lọc)
  const thongKeThuoc = (data: any[]) => {
    const result: Record<string, { soLuong: number; tongTien: number }> = {};
    data.forEach((hd) => {
      hd.items?.forEach((item: any) => {
        const name = item.tenThuoc || 'Thuốc không rõ tên';
        if (!result[name]) result[name] = { soLuong: 0, tongTien: 0 };
        result[name].soLuong += item.soLuong;
        result[name].tongTien += item.thanhTien;
      });
    });
    return result;
  };
  
  // Tổng quan (sử dụng dữ liệu đã lọc)
  const thongKeTongQuan = (data: any[]) => {
    const doanhThu = data.reduce((sum, hd) => sum + hd.tongTien, 0);
    const soHoaDon = data.length;
    // Đếm số khách hàng duy nhất (giả định khachHang là một trường nhận dạng)
    const soKhachHang = new Set(data.map((hd) => hd.khachHang || hd.khachHangId)).size; 
    return { doanhThu, soHoaDon, soKhachHang };
  };

  // --- V. EXPORT PDF ---
  const handleExportPDF = async () => {
    const nv = thongKeNhanVien(filteredHoaDons);
    const thuoc = thongKeThuoc(filteredHoaDons);
    const { doanhThu, soHoaDon, soKhachHang } = thongKeTongQuan(filteredHoaDons);
    
    // HTML đơn giản cho báo cáo
    let html = `
      <h1 style="text-align:center; color: #4a90e2;">📑 Báo cáo thống kê (Đồ án tốt nghiệp)</h1>
      <p><b>Xuất từ ngày:</b> ${fromDate.toLocaleDateString()} đến ${toDate.toLocaleDateString()}</p>
      <p><b>Ngày xuất báo cáo:</b> ${new Date().toLocaleString()}</p>
      <hr/>

      <h2>I. Tổng quan</h2>
      <p style="font-size: 1.1em; font-weight: bold;">- Tổng Doanh thu: <span style="color: #d0021b;">${doanhThu.toLocaleString()} VNĐ</span></p>
      <p>- Tổng Số hóa đơn: ${soHoaDon}</p>
      <p>- Tổng Số khách hàng: ${soKhachHang}</p>

      <h2>II. Doanh thu theo nhân viên</h2>
      <ul style="list-style-type: none; padding-left: 0;">`;
    for (let id in nv) {
      html += `<li style="margin-bottom: 5px;">👤 <b>${id}</b>: ${nv[id].toLocaleString()} VNĐ</li>`;
    }
    html += `</ul>

      <h2>III. Bán theo loại thuốc</h2>
      <table style="width:100%; border-collapse: collapse;">
          <tr style="background-color: #f2f2f2;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Tên thuốc</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Số lượng (sp)</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Tổng tiền (VNĐ)</th>
          </tr>`;
    for (let t in thuoc) {
      html += `<tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">💊 ${t}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${thuoc[t].soLuong}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${thuoc[t].tongTien.toLocaleString()}</td>
              </tr>`;
    }
    html += `</table>`;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  // --- VI. DATA VIEW PREPARATION ---
  const nvData = thongKeNhanVien(filteredHoaDons);
  const thuocData = thongKeThuoc(filteredHoaDons);
  const { doanhThu, soHoaDon, soKhachHang } = thongKeTongQuan(filteredHoaDons);

  // Chuẩn bị dữ liệu cho PieChart (Thêm màu ngẫu nhiên)
  const pieChartData = Object.entries(nvData).map(([nv, value], i) => ({
    name: nv,
    population: value,
    // Dùng màu ngẫu nhiên để có nhiều hơn 4 màu
    color: getRandomColor(), 
    legendFontColor: "#333",
    legendFontSize: 12,
  }));
  
  // Dữ liệu PieChart mặc định nếu không có dữ liệu
  const defaultPieData = [{
      name: "Chưa có dữ liệu",
      population: 1,
      color: "#ccc",
      legendFontColor: "#333",
      legendFontSize: 12,
  }];

  return (
    <ScrollView style={styles.container}>
      {/* --- BỘ LỌC THỜI GIAN (CHỨC NĂNG MỚI) --- */}
      <View style={styles.filterContainer}>
        <View style={styles.datePickerWrapper}>
          <Text style={styles.dateLabel}>Từ ngày:</Text>
          <TouchableOpacity onPress={() => setShowFrom(true)} style={styles.dateButton}>
            <Text>{fromDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
          {showFrom && (
            <DateTimePicker
              testID="dateTimePickerFrom"
              value={fromDate}
              mode="date"
              display="default"
              onChange={onChangeFromDate}
            />
          )}
        </View>

        <View style={styles.datePickerWrapper}>
          <Text style={styles.dateLabel}>Đến ngày:</Text>
          <TouchableOpacity onPress={() => setShowTo(true)} style={styles.dateButton}>
            <Text>{toDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
          {showTo && (
            <DateTimePicker
              testID="dateTimePickerTo"
              value={toDate}
              mode="date"
              display="default"
              onChange={onChangeToDate}
            />
          )}
        </View>
      </View>
      
      {/* --- BIỂU ĐỒ DOANH THU 7 NGÀY --- */}
      <Text style={styles.title}>📊 Thống kê doanh thu 7 ngày</Text>
      {chartData.length > 0 ? (
        <BarChart
          data={{ labels, datasets: [{ data: chartData }] }}
          width={Dimensions.get("window").width - 32}
          height={220}
          yAxisLabel=""
          yAxisSuffix="đ"
          chartConfig={{
            backgroundColor: "#fff",
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            decimalPlaces: 0,
            color: () => "#4a90e2",
            labelColor: () => "#333",
          }}
          style={{ borderRadius: 16 }}
        />
      ) : (
          <Text style={styles.noData}>Không có dữ liệu doanh thu 7 ngày gần nhất.</Text>
      )}

      {/* --- TỔNG QUAN (ĐÃ LỌC) --- */}
      <Text style={styles.section}>
        📌 Tổng quan ({fromDate.toLocaleDateString()} - {toDate.toLocaleDateString()})
      </Text>
      <Text style={styles.dataRow}>- Doanh thu: <Text style={{ fontWeight: 'bold', color: '#d0021b' }}>{doanhThu.toLocaleString()} VNĐ</Text></Text>
      <Text style={styles.dataRow}>- Số hóa đơn: {soHoaDon}</Text>
      <Text style={styles.dataRow}>- Số khách hàng: {soKhachHang}</Text>

      {/* --- DOANH THU THEO NHÂN VIÊN (PIECHART) --- */}
      <Text style={styles.section}>👤 Doanh thu theo nhân viên</Text>
      <PieChart
        data={pieChartData.length > 0 ? pieChartData : defaultPieData}
        width={Dimensions.get("window").width - 16}
        height={200}
        chartConfig={{
          color: () => "#000",
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
      />
      {pieChartData.length > 0 && (
          <View style={styles.detailList}>
              {Object.entries(nvData).map(([nv, value]) => (
                  <Text key={nv} style={styles.listItem}>
                      • {nv}: {value.toLocaleString()} VNĐ
                  </Text>
              ))}
          </View>
      )}


      {/* --- BÁN THEO LOẠI THUỐC --- */}
      <Text style={styles.section}>💊 Bán theo loại thuốc</Text>
      <View style={styles.detailList}>
          {Object.entries(thuocData).length > 0 ? (
              Object.entries(thuocData).map(([t, val]) => (
                  <Text key={t} style={styles.listItem}>
                      • **{t}**: {val.soLuong} sp - {val.tongTien.toLocaleString()} VNĐ
                  </Text>
              ))
          ) : (
              <Text style={styles.noData}>Không có dữ liệu bán thuốc trong khoảng thời gian này.</Text>
          )}
      </View>

      {/* --- XUẤT PDF --- */}
      <TouchableOpacity onPress={handleExportPDF} style={styles.exportBtn}>
        <Text style={{ color: "#fff", fontWeight: "bold" }}>
          📄 Xuất báo cáo PDF
        </Text>
      </TouchableOpacity>
      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  section: { fontSize: 16, fontWeight: "bold", marginTop: 20, marginBottom: 6 },
  dataRow: { fontSize: 14, marginBottom: 4 },
  noData: { color: '#888', fontStyle: 'italic', padding: 8, textAlign: 'center' },
  
  // Styles mới cho Bộ lọc
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
  },
  datePickerWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dateButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    backgroundColor: '#f9f9f9',
  },
  detailList: {
      paddingLeft: 10,
      marginBottom: 10,
  },
  listItem: {
      fontSize: 14,
      marginVertical: 2,
  },
  
  exportBtn: {
    backgroundColor: "#4a90e2",
    marginTop: 24,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
});