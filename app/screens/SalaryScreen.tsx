import React, { useEffect, useState, useCallback, useMemo } from "react";
import { 
    View, Text, FlatList, StyleSheet, ActivityIndicator, 
    TouchableOpacity, Alert, ScrollView 
} from "react-native";
import { collection, query, where, onSnapshot } from "firebase/firestore";
// Giả định đường dẫn và cấu hình Firebase là chính xác
import { db } from "../../firebaseConfig"; 
import * as Print from "expo-print"; 
import * as Sharing from "expo-sharing"; 

// ==========================================================
// ⭐ HẰNG SỐ & CẤU HÌNH LƯƠNG VIỆT NAM (Quy định 2024)
// ==========================================================

// Tỷ lệ đóng Bảo hiểm bắt buộc (Người lao động)
const SI_RATE_EMPLOYEE = 0.105; // 10.5% (BHXH 8%, BHYT 1.5%, BHTN 1%)
// Mức trần đóng BHXH (Quy định hiện hành, giả định 20 lần Lương tối thiểu vùng I)
const SI_MAX_BASE = 36000000; // 36,000,000 VNĐ
// Giảm trừ gia cảnh (Bản thân)
const PERSONAL_DEDUCTION = 11000000; // 11,000,000 VNĐ
// Giảm trừ Người phụ thuộc (Gia đình)
const DEPENDENT_DEDUCTION = 4400000; // 4,400,000 VNĐ/người
// Giờ làm việc chuẩn trong tháng (26 ngày * 8 giờ/ngày)
const STANDARD_WORKING_HOURS = 208; 

// Biểu thuế lũy tiến từng phần (Theo quy định hiện hành)
const TAX_BANDS = [
    { limit: 5000000, rate: 0.05 },     // Bậc 1
    { limit: 10000000, rate: 0.10 },    // Bậc 2
    { limit: 18000000, rate: 0.15 },    // Bậc 3
    { limit: 32000000, rate: 0.20 },    // Bậc 4
    { limit: 52000000, rate: 0.25 },    // Bậc 5
    { limit: 80000000, rate: 0.30 },    // Bậc 6
    { limit: Infinity, rate: 0.35 },    // Bậc 7
];

/**
 * Hàm tính Thuế Thu nhập Cá nhân (TNCN) theo biểu lũy tiến
 * @param assessableIncome Thu nhập tính thuế (đã trừ giảm trừ)
 */
const calculatePIT = (assessableIncome: number): number => {
    if (assessableIncome <= 0) return 0;

    let pit = 0;
    let remainingIncome = assessableIncome;
    let accumulatedLimit = 0;

    for (const band of TAX_BANDS) {
        if (remainingIncome <= 0) break;

        const previousLimit = accumulatedLimit;
        const currentBandRange = band.limit === Infinity 
            ? remainingIncome 
            : band.limit - previousLimit;
        
        const taxableBase = Math.min(remainingIncome, currentBandRange);

        pit += taxableBase * band.rate;
        remainingIncome -= taxableBase;
        accumulatedLimit = band.limit; // Chỉ dùng để tính toán limit kế tiếp
    }

    // Trả về số tiền thuế đã làm tròn
    return Math.round(pit);
};

// ==========================================================
// ⭐ KHAI BÁO KIỂU DỮ LIỆU & HÀM ĐỊNH DẠNG
// ==========================================================
interface AttendanceRecord {
    date: string; // YYYY-MM-DD
    checkIn: string | null; // ISO string
    checkOut: string | null; // ISO string
}

interface UserInfo {
    uid: string;
    name: string;
    salary: number;    // Lương cố định (Dùng để tính Bảo hiểm và rate giờ)
    allowance: number; // Phụ cấp
    numDependents: number; // Số người phụ thuộc
    [key: string]: any;
}

// Hàm định dạng tiền tệ Việt Nam
const formatCurrency = (amount: number) => {
    const safeAmount = amount || 0; 
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
    }).format(safeAmount);
};

// Hàm lấy Giờ/Phút của ISO string
const getLocalTime = (isoString: string | null): string => {
    if (!isoString) return "--";
    try {
        // Tạo đối tượng Date, sau đó format theo múi giờ địa phương
        const date = new Date(isoString);
        return date.toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false // Hiện thị 24h
        });
    } catch (e) {
        return "--";
    }
}


