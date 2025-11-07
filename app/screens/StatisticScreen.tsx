import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { collection, onSnapshot } from "firebase/firestore";
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

const screenWidth = Dimensions.get("window").width;

// ----------------------------------------------------------------------
// Định nghĩa kiểu dữ liệu cho Dữ liệu Thống kê Chi tiết
// ----------------------------------------------------------------------
interface ThongKeChiTiet {
  doanhThu: number;
  chiPhi: number;
  loiNhuan: number;
  soHoaDon: number;
  soKhachHang: number;
}


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
    // Không cần dùng query, lấy tất cả rồi lọc trong client để đơn giản.
    // Nếu dữ liệu quá lớn, nên dùng query của Firestore.
    const unsub = onSnapshot(collection(db, "hoadons"), (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          // Đảm bảo ngayBan là đối tượng Date để dễ xử lý
          ngayBan: docData.ngayBan.toDate ? docData.ngayBan.toDate() : new Date(docData.ngayBan.seconds * 1000)
        };
      });
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
      (hd) => hd.ngayBan.getTime() >= startOfDay.getTime() && hd.ngayBan.getTime() <= endOfDay.getTime()
    );
    setFilteredHoaDons(filtered);
  };

  // --- III. DATE PICKER HANDLERS ---
  const onChangeFromDate = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || fromDate;
    setShowFrom(Platform.OS === 'ios');
    if (currentDate.getTime() <= toDate.getTime()) {
        setFromDate(currentDate);
    } else {
        Alert.alert("Lỗi", "Ngày bắt đầu không thể lớn hơn ngày kết thúc!");
    }
  };

  const onChangeToDate = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || toDate;
    setShowTo(Platform.OS === 'ios');
    if (currentDate.getTime() >= fromDate.getTime()) {
        setToDate(currentDate);
    } else {
        Alert.alert("Lỗi", "Ngày kết thúc không thể nhỏ hơn ngày bắt đầu!");
    }
  };
  
  // --- IV. QUICK SELECT LOGIC ---
  const handleQuickSelect = (type: 'week' | 'month' | 'year') => {
    const today = new Date();
    let start = new Date();
    let end = new Date();
    end.setHours(23, 59, 59, 999); // Kết thúc hôm nay

    switch (type) {
      case 'week':
        // Lấy 7 ngày gần nhất (tính cả hôm nay)
        start.setDate(today.getDate() - 6);
        break;
      case 'month':
        // Lấy từ đầu tháng này đến cuối ngày hôm nay
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'year':
        // Lấy từ đầu năm này đến cuối ngày hôm nay
        start = new Date(today.getFullYear(), 0, 1);
        break;
    }
    start.setHours(0, 0, 0, 0);

    setFromDate(start);
    setToDate(end);
  };


  // --- V. CHART & THỐNG KÊ LOGIC (Sử dụng useMemo để tối ưu hiệu suất) ---

  // Biểu đồ doanh thu 7 ngày gần nhất (sử dụng dữ liệu gốc - không lọc theo DatePicker)
  // Logic cũ vẫn giữ để hiển thị biểu đồ mặc định, không phụ thuộc vào DatePicker.
  const handleChart = (data: any[]) => {
    const map: Record<string, number> = {};
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      // Dùng định dạng không giờ, không phút, không giây để làm key (YYYY-MM-DD)
      const key = d.toISOString().split('T')[0]; 
      map[key] = 0;
    }

    data.forEach((hd) => {
      // Dùng định dạng ngày ISO để khớp với key của map
      const dateKey = hd.ngayBan.toISOString().split('T')[0];
      if (map[dateKey] !== undefined) map[dateKey] += hd.tongTien || 0;
    });

    setChartData(Object.values(map));
    // Rút gọn label thành DD/MM
    setLabels(Object.keys(map).map((k) => {
        const parts = k.split('-');
        return `${parts[2]}/${parts[1]}`; // DD/MM
    }));
  };

  // 1. Thống kê Nhân viên (sử dụng dữ liệu đã lọc)
  const nvData = useMemo(() => {
    const result: Record<string, number> = {};
    filteredHoaDons.forEach((hd) => {
      // Giả định hd.nhanVienId chứa tên hoặc ID nhân viên
      const nv = hd.nhanVienId || "Chưa rõ"; 
      if (!result[nv]) result[nv] = 0;
      result[nv] += hd.tongTien || 0;
    });
    return result;
  }, [filteredHoaDons]);

  // Chuẩn bị dữ liệu cho PieChart
  const pieChartData = useMemo(() => {
    return Object.entries(nvData).map(([nv, value]) => ({
      name: nv,
      population: value,
      color: getRandomColor(), 
      legendFontColor: "#333",
      legendFontSize: 12,
    }));
  }, [nvData]);
  
  // 2. Thống kê Thuốc (sử dụng dữ liệu đã lọc)
  const thuocData = useMemo(() => {
    const result: Record<string, { soLuong: number; tongTienBan: number; tongGiaVon: number }> = {};
    filteredHoaDons.forEach((hd) => {
      hd.items?.forEach((item: any) => {
        const name = item.tenThuoc || 'Thuốc không rõ tên';
        if (!result[name]) result[name] = { soLuong: 0, tongTienBan: 0, tongGiaVon: 0 };
        result[name].soLuong += item.soLuong || 0;
        result[name].tongTienBan += item.thanhTien || 0; // thanhTien = soLuong * giaBanLe
        // Tính tổng giá vốn (chi phí)
        result[name].tongGiaVon += (item.soLuong || 0) * (item.giaVon || 0); 
      });
    });
    return result;
  }, [filteredHoaDons]);

  // 3. Thống kê Tổng quan (Doanh thu - Chi phí - Lợi nhuận)
  const thongKeTongQuan: ThongKeChiTiet = useMemo(() => {
    let doanhThu = 0;
    let chiPhi = 0; // Tổng giá vốn của hàng đã bán
    
    filteredHoaDons.forEach((hd) => {
        doanhThu += hd.tongTien || 0; // Giả định tongTien là tổng tiền bán
        
        // Duyệt qua các item để tính tổng chi phí (tổng giá vốn)
        hd.items?.forEach((item: any) => {
            // Giả định item.giaVon là giá nhập (giá vốn) của đơn vị nhỏ nhất
            chiPhi += (item.soLuong || 0) * (item.giaVon || 0);
        });
    });

    const soHoaDon = filteredHoaDons.length;
    // Đếm số khách hàng duy nhất
    const soKhachHang = new Set(filteredHoaDons.map((hd) => hd.khachHang || hd.khachHangId)).size; 
    
    return { 
        doanhThu, 
        chiPhi, 
        loiNhuan: doanhThu - chiPhi,
        soHoaDon, 
        soKhachHang 
    };
  }, [filteredHoaDons]);


  // --- VI. EXPORT PDF ---
  const handleExportPDF = async () => {
    const { doanhThu, chiPhi, loiNhuan, soHoaDon, soKhachHang } = thongKeTongQuan;
    
    // HTML đơn giản cho báo cáo
    let html = `
      <h1 style="text-align:center; color: #4a90e2;">📑 Báo cáo thống kê (Đồ án tốt nghiệp)</h1>
      <h3 style="text-align:center;">Phạm vi: ${fromDate.toLocaleDateString()} đến ${toDate.toLocaleDateString()}</h3>
      <p><b>Ngày xuất báo cáo:</b> ${new Date().toLocaleString('vi-VN')}</p>
      <hr/>

      <h2>I. TỔNG QUAN KINH DOANH</h2>
      <p style="font-size: 1.1em; font-weight: bold;">- Tổng Doanh thu (Tổng tiền bán): <span style="color: #007bff;">${doanhThu.toLocaleString()} VNĐ</span></p>
      <p style="font-size: 1.1em; font-weight: bold;">- Tổng Chi phí (Tổng giá vốn): <span style="color: #d0021b;">${chiPhi.toLocaleString()} VNĐ</span></p>
      <p style="font-size: 1.2em; font-weight: bold;">- LỢI NHUẬN (Lãi/Lỗ): <span style="color: ${loiNhuan >= 0 ? '#28a745' : '#d0021b'};">${loiNhuan.toLocaleString()} VNĐ</span></p>
      <p>- Tổng Số hóa đơn: ${soHoaDon}</p>
      <p>- Tổng Số khách hàng: ${soKhachHang}</p>
      <hr/>

      <h2>II. DOANH THU THEO NHÂN VIÊN</h2>
      <ul style="list-style-type: none; padding-left: 0;">`;
    for (let id in nvData) {
      html += `<li style="margin-bottom: 5px;">👤 <b>${id}</b>: ${nvData[id].toLocaleString()} VNĐ</li>`;
    }
    html += `</ul>
      <hr/>

      <h2>III. BÁN THEO LOẠI THUỐC</h2>
      <table style="width:100%; border-collapse: collapse;">
          <tr style="background-color: #f2f2f2;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Tên thuốc</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Số lượng (sp)</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Doanh thu (VNĐ)</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Lãi/Lỗ (VNĐ)</th>
          </tr>`;
    for (let t in thuocData) {
      const thuoc = thuocData[t];
      const laiLo = thuoc.tongTienBan - thuoc.tongGiaVon;
      html += `<tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">💊 ${t}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${thuoc.soLuong.toLocaleString()}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${thuoc.tongTienBan.toLocaleString()}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right; color: ${laiLo >= 0 ? '#28a745' : '#d0021b'};">${laiLo.toLocaleString()}</td>
              </tr>`;
    }
    html += `</table>`;

    try {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri);
    } catch (error) {
        Alert.alert("Lỗi xuất PDF", "Không thể tạo hoặc chia sẻ file PDF.");
        console.error(error);
    }
  };

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
      <Text style={styles.title}>📈 Báo Cáo & Thống Kê</Text>
      
      {/* --- BỘ LỌC THỜI GIAN (CUSTOM DATE RANGE) --- */}
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
      
      {/* --- QUICK SELECT BUTTONS --- */}
      <View style={styles.quickSelectContainer}>
        <TouchableOpacity style={styles.quickSelectBtn} onPress={() => handleQuickSelect('week')}>
          <Text style={styles.quickSelectText}>7 Ngày</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickSelectBtn} onPress={() => handleQuickSelect('month')}>
          <Text style={styles.quickSelectText}>Tháng này</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickSelectBtn} onPress={() => handleQuickSelect('year')}>
          <Text style={styles.quickSelectText}>Năm nay</Text>
        </TouchableOpacity>
      </View>

      {/* --- TỔNG QUAN (ĐÃ LỌC) --- */}
      <Text style={styles.section}>
        📌 Tổng quan ({fromDate.toLocaleDateString()} - {toDate.toLocaleDateString()})
      </Text>
      <View style={styles.summaryCard}>
        <Text style={styles.dataRow}>- **Doanh thu:** <Text style={{ color: '#007bff' }}>{thongKeTongQuan.doanhThu.toLocaleString()} VNĐ</Text></Text>
        <Text style={styles.dataRow}>- **Chi phí (Giá vốn):** <Text style={{ color: '#d0021b' }}>{thongKeTongQuan.chiPhi.toLocaleString()} VNĐ</Text></Text>
        <Text style={{...styles.dataRow, fontWeight: 'bold'}}>
            - **Lãi/Lỗ:** <Text style={{ color: thongKeTongQuan.loiNhuan >= 0 ? '#28a745' : '#d0021b' }}>
                {thongKeTongQuan.loiNhuan.toLocaleString()} VNĐ
            </Text>
        </Text>
        <Text style={styles.dataRow}>- Số hóa đơn: {thongKeTongQuan.soHoaDon}</Text>
        <Text style={styles.dataRow}>- Số khách hàng: {thongKeTongQuan.soKhachHang}</Text>
      </View>

      {/* --- BIỂU ĐỒ DOANH THU 7 NGÀY --- */}
      <Text style={styles.section}>📊 Biểu đồ Doanh thu 7 ngày gần nhất</Text>
      {chartData.length > 0 && chartData.some(val => val > 0) ? (
        <ScrollView horizontal style={{marginVertical: 10}}>
          <BarChart
            data={{ labels, datasets: [{ data: chartData }] }}
            width={Math.max(screenWidth - 32, labels.length * 50)} // Mở rộng nếu có nhiều cột
            height={220}
            yAxisLabel=""
            yAxisSuffix="đ"
            chartConfig={{
              backgroundColor: "#f5f5f5",
              backgroundGradientFrom: "#f5f5f5",
              backgroundGradientTo: "#f5f5f5",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`, // #4a90e2
              labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
              barPercentage: 0.5,
            }}
            style={{ borderRadius: 16 }}
          />
        </ScrollView>
      ) : (
          <Text style={styles.noData}>Không có dữ liệu doanh thu 7 ngày gần nhất.</Text>
      )}

      {/* --- DOANH THU THEO NHÂN VIÊN (PIECHART) --- */}
      <Text style={styles.section}>👤 Doanh thu theo nhân viên</Text>
      <View style={{alignItems: 'center'}}>
        <PieChart
          data={pieChartData.length > 0 && pieChartData.some(d => d.population > 0) ? pieChartData : defaultPieData}
          width={screenWidth - 32}
          height={200}
          chartConfig={{
            color: () => "#000",
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </View>
      {Object.entries(nvData).length > 0 && (
          <View style={styles.detailList}>
              {Object.entries(nvData).sort(([, a], [, b]) => b - a).map(([nv, value]) => (
                  <Text key={nv} style={styles.listItem}>
                      • **{nv}**: {value.toLocaleString()} VNĐ
                  </Text>
              ))}
          </View>
      )}


      {/* --- BÁN THEO LOẠI THUỐC --- */}
      <Text style={styles.section}>💊 Bán theo loại thuốc</Text>
      <View style={styles.detailList}>
          {Object.entries(thuocData).length > 0 ? (
              Object.entries(thuocData).sort(([, a], [, b]) => b.tongTienBan - a.tongTienBan).map(([t, val]) => (
                  <Text key={t} style={styles.listItem}>
                      • **{t}**: {val.soLuong.toLocaleString()} sp (DT: {val.tongTienBan.toLocaleString()} VNĐ - Lãi: <Text style={{ color: (val.tongTienBan - val.tongGiaVon) >= 0 ? '#28a745' : '#d0021b' }}>{(val.tongTienBan - val.tongGiaVon).toLocaleString()} VNĐ</Text>)
                  </Text>
              ))
          ) : (
              <Text style={styles.noData}>Không có dữ liệu bán thuốc trong khoảng thời gian này.</Text>
          )}
      </View>

      {/* --- XUẤT PDF --- */}
      <TouchableOpacity onPress={handleExportPDF} style={styles.exportBtn}>
        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
          📄 Xuất báo cáo PDF đầy đủ (Lãi/Lỗ)
        </Text>
      </TouchableOpacity>
      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 15, textAlign: 'center', color: '#333' },
  section: { fontSize: 16, fontWeight: "bold", marginTop: 25, marginBottom: 10, color: '#4a90e2' },
  dataRow: { fontSize: 14, marginBottom: 4, lineHeight: 22 },
  noData: { color: '#888', fontStyle: 'italic', padding: 8, textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: 8 },
  
  // Styles cho Bộ lọc
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
  },
  datePickerWrapper: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
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
    width: '100%',
    alignItems: 'center',
  },
  
  // Styles cho Quick Select
  quickSelectContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
  },
  quickSelectBtn: {
      flex: 1,
      marginHorizontal: 4,
      padding: 10,
      borderRadius: 8,
      backgroundColor: '#7FC7AF',
      alignItems: 'center',
  },
  quickSelectText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 13,
  },

  // Styles cho danh sách chi tiết
  detailList: {
      paddingLeft: 5,
      marginBottom: 10,
      backgroundColor: '#f7f7f7',
      padding: 10,
      borderRadius: 8,
  },
  listItem: {
      fontSize: 14,
      marginVertical: 4,
      lineHeight: 20,
  },
  summaryCard: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#e6f0ff',
    borderLeftWidth: 5,
    borderLeftColor: '#4a90e2',
    marginBottom: 10,
  },
  
  exportBtn: {
    backgroundColor: "#4a90e2",
    marginTop: 30,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
});