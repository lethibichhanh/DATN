import DateTimePicker from "@react-native-community/datetimepicker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { collection, onSnapshot } from "firebase/firestore";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
    Alert,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { BarChart, PieChart } from "react-native-chart-kit";
// Đảm bảo đường dẫn này đúng trong dự án thực tế của bạn
import { db } from "../../firebaseConfig";

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
// Định nghĩa kiểu dữ liệu
// ----------------------------------------------------------------------
interface ThongKeChiTiet {
    doanhThu: number;
    chiPhi: number;
    loiNhuan: number;
    soHoaDon: number;
    soKhachHang: number;
}

interface ThanhToanStats {
    TienMat: number;
    ChuyenKhoan: number;
    Khac: number;
}

interface ThuocStats {
    soLuong: number;
    tongTienBan: number;
    tongGiaVon: number;
}

export default function ThongKeScreen() {
    const [hoaDons, setHoaDons] = useState<any[]>([]);
    const [filteredHoaDons, setFilteredHoaDons] = useState<any[]>([]);
    const [chartData, setChartData] = useState<number[]>([]);
    const [labels, setLabels] = useState<string[]>([]);

    // Trạng thái cho DatePicker
    const [showFrom, setShowFrom] = useState(false);
    const [showTo, setShowTo] = useState(false);

    // Bộ lọc thời gian (Mặc định 7 ngày gần nhất)
    const defaultFromDate = useMemo(() => {
        const d = new Date(Date.now() - 7 * 86400000);
        d.setHours(0, 0, 0, 0); // Đảm bảo từ 0h ngày đầu tiên
        return d;
    }, []);
    const defaultToDate = useMemo(() => {
        const d = new Date();
        d.setHours(23, 59, 59, 999); // Đảm bảo đến 23:59:59 ngày cuối cùng
        return d;
    }, []);

    const [fromDate, setFromDate] = useState(defaultFromDate);
    const [toDate, setToDate] = useState(defaultToDate);

    // --- I. FETCH DATA (Lấy dữ liệu gốc) ---
    useEffect(() => {
        if (!db) {
            console.error("Lỗi: Đối tượng Firestore 'db' chưa được khởi tạo!");
            Alert.alert("Lỗi Dữ liệu", "Không thể kết nối đến cơ sở dữ liệu Firestore.");
            return;
        }

        // Lắng nghe thay đổi từ collection 'hoadons'
        const unsub = onSnapshot(collection(db, "hoadons"), (snapshot) => {
            const data = snapshot.docs.map((doc) => {
                const docData = doc.data();
                return {
                    id: doc.id,
                    ...docData,
                    // Chuẩn hóa ngayBan thành Date object
                    ngayBan: docData.ngayBan?.toDate ? docData.ngayBan.toDate() : (docData.ngayBan?.seconds ? new Date(docData.ngayBan.seconds * 1000) : new Date()),
                    // Chuẩn hóa tên trường phương thức thanh toán
                    phuongThucThanhToan: docData.phuongThucThanhToan || docData.paymentMethod || 'Khac',
                    // Chuẩn hóa tên trường giá vốn tổng (sử dụng 0 nếu không có)
                    // 🔥 Giữ nguyên logic ưu tiên lấy giaVonTong đã lưu
                    giaVonTong: docData.giaVonTong || docData.Cost || docData.totalCost || 0,
                    // Đảm bảo items là một mảng
                    items: docData.items || [],
                    // Đảm bảo tongTien là số
                    tongTien: docData.tongTien || 0,
                };
            });
            setHoaDons(data);
        });
        return () => unsub();
    }, []);

    // --- V. CHART LOGIC (Biểu đồ doanh thu 7 ngày gần nhất - Dùng dữ liệu gốc) ---
    const handleChart = (data: any[]) => {
        const map: Record<string, number> = {};
        const today = new Date();

        // Khởi tạo 7 ngày gần nhất
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            // Dùng định dạng không giờ, không phút, không giây để làm key (YYYY-MM-DD)
            const key = d.toISOString().split('T')[0];
            map[key] = 0;
        }

        // Tính tổng tiền cho từng ngày
        data.forEach((hd) => {
            // Dùng định dạng ngày ISO để khớp với key của map
            const dateKey = hd.ngayBan?.toISOString().split('T')[0];
            if (map[dateKey] !== undefined) map[dateKey] += hd.tongTien || 0;
        });

        setChartData(Object.values(map));
        // Rút gọn label thành DD/MM
        setLabels(Object.keys(map).map((k) => {
            const parts = k.split('-');
            return `${parts[2]}/${parts[1]}`; // DD/MM
        }));
    };

    useEffect(() => {
        if (hoaDons.length > 0) {
            handleChart(hoaDons);
        }
    }, [hoaDons]);


    // --- II. FILTER LOGIC (Lọc dữ liệu theo ngày) ---
    useEffect(() => {
        handleFilter(hoaDons, fromDate, toDate);
    }, [hoaDons, fromDate, toDate]);

    const handleFilter = (data: any[], start: Date, end: Date) => {
        // Đảm bảo lọc bao gồm cả ngày bắt đầu và kết thúc
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
            // Đặt về 0h:00:00 ngày được chọn
            currentDate.setHours(0, 0, 0, 0);
            setFromDate(currentDate);
        } else {
            Alert.alert("Lỗi", "Ngày bắt đầu không thể lớn hơn ngày kết thúc!");
        }
    };

    const onChangeToDate = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || toDate;
        setShowTo(Platform.OS === 'ios');
        if (currentDate.getTime() >= fromDate.getTime()) {
            // Đặt về 23:59:59 ngày được chọn
            currentDate.setHours(23, 59, 59, 999);
            setToDate(currentDate);
        } else {
            Alert.alert("Lỗi", "Ngày kết thúc không thể nhỏ hơn ngày bắt đầu!");
        }
    };

    // --- IV. QUICK SELECT LOGIC (ĐÃ CẬP NHẬT THÊM 'day') ---
    const handleQuickSelect = (type: 'day' | 'week' | 'month' | 'year') => {
        const today = new Date();
        let start = new Date(today);
        let end = new Date(today);
        end.setHours(23, 59, 59, 999); // Kết thúc hôm nay

        switch (type) {
            case 'day': // Lọc theo ngày (Hôm nay)
                start = new Date(today);
                break;
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


    // --- V. THỐNG KÊ LOGIC (Sử dụng dữ liệu đã lọc) ---

    // 1. Thống kê Nhân viên
    const nvData = useMemo(() => {
        const result: Record<string, number> = {};
        filteredHoaDons.forEach((hd) => {
            // Nên ưu tiên nhanVienName (từ AddInvoiceScreen) hoặc nhanVienUid (từ SalesScreen)
            const nv = hd.nhanVien || hd.nhanVienUid || "Chưa rõ";
            if (!result[nv]) result[nv] = 0;
            result[nv] += hd.tongTien || 0;
        });
        return result;
    }, [filteredHoaDons]);

    // Chuẩn bị dữ liệu cho PieChart
    const pieChartData = useMemo(() => {
        const data = Object.entries(nvData).map(([nv, value]) => ({
            name: nv,
            population: value,
            color: getRandomColor(),
            legendFontColor: "#333",
            legendFontSize: 12,
        }));
        // Thêm dữ liệu mặc định nếu tất cả đều là 0 hoặc không có hóa đơn
        if (data.length === 0 || data.every(d => d.population === 0) && filteredHoaDons.length > 0) {
            return [{
                name: "Doanh thu = 0",
                population: 1, // Đặt 1 để biểu đồ hiển thị
                color: "#ccc",
                legendFontColor: "#333",
                legendFontSize: 12,
            }];
        } else if (data.length === 0 && filteredHoaDons.length === 0) {
            // Trường hợp không có hóa đơn nào được lọc
             return [{
                name: "Chưa có dữ liệu",
                population: 1, 
                color: "#ccc",
                legendFontColor: "#333",
                legendFontSize: 12,
            }];
        }
        return data.filter(d => d.population > 0); // Chỉ hiển thị nhân viên có doanh thu > 0
    }, [nvData, filteredHoaDons]);

    // 2. Thống kê Thuốc
    const thuocData: Record<string, ThuocStats> = useMemo(() => {
        const result: Record<string, ThuocStats> = {};
        filteredHoaDons.forEach((hd) => {
            hd.items?.forEach((item: any) => {
                const name = item.tenThuoc || 'Thuốc không rõ tên';
                const soLuong = item.soLuong || 0;
                const tienBanLe = item.thanhTien || (soLuong * (item.donGia || 0));

                // 🔥 LOGIC TÍNH GIÁ VỐN CHO TỪNG ITEM (Bao gồm các trường đã lưu trong SalesScreen và AddInvoiceScreen)
                const giaVonDonVi = item.giaVonDonVi || item.giaVon || item.giaNhap || item.Cost || 0;
                // Ưu tiên lấy giá vốn thành tiền đã lưu, nếu không có thì tính lại
                const giaVonThanhTien = item.giaVonThanhTien || (soLuong * giaVonDonVi);

                if (!result[name]) result[name] = { soLuong: 0, tongTienBan: 0, tongGiaVon: 0 };

                result[name].soLuong += soLuong;
                result[name].tongTienBan += tienBanLe;
                result[name].tongGiaVon += giaVonThanhTien; // 🔥 SỬ DỤNG GIÁ VỐN ĐÃ TÍNH
            });
        });
        return result;
    }, [filteredHoaDons]);

    // 3. Thống kê Tổng quan (Doanh thu - Chi phí - Lợi nhuận)
    const thongKeTongQuan: ThongKeChiTiet = useMemo(() => {
        let doanhThu = 0;
        let chiPhi = 0; // Tổng giá vốn của hàng đã bán

        filteredHoaDons.forEach((hd) => {
            doanhThu += hd.tongTien || 0; // Tổng tiền bán

            let giaVonHienTai = 0;
            // 🔥 LOGIC TÍNH TỔNG GIÁ VỐN CHO HÓA ĐƠN
            // 1. Ưu tiên lấy giá vốn đã được tính sẵn ở cấp độ hóa đơn (đây là cách tối ưu)
            if (hd.giaVonTong && hd.giaVonTong > 0) {
                giaVonHienTai = hd.giaVonTong;
            } else {
                // 2. Nếu không có, duyệt qua các item để tính lại (bao gồm các trường đã lưu)
                hd.items?.forEach((item: any) => {
                    // Tên trường ưu tiên: giaVonThanhTien (SalesScreen) > soLuong * giaVonDonVi/giaVon/giaNhap
                    const soLuong = item.soLuong || 0;
                    const giaVonDonVi = item.giaVonDonVi || item.giaVon || item.giaNhap || item.Cost || 0;
                    const giaVonItem = item.giaVonThanhTien || (soLuong * giaVonDonVi);
                    giaVonHienTai += giaVonItem;
                });
            }
            chiPhi += giaVonHienTai;
        });

        const soHoaDon = filteredHoaDons.length;
        // Đếm số khách hàng duy nhất (dùng Set để loại bỏ trùng lặp)
        const soKhachHang = new Set(filteredHoaDons.map((hd) => hd.khachHang || hd.sdtKhachHang).filter(Boolean)).size;

        return {
            doanhThu,
            chiPhi,
            loiNhuan: doanhThu - chiPhi,
            soHoaDon,
            soKhachHang
        };
    }, [filteredHoaDons]);

    // 4. Thống kê Thanh toán (Chuyển khoản / Tiền mặt)
    const thanhToanData: ThanhToanStats = useMemo(() => {
        const result: ThanhToanStats = { TienMat: 0, ChuyenKhoan: 0, Khac: 0 };

        filteredHoaDons.forEach((hd) => {
            // Chuẩn hóa chuỗi phương thức thanh toán để so sánh không dấu, không phân biệt hoa thường
            const pttt = (hd.phuongThucThanhToan || 'Khac')
                .toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .toUpperCase()
                .trim();

            const tongTien = hd.tongTien || 0;

            if (pttt.includes('TIEN MAT') || pttt.includes('TIENMAT') || pttt.includes('CASH')) {
                result.TienMat += tongTien;
            } else if (pttt.includes('CHUYEN KHOAN') || pttt.includes('CHUYENKHOAN') || pttt.includes('BANK') || pttt.includes('TRANSFER')) {
                result.ChuyenKhoan += tongTien;
            } else {
                result.Khac += tongTien;
            }
        });
        return result;
    }, [filteredHoaDons]);


    // --- VI. EXPORT PDF ---
    const handleExportPDF = useCallback(async () => {
        const { doanhThu, chiPhi, loiNhuan, soHoaDon, soKhachHang } = thongKeTongQuan;
        const { TienMat, ChuyenKhoan, Khac } = thanhToanData;

        // Sắp xếp dữ liệu thuốc theo Lãi/Lỗ giảm dần
        const sortedThuocData = Object.entries(thuocData)
            .map(([t, val]) => ({
                tenThuoc: t,
                ...val,
                laiLo: val.tongTienBan - val.tongGiaVon
            }))
            .sort((a, b) => b.laiLo - a.laiLo);

        // HTML cho bảng thuốc
        let thuocTableHtml = `
            <table style="width:100%; border-collapse: collapse; margin-top: 10px; font-size: 10pt;">
                <thead>
                    <tr style="background-color: #f2f2f2; border-bottom: 2px solid #ddd;">
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Tên thuốc</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Số lượng (sp)</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Doanh thu (VNĐ)</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Giá vốn (VNĐ)</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Lãi/Lỗ (VNĐ)</th>
                    </tr>
                </thead>
                <tbody>`;

        sortedThuocData.forEach((thuoc) => {
            const color = thuoc.laiLo >= 0 ? '#28a745' : '#d0021b';
            thuocTableHtml += `<tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">💊 ${thuoc.tenThuoc}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${thuoc.soLuong.toLocaleString()}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${thuoc.tongTienBan.toLocaleString()}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${thuoc.tongGiaVon.toLocaleString()}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold; color: ${color};">${thuoc.laiLo.toLocaleString()}</td>
                </tr>`;
        });
        thuocTableHtml += `</tbody></table>`;

        // HTML đơn giản cho báo cáo
        let html = `
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                <style>
                    body { font-family: 'Arial', sans-serif; padding: 20px; color: #333; }
                    h1, h2, h3 { color: #4a90e2; }
                    hr { border: 0; border-top: 1px solid #eee; margin: 20px 0; }
                    .summary-item { margin-bottom: 10px; padding: 5px 0; }
                    table { table-layout: fixed; }
                </style>
            </head>
            <body>
                <h1 style="text-align:center;">📑 Báo cáo thống kê</h1>
                <h3 style="text-align:center;">Phạm vi: ${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}</h3>
                <p><b>Ngày xuất báo cáo:</b> ${new Date().toLocaleString('vi-VN')}</p>
                <hr/>

                <h2>I. TỔNG QUAN KINH DOANH</h2>
                <div class="summary-item">
                    <p style="font-size: 1.1em; font-weight: bold;">- Tổng Doanh thu (Tổng tiền bán): <span style="color: #007bff;">${doanhThu.toLocaleString()} VNĐ</span></p>
                    <p style="font-size: 1.1em; font-weight: bold;">- Tổng Chi phí (Tổng giá vốn): <span style="color: #d0021b;">${chiPhi.toLocaleString()} VNĐ</span></p>
                    <p style="font-size: 1.2em; font-weight: bold;">- LỢI NHUẬN (Lãi/Lỗ): <span style="color: ${loiNhuan >= 0 ? '#28a745' : '#d0021b'};">${loiNhuan.toLocaleString()} VNĐ</span></p>
                    <p>- Tổng Số hóa đơn: ${soHoaDon}</p>
                    <p>- Tổng Số khách hàng: ${soKhachHang}</p>
                </div>
                <hr/>

                <h2>II. DOANH THU THEO PHƯƠNG THỨC THANH TOÁN</h2>
                <div class="summary-item">
                    <p>💰 Tiền mặt: <span style="color: #007bff; font-weight: bold;">${TienMat.toLocaleString()} VNĐ</span></p>
                    <p>💳 Chuyển khoản: <span style="color: #007bff; font-weight: bold;">${ChuyenKhoan.toLocaleString()} VNĐ</span></p>
                    <p>❓ Khác: <span style="color: #007bff; font-weight: bold;">${Khac.toLocaleString()} VNĐ</span></p>
                </div>
                <hr/>

                <h2>III. DOANH THU THEO NHÂN VIÊN</h2>
                <ul style="list-style-type: disc; padding-left: 20px;">`;
        // Sắp xếp nhân viên theo doanh thu giảm dần
        Object.entries(nvData).sort(([, a], [, b]) => b - a).forEach(([id, value]) => {
            html += `<li>👤 <b>${id}</b>: ${value.toLocaleString()} VNĐ</li>`;
        });
        html += `</ul>
                <hr/>

                <h2>IV. CHI TIẾT LÃI/LỖ THEO LOẠI THUỐC</h2>
                ${thuocTableHtml}

            </body>
            </html>`;

        try {
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) {
            Alert.alert("Lỗi xuất PDF", "Không thể tạo hoặc chia sẻ file PDF.");
            console.error(error);
        }
    }, [thongKeTongQuan, thanhToanData, thuocData, nvData, fromDate, toDate]);


    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>📈 Báo Cáo & Thống Kê</Text>

            {/* --- BỘ LỌC THỜI GIAN (CUSTOM DATE RANGE) --- */}
            <View style={styles.filterContainer}>
                <View style={styles.datePickerWrapper}>
                    <Text style={styles.dateLabel}>Từ ngày:</Text>
                    <TouchableOpacity onPress={() => setShowFrom(true)} style={styles.dateButton}>
                        <Text>{fromDate.toLocaleDateString('vi-VN')}</Text>
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
                        <Text>{toDate.toLocaleDateString('vi-VN')}</Text>
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

            {/* --- QUICK SELECT BUTTONS (ĐÃ THÊM NÚT 'Hôm nay') --- */}
            <View style={styles.quickSelectContainer}>
                {/* 🔥 NÚT BỔ SUNG: Lọc theo ngày (Hôm nay) */}
                <TouchableOpacity style={styles.quickSelectBtn} onPress={() => handleQuickSelect('day')}>
                    <Text style={styles.quickSelectText}>Hôm nay</Text>
                </TouchableOpacity>

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
                📌 Tổng quan ({fromDate.toLocaleDateString('vi-VN')} - {toDate.toLocaleDateString('vi-VN')})
            </Text>
            <View style={styles.summaryCard}>
                <Text style={styles.dataRow}>- **Doanh thu:** <Text style={{ color: '#007bff', fontWeight: 'bold' }}>{thongKeTongQuan.doanhThu.toLocaleString()} VNĐ</Text></Text>
                <Text style={styles.dataRow}>- **Chi phí (Giá vốn):** <Text style={{ color: '#d0021b', fontWeight: 'bold' }}>{thongKeTongQuan.chiPhi.toLocaleString()} VNĐ</Text></Text>
                <Text style={{ ...styles.dataRow, fontSize: 16 }}>
                    - **Lãi/Lỗ:** <Text style={{ color: thongKeTongQuan.loiNhuan >= 0 ? '#28a745' : '#d0021b', fontWeight: 'bold' }}>
                        {thongKeTongQuan.loiNhuan.toLocaleString()} VNĐ
                    </Text>
                </Text>
                <View style={styles.separator} />
                <Text style={styles.dataRow}>**Phương thức thanh toán:**</Text>
                <Text style={styles.dataRowSmall}>- Tiền mặt: {thanhToanData.TienMat.toLocaleString()} VNĐ</Text>
                <Text style={styles.dataRowSmall}>- Chuyển khoản: {thanhToanData.ChuyenKhoan.toLocaleString()} VNĐ</Text>
                {thanhToanData.Khac > 0 && <Text style={styles.dataRowSmall}>- Khác: {thanhToanData.Khac.toLocaleString()} VNĐ</Text>}
                <View style={styles.separator} />
                <Text style={styles.dataRow}>- Số hóa đơn: **{thongKeTongQuan.soHoaDon}**</Text>
                <Text style={styles.dataRow}>- Số khách hàng: **{thongKeTongQuan.soKhachHang}**</Text>
            </View>

            {/* --- BIỂU ĐỒ DOANH THU 7 NGÀY (Dữ liệu gốc) --- */}
            <Text style={styles.section}>📊 Biểu đồ Doanh thu 7 ngày gần nhất</Text>
            {chartData.length > 0 && chartData.some(val => val > 0) ? (
                <ScrollView horizontal style={{ marginVertical: 10 }}>
                    <BarChart
                        data={{ labels, datasets: [{ data: chartData }] }}
                        width={Math.max(screenWidth - 32, labels.length * 50)}
                        height={220}
                        yAxisLabel=""
                        yAxisSuffix="đ"
                        chartConfig={{
                            backgroundColor: "#f5f5f5",
                            backgroundGradientFrom: "#f5f5f5",
                            backgroundGradientTo: "#f5f5f5",
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
                            barPercentage: 0.5,
                            propsForLabels: { fontSize: 10 },
                        }}
                        style={{ borderRadius: 16 }}
                    />
                </ScrollView>
            ) : (
                <Text style={styles.noData}>Không có dữ liệu doanh thu 7 ngày gần nhất.</Text>
            )}

            {/* --- DOANH THU THEO NHÂN VIÊN (PIECHART) --- */}
            <Text style={styles.section}>👤 Doanh thu theo nhân viên</Text>
            <View style={{ alignItems: 'center' }}>
                <PieChart
                    data={pieChartData}
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
            {Object.entries(nvData).length > 0 && Object.values(nvData).some(val => val > 0) && (
                <View style={styles.detailList}>
                    {Object.entries(nvData).sort(([, a], [, b]) => b - a).map(([nv, value]) => (
                        <Text key={nv} style={styles.listItem}>
                            • **{nv}**: {value.toLocaleString()} VNĐ
                        </Text>
                    ))}
                </View>
            )}
            {Object.values(nvData).every(val => val === 0) && filteredHoaDons.length > 0 && (
                <Text style={styles.noData}>Doanh thu các hóa đơn đã lọc đều bằng 0.</Text>
            )}
             {filteredHoaDons.length === 0 && (
                <Text style={styles.noData}>Không có hóa đơn nào được lọc trong khoảng thời gian này.</Text>
            )}


            {/* --- BÁN THEO LOẠI THUỐC --- */}
            <Text style={styles.section}>💊 Bán theo loại thuốc</Text>
            <View style={styles.detailList}>
                {Object.entries(thuocData).length > 0 ? (
                    Object.entries(thuocData).sort(([, a], [, b]) => (b.tongTienBan - b.tongGiaVon) - (a.tongTienBan - a.tongGiaVon)).map(([t, val]) => {
                        const laiLo = val.tongTienBan - val.tongGiaVon;
                        return (
                            <Text key={t} style={styles.listItem}>
                                • **{t}**: {val.soLuong.toLocaleString()} sp (DT: {val.tongTienBan.toLocaleString()} VNĐ - Lãi: <Text style={{ color: laiLo >= 0 ? '#28a745' : '#d0021b', fontWeight: 'bold' }}>{laiLo.toLocaleString()} VNĐ</Text>)
                            </Text>
                        );
                    })
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
    dataRowSmall: { fontSize: 13, marginBottom: 2, marginLeft: 10, lineHeight: 20 },
    separator: { height: 1, backgroundColor: '#cce0ff', marginVertical: 8 },
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