export default function BangLuongScreen({ route }: any) {
    const { user } = route.params as { user: UserInfo };
    
    // Đảm bảo dữ liệu số không bị null/undefined
    const monthlyContractSalary = parseFloat(user.salary as any) || 0; 
    const monthlyAllowance = parseFloat(user.allowance as any) || 0; 
    const numDependents = user.numDependents || 0; 
    
    // State quản lý dữ liệu và kết quả
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [payrollResult, setPayrollResult] = useState({
        monthlyGrossSalary: 0,
        totalWorkingHours: 0,
        compulsoryInsurance: 0,
        incomeSubjectToTax: 0,
        taxableIncome: 0,
        pitAmount: 0,
        netSalary: 0,
        totalDependentDeduction: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    // Tính toán tháng/năm hiện tại chỉ một lần
    const today = useMemo(() => new Date(), []);
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // Hàm tính toán logic bảng lương
    const calculatePayroll = useCallback((monthlyData: AttendanceRecord[]) => {
        let totalHours = 0;
        
        // Tính tổng số giờ làm việc thực tế
        monthlyData.forEach(a => {
            if(a.checkIn && a.checkOut){
                const checkInTime = new Date(a.checkIn).getTime();
                const checkOutTime = new Date(a.checkOut).getTime();
                let hours = (checkOutTime - checkInTime) / (1000 * 60 * 60); 
                // Cải thiện: Đảm bảo giờ làm không bị âm (Check out > Check in)
                totalHours += Math.max(0, hours); 
            }
        });

        // 1. Tính Lương Cơ Bản (theo giờ làm thực tế)
        const salaryPerHour = monthlyContractSalary > 0 && STANDARD_WORKING_HOURS > 0 
            ? monthlyContractSalary / STANDARD_WORKING_HOURS 
            : 0;
        // Lương cơ bản thực tế dựa trên số giờ làm
        const baseGrossSalary = Math.round(totalHours * salaryPerHour);
        
        // 2. Tính Tổng Lương Gross (Base thực tế + Allowance)
        const totalGrossSalary = baseGrossSalary + monthlyAllowance;

        // 3. Tính Bảo hiểm bắt buộc (CI)
        // Cơ sở đóng BHXH là Lương HĐ, tối đa là SI_MAX_BASE
        const insuranceBase = Math.min(monthlyContractSalary, SI_MAX_BASE); 
        const calculatedCI = Math.round(insuranceBase * SI_RATE_EMPLOYEE);
        
        let actualCI = 0;
        // Chỉ đóng BHXH nếu Lương HĐ > 0 (người lao động có hợp đồng)
        // Lưu ý: Logic này cho phép Lương Net âm nếu Gross < CI, là đúng theo luật.
        if (monthlyContractSalary > 0) {
            actualCI = calculatedCI; 
        }

        // 4. Tính Giảm trừ Người phụ thuộc
        const totalDependentDeduction = numDependents * DEPENDENT_DEDUCTION;

        // 5. Tính Thu nhập chịu thuế (Income Subject to Tax)
        const calculatedIncomeSubjectToTax = totalGrossSalary - actualCI; 
        
        // Tổng Giảm trừ
        const totalDeduction = PERSONAL_DEDUCTION + totalDependentDeduction; 
        
        // 6. Tính Thu nhập tính thuế (Taxable Income - Assessable Income)
        // Phải đảm bảo TNCT > Tổng Giảm trừ
        const finalTaxableIncome = Math.max(0, calculatedIncomeSubjectToTax - totalDeduction);
        
        // 7. Tính Thuế TNCN (PIT)
        const calculatedPIT = calculatePIT(finalTaxableIncome);

        // 8. Tính Lương Net
        const finalNetSalary = totalGrossSalary - actualCI - calculatedPIT; 
        
        // Cập nhật state kết quả
        setPayrollResult({
            monthlyGrossSalary: totalGrossSalary,
            totalWorkingHours: totalHours,
            compulsoryInsurance: actualCI,
            incomeSubjectToTax: calculatedIncomeSubjectToTax,
            taxableIncome: finalTaxableIncome,
            pitAmount: calculatedPIT,
            netSalary: finalNetSalary,
            totalDependentDeduction,
        });
        
    }, [monthlyContractSalary, monthlyAllowance, numDependents]);


    useEffect(() => {
        // ... (Giữ nguyên logic fetch data từ Firebase)
        setIsLoading(true);
        // Lấy dữ liệu chấm công cho UID của nhân viên
        const q = query(collection(db, "attendance"), where("uid", "==", user.uid));
        
        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((d) => d.data()) as AttendanceRecord[];
            
            // Lọc dữ liệu trong tháng/năm hiện tại
            const monthlyData = data.filter(a => {
                const parts = a.date.split('-');
                if (parts.length < 3) return false;
                const recordMonth = parseInt(parts[1], 10);
                const recordYear = parseInt(parts[0], 10);
                return recordMonth === currentMonth && recordYear === currentYear;
            });
            setAttendance(monthlyData);
            
            // Gọi hàm tính toán
            calculatePayroll(monthlyData);
            
            setIsLoading(false);
        }, (error) => {
            console.error("Lỗi fetching bảng lương:", error);
            setIsLoading(false);
        });
        
        return () => unsub();
    }, [user.uid, currentMonth, currentYear, calculatePayroll]); 

    // ==========================================================
    // ⭐ HÀM XUẤT PDF (Sử dụng dữ liệu từ payrollResult)
    // ==========================================================
    const createPDF = async () => {
        const {
            monthlyGrossSalary, totalWorkingHours, compulsoryInsurance,
            incomeSubjectToTax, taxableIncome, pitAmount, netSalary,
            totalDependentDeduction
        } = payrollResult;
        
        const dependentInfo = numDependents > 0 
            ? `<tr><td>Giảm trừ Người phụ thuộc (${numDependents} người)</td><td class="text-right deduction">(${formatCurrency(totalDependentDeduction)})</td></tr>`
            : '';

        const htmlContent = `
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Arial', sans-serif; padding: 20px; color: #333; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .header h1 { color: #007bff; }
                    .summary-box { border: 1px solid #007bff; padding: 15px; border-radius: 8px; margin-bottom: 20px; background-color: #f9f9ff; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                    th { background-color: #eef; color: #333; }
                    .total-row td { font-weight: bold; background-color: #ffe0e0; color: #d0021b; font-size: 1.1em; }
                    .deduction { color: #d0021b; }
                    .gross { color: #007bff; font-weight: bold; }
                    .text-right { text-align: right; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>BẢNG LƯƠNG THÁNG ${currentMonth}/${currentYear}</h1>
                    <p><strong>Nhân viên:</strong> ${user.name}</p>
                    <p><strong>Mã nhân viên:</strong> ${user.uid}</p>
                </div>

                <div class="summary-box">
                    <h2>I. TÓM TẮT THU NHẬP</h2>
                    <table>
                        <tr>
                            <td>Lương hợp đồng (Đóng BH)</td>
                            <td class="text-right">${formatCurrency(monthlyContractSalary)}</td>
                        </tr>
                        <tr>
                            <td>Phụ cấp cố định</td>
                            <td class="text-right">${formatCurrency(monthlyAllowance)}</td>
                        </tr>
                        <tr>
                            <td>Tổng giờ làm thực tế</td>
                            <td class="text-right">${totalWorkingHours.toFixed(2)} giờ (${STANDARD_WORKING_HOURS} giờ chuẩn)</td>
                        </tr>
                        <tr>
                            <td><strong>TỔNG LƯƠNG GROSS (Ước tính)</strong></td>
                            <td class="text-right gross">${formatCurrency(monthlyGrossSalary)}</td>
                        </tr>
                    </table>

                    <h2>II. CÁC KHOẢN KHẤU TRỪ & THỰC NHẬN</h2>
                    <table>
                        <tr><th>Khoản mục</th><th>Giá trị</th></tr>
                        <tr>
                            <td>Bảo hiểm bắt buộc (CI - 10.5% trên ${formatCurrency(Math.min(monthlyContractSalary, SI_MAX_BASE))})</td>
                            <td class="text-right deduction">(${formatCurrency(compulsoryInsurance)})</td>
                        </tr>
                        <tr>
                            <td>**Thu nhập chịu thuế (Gross - BH)**</td>
                            <td class="text-right gross">${formatCurrency(incomeSubjectToTax)}</td>
                        </tr>
                        <tr>
                            <td>Giảm trừ Bản thân</td>
                            <td class="text-right deduction">(${formatCurrency(PERSONAL_DEDUCTION)})</td>
                        </tr>
                        ${dependentInfo}
                        <tr>
                            <td>**Thu nhập tính thuế (TNTT)**</td>
                            <td class="text-right">${formatCurrency(taxableIncome)}</td>
                        </tr>
                        <tr>
                            <td>Thuế Thu nhập Cá nhân (PIT)</td>
                            <td class="text-right deduction">(${formatCurrency(pitAmount)})</td>
                        </tr>
                        <tr class="total-row">
                            <td>TỔNG LƯƠNG NET THỰC NHẬN</td>
                            <td class="text-right">${formatCurrency(netSalary)}</td>
                        </tr>
                    </table>
                </div>
                
                <h2>III. CHI TIẾT CÔNG LÀM VIỆC</h2>
                <table>
                    <tr><th>Ngày</th><th>Check-in</th><th>Check-out</th><th>Giờ làm</th></tr>
                    ${attendance.sort((a,b)=>a.date.localeCompare(b.date)).map(item => {
                        const formattedDate = new Date(item.date + 'T00:00:00').toLocaleDateString('vi-VN');
                        const checkInTime = getLocalTime(item.checkIn);
                        const checkOutTime = getLocalTime(item.checkOut);
                        let hoursWorked = 0;
                        if (item.checkIn && item.checkOut) {
                            const diffInMilliseconds = new Date(item.checkOut).getTime() - new Date(item.checkIn).getTime();
                            hoursWorked = (diffInMilliseconds / (1000 * 60 * 60));
                        }
                        return `<tr><td>${formattedDate}</td><td>${checkInTime}</td><td>${checkOutTime}</td><td class="text-right">${Math.max(0, hoursWorked).toFixed(2)} giờ</td></tr>`;
                    }).join('')}
                </table>

                <p style="text-align: center; font-size: 0.8em; margin-top: 30px;">Bảng lương được tính toán tự động dựa trên luật thuế TNCN hiện hành và dữ liệu chấm công.</p>
            </body>
            </html>
        `;

        // ... (Giữ nguyên logic xuất PDF)
        try {
            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            
            Alert.alert(
                "Thành công",
                `Đã tạo bảng lương cho tháng ${currentMonth}/${currentYear}.`,
                [
                    { 
                        text: "Xem & Chia sẻ PDF", 
                        onPress: async () => {
                            if (!(await Sharing.isAvailableAsync())) {
                                Alert.alert("Lỗi", "Chức năng chia sẻ không khả dụng trên thiết bị này.");
                                return;
                            }
                            await Sharing.shareAsync(uri);
                        }
                    },
                    { text: "Đóng", style: "cancel" }
                ]
            );

        } catch (error) {
            console.error("Lỗi tạo PDF:", error);
            Alert.alert("Lỗi", "Không thể tạo file PDF. Vui lòng kiểm tra cài đặt Expo.");
        }
    };
    
    // Rút gọn các biến từ payrollResult
    const {
        monthlyGrossSalary, totalWorkingHours, compulsoryInsurance,
        incomeSubjectToTax, taxableIncome, pitAmount, netSalary,
        totalDependentDeduction
    } = payrollResult;
    
    // ... (Giữ nguyên phần render JSX)
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text>Đang tính toán bảng lương...</Text>
            </View>
        );
    }
    
    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>💰 Bảng lương: {user.name}</Text>
            
            <View style={styles.summaryBox}>
                <Text style={styles.summaryText}>Tháng: <Text style={{fontWeight: 'bold'}}>{currentMonth}/{currentYear}</Text></Text>
                
                <Text style={styles.salaryBaseText}>Lương hợp đồng (Đóng BH): <Text style={{fontWeight: 'bold'}}>{formatCurrency(monthlyContractSalary)}</Text></Text>
                <Text style={styles.salaryBaseText}>Phụ cấp cố định: <Text style={{fontWeight: 'bold'}}>{formatCurrency(monthlyAllowance)}</Text></Text>
                <Text style={styles.salaryBaseText}>Tổng giờ làm thực tế: <Text style={{fontWeight: 'bold'}}>{totalWorkingHours.toFixed(2)} giờ (Chuẩn: {STANDARD_WORKING_HOURS} giờ)</Text></Text>

                <View style={styles.divider} />
                
                <Text style={styles.summaryText}>**1. Tổng lương Gross (Ước tính):** <Text style={styles.grossAmount}>{formatCurrency(monthlyGrossSalary)}</Text></Text>
                
                <Text style={styles.deductionText}>- 2. Bảo hiểm (10.5%): <Text style={styles.deductionAmount}>{formatCurrency(compulsoryInsurance)}</Text></Text>
                
                <View style={styles.divider} /> 
                
                <Text style={styles.summaryText}>**Thu nhập chịu thuế (Gross - BH):** <Text style={styles.grossAmount}>{formatCurrency(incomeSubjectToTax)}</Text></Text>

                <Text style={styles.deductionText}>- 3. Giảm trừ Bản thân: <Text style={styles.deductionAmount}>{formatCurrency(PERSONAL_DEDUCTION)}</Text></Text>
                
                {numDependents > 0 && (
                    <Text style={styles.deductionText}>
                        - 4. Giảm trừ NPT ({numDependents} người): <Text style={styles.deductionAmount}>{formatCurrency(totalDependentDeduction)}</Text>
                    </Text>
                )}

                <View style={styles.divider} />
                
                <Text style={styles.summaryText}>**Thu nhập tính thuế (TNTT):** <Text style={styles.grossAmount}>{formatCurrency(taxableIncome)}</Text></Text>
                <Text style={styles.deductionText}>- 5. Thuế TNCN: <Text style={styles.deductionAmount}>{formatCurrency(pitAmount)}</Text></Text>

                <View style={styles.divider} />

                <Text style={styles.total}>
                    **6. Tổng lương NET thực nhận:** <Text style={styles.totalAmount}>{formatCurrency(netSalary)}</Text>
                </Text>

                <TouchableOpacity style={styles.pdfButton} onPress={createPDF} activeOpacity={0.8}>
                    <Text style={styles.pdfButtonText}>📤 Xuất Bảng Lương PDF</Text>
                </TouchableOpacity>

            </View>

            <Text style={styles.historyTitle}>Chi tiết công làm việc</Text>
            <FlatList
                data={attendance.sort((a,b)=>b.date.localeCompare(a.date))}
                keyExtractor={(item,index)=>index.toString()}
                renderItem={({ item }) => {
                    const formattedDate = new Date(item.date + 'T00:00:00').toLocaleDateString('vi-VN'); 
                    const checkInTime = getLocalTime(item.checkIn);
                    const checkOutTime = getLocalTime(item.checkOut);
                    
                    let hoursWorked = 0;
                    if (item.checkIn && item.checkOut) {
                        const diffInMilliseconds = new Date(item.checkOut).getTime() - new Date(item.checkIn).getTime();
                        hoursWorked = (diffInMilliseconds / (1000 * 60 * 60));
                    }

                    return (
                        <View style={styles.item}>
                            <Text style={styles.itemDate}>{formattedDate}</Text>
                            <View style={styles.itemDetail}>
                                <Text>Check-in: <Text style={{ fontWeight: '600' }}>{checkInTime}</Text></Text>
                                <Text>Check-out: <Text style={{ fontWeight: '600' }}>{checkOutTime}</Text></Text>
                                <Text style={styles.hoursText}>Giờ làm: {Math.max(0, hoursWorked).toFixed(2)} giờ</Text>
                            </View>
                        </View>
                    );
                }}
                ListEmptyComponent={(
                    <Text style={{ textAlign: 'center', color: '#999', paddingTop: 30 }}>
                        Chưa có ngày công nào trong tháng này.
                    </Text>
                )}
                contentContainerStyle={attendance.length === 0 ? styles.listEmptyStyle : null}
                scrollEnabled={false}
            />
        </ScrollView>
    );
}
// Styles được giữ nguyên

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        color: 'red',
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    errorSubText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    title: { fontSize: 22, fontWeight: "bold", marginBottom: 15, color: '#333', textAlign: 'center' },
    summaryBox: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#007bff',
    },
    salaryBaseText: { // Text cho Lương HĐ và Phụ cấp
        fontSize: 15,
        marginBottom: 5,
        color: '#555',
    },
    summaryText: {
        fontSize: 17,
        marginBottom: 5,
        color: '#333',
        fontWeight: '500',
    },
    grossAmount: {
        fontWeight: 'bold',
        color: '#007bff',
    },
    deductionText: {
        fontSize: 16,
        marginLeft: 10,
        color: '#777',
        marginBottom: 3,
    },
    deductionAmount: {
        fontWeight: '600',
        color: '#d0021b',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 10,
    },
    total: { 
        fontSize: 18, 
        marginTop: 10, 
        paddingTop: 5 
    },
    totalAmount: { 
        fontWeight: "bold", 
        color: "#d0021b", 
        fontSize: 20 
    },
    historyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10, color: '#4a90e2' },
    item: { 
        padding: 15, 
        backgroundColor: "#fff", 
        marginBottom: 8, 
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1.41,
        elevation: 2,
    },
    itemDate: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        flex: 1.5,
    },
    itemDetail: {
        flex: 2,
        alignItems: 'flex-end',
    },
    hoursText: {
        marginTop: 4,
        fontStyle: 'italic',
        color: 'green',
        fontWeight: 'bold',
    },
    listEmptyStyle: { 
        flexGrow: 1, 
        justifyContent: 'flex-start' 
    },
    pdfButton: {
        backgroundColor: '#4CAF50',
        padding: 12,
        borderRadius: 8,
        marginTop: 15,
        alignItems: 'center',
    },
    pdfButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    }
});