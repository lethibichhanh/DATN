import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig"; // Đảm bảo firebaseConfig.ts có db

// ==========================================================
// ⭐ HẰNG SỐ & HÀM TÍNH TOÁN LƯƠNG VIỆT NAM (SIMPLIFIED)
// ==========================================================

// Tỷ lệ đóng Bảo hiểm bắt buộc (Người lao động)
const SI_RATE_EMPLOYEE = 0.105; // 10.5% (BHXH 8%, BHYT 1.5%, BHTN 1%)
// Giảm trừ gia cảnh (Bản thân)
const PERSONAL_DEDUCTION = 11000000; // 11 triệu VNĐ (năm 2024)

// Biểu thuế lũy tiến từng phần (Simplified)
const TAX_BANDS = [
    { limit: 5000000, rate: 0.05 },    // 5%
    { limit: 10000000, rate: 0.10 },   // 10%
    { limit: 18000000, rate: 0.15 },   // 15%
    { limit: 32000000, rate: 0.20 },   // 20%
    { limit: 52000000, rate: 0.25 },   // 25%
    { limit: 80000000, rate: 0.30 },   // 30%
    { limit: Infinity, rate: 0.35 },   // 35%
];

// Hàm tính Thuế Thu nhập Cá nhân (TNCN)
const calculatePIT = (assessableIncome: number): number => {
    if (assessableIncome <= 0) return 0;

    let pit = 0;
    let remainingIncome = assessableIncome;

    for (const band of TAX_BANDS) {
        if (remainingIncome <= 0) break;

        const taxableBase = band.limit === Infinity 
            ? remainingIncome 
            : Math.min(remainingIncome, band.limit - (TAX_BANDS[TAX_BANDS.indexOf(band) - 1]?.limit || 0));

        pit += taxableBase * band.rate;
        remainingIncome -= taxableBase;
    }

    return Math.round(pit);
};

// ==========================================================
// ⭐ KHAI BÁO KIỂU DỮ LIỆU
// ==========================================================
interface AttendanceRecord {
    date: string; // YYYY-MM-DD
    checkIn: string | null; // ISO string
    checkOut: string | null; // ISO string
}

interface UserInfo {
    uid: string;
    name: string;
    salary: number;      // Lương cố định (Dùng để tính Bảo hiểm và rate giờ)
    allowance: number;   // Phụ cấp
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


export default function BangLuongScreen({ route }: any) {
    const { user } = route.params as { user: UserInfo };
    
    if (!user || !user.uid) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Lỗi: Không tìm thấy thông tin nhân viên.</Text>
                <Text style={styles.errorSubText}>Vui lòng quay lại màn hình trước và chọn nhân viên.</Text>
            </View>
        );
    }

    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [monthlyGrossSalary, setMonthlyGrossSalary] = useState<number>(0);
    const [totalWorkingHours, setTotalWorkingHours] = useState<number>(0);
    const [compulsoryInsurance, setCompulsoryInsurance] = useState<number>(0); // Bảo hiểm thực tế trừ
    const [pitAmount, setPitAmount] = useState<number>(0); // Thuế TNCN
    const [netSalary, setNetSalary] = useState<number>(0); // Lương thực nhận
    const [isLoading, setIsLoading] = useState(true);

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const workingHoursPerDay = 8; 
    const workingDaysPerMonth = 26; 
    const standardWorkingHours = workingDaysPerMonth * workingHoursPerDay; 

    useEffect(() => {
        setIsLoading(true);
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

            let totalHours = 0;
            const monthlyContractSalary = parseFloat(user.salary as any) || 0; 
            const monthlyAllowance = parseFloat(user.allowance as any) || 0; 

            // Tính tổng số giờ làm việc thực tế
            monthlyData.forEach(a => {
                if(a.checkIn && a.checkOut){
                    const checkInTime = new Date(a.checkIn).getTime();
                    const checkOutTime = new Date(a.checkOut).getTime();
                    let hours = (checkOutTime - checkInTime) / (1000 * 60 * 60); 
                    totalHours += hours;
                }
            });
            setTotalWorkingHours(totalHours);

            // 1. Tính Lương Cơ Bản (theo giờ làm thực tế)
            const salaryPerHour = monthlyContractSalary > 0 && standardWorkingHours > 0 
                ? monthlyContractSalary / standardWorkingHours 
                : 0;
            const baseGrossSalary = Math.round(totalHours * salaryPerHour);
            
            // 2. Tính Tổng Lương Gross (Base + Allowance)
            const totalGrossSalary = baseGrossSalary + monthlyAllowance;
            setMonthlyGrossSalary(totalGrossSalary);

            // 3. Tính Bảo hiểm bắt buộc (CI)
            const calculatedCI_Base = Math.round(monthlyContractSalary * SI_RATE_EMPLOYEE);

            // ⭐ LOGIC FIX LƯƠNG ÂM: Chỉ trừ Bảo hiểm khi Lương Gross đủ trang trải (để Net Salary >= 0)
            let actualCI = 0;
            if (totalGrossSalary >= calculatedCI_Base) {
                // Nếu Lương Gross đủ, trừ toàn bộ
                actualCI = calculatedCI_Base;
            } else if (totalGrossSalary > 0) {
                // Nếu Lương Gross không đủ nhưng > 0, tạm thời không trừ để tránh lương âm.
                // Khoản 945.000 (CI Base) sẽ được coi là nợ hoặc xử lý vào tháng sau.
                actualCI = 0;
            }
            setCompulsoryInsurance(actualCI); // Gán giá trị Bảo hiểm thực tế đã trừ

            // 4. Tính Thu nhập tính thuế (Assessable Income)
            const taxableIncome = totalGrossSalary - actualCI; // Dùng actualCI đã điều chỉnh
            const assessableIncome = taxableIncome > PERSONAL_DEDUCTION 
                ? taxableIncome - PERSONAL_DEDUCTION 
                : 0;

            // 5. Tính Thuế TNCN (PIT)
            const calculatedPIT = calculatePIT(assessableIncome);
            setPitAmount(calculatedPIT);

            // 6. Tính Lương Net
            const finalNetSalary = totalGrossSalary - actualCI - calculatedPIT; // Dùng actualCI
            setNetSalary(finalNetSalary);
            
            setIsLoading(false);
        }, (error) => {
            console.error("Lỗi fetching bảng lương:", error);
            setIsLoading(false);
        });
        
        return () => unsub();
    }, [user.uid, user.salary, user.allowance, currentMonth, currentYear]);


    const renderItem = ({ item }: { item: AttendanceRecord }) => {
        const checkInTime = item.checkIn ? new Date(item.checkIn).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "--";
        const checkOutTime = item.checkOut ? new Date(item.checkOut).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "--";
        
        let hoursWorked = 0;
        if (item.checkIn && item.checkOut) {
            const diffInMilliseconds = new Date(item.checkOut).getTime() - new Date(item.checkIn).getTime();
            hoursWorked = (diffInMilliseconds / (1000 * 60 * 60));
        }
        
        return (
            <View style={styles.item}>
                <Text style={styles.itemDate}>{item.date}</Text>
                <View style={styles.itemDetail}>
                    <Text>Check-in: <Text style={{ fontWeight: '600' }}>{checkInTime}</Text></Text>
                    <Text>Check-out: <Text style={{ fontWeight: '600' }}>{checkOutTime}</Text></Text>
                    <Text style={styles.hoursText}>Giờ làm: {hoursWorked.toFixed(2)} giờ</Text>
                </View>
            </View>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text>Đang tính toán bảng lương...</Text>
            </View>
        );
    }
    
    return (
        <View style={styles.container}>
            <Text style={styles.title}>💰 Bảng lương: {user.name}</Text>
            
            <View style={styles.summaryBox}>
                <Text style={styles.summaryText}>Tháng: <Text style={{fontWeight: 'bold'}}>{currentMonth}/{currentYear}</Text></Text>
                
                <Text style={styles.salaryBaseText}>Lương hợp đồng: <Text style={{fontWeight: 'bold'}}>{formatCurrency(user.salary || 0)}</Text></Text>
                <Text style={styles.salaryBaseText}>Phụ cấp cố định: <Text style={{fontWeight: 'bold'}}>{formatCurrency(user.allowance || 0)}</Text></Text>
                <Text style={styles.salaryBaseText}>Tổng giờ làm thực tế: <Text style={{fontWeight: 'bold'}}>{totalWorkingHours.toFixed(2)} giờ</Text></Text>

                <View style={styles.divider} />
                
                <Text style={styles.summaryText}>1. Tổng lương Gross (Ước tính): <Text style={styles.grossAmount}>{formatCurrency(monthlyGrossSalary)}</Text></Text>
                
                {/* HIỂN THỊ KHOẢN TRỪ BẢO HIỂM THỰC TẾ ĐÃ ĐƯỢC ĐIỀU CHỈNH */}
                <Text style={styles.deductionText}>- 2. Bảo hiểm (10.5%): <Text style={styles.deductionAmount}>{formatCurrency(compulsoryInsurance)}</Text></Text>
                <Text style={styles.deductionText}>- 3. Thuế TNCN: <Text style={styles.deductionAmount}>{formatCurrency(pitAmount)}</Text></Text>

                <View style={styles.divider} />

                <Text style={styles.total}>
                    4. Tổng lương NET thực nhận: <Text style={styles.totalAmount}>{formatCurrency(netSalary)}</Text>
                </Text>
            </View>

            <Text style={styles.historyTitle}>Chi tiết công</Text>
            <FlatList
                data={attendance.sort((a,b)=>b.date.localeCompare(a.date))}
                keyExtractor={(item,index)=>index.toString()}
                renderItem={renderItem}
                ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#999' }}>Chưa có ngày công nào trong tháng này.</Text>}
            />
        </View>
    );
}

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
    }
});