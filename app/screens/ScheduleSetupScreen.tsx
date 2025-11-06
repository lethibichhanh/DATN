import { Ionicons } from "@expo/vector-icons";
import { RouteProp } from "@react-navigation/native";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
    Alert,
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    SafeAreaView,
} from "react-native";
// Giả định đường dẫn này là chính xác
import { db } from "../../firebaseConfig"; 
import type { RootStackParamList } from "../../types";

// Khai báo kiểu dữ liệu cho ca làm việc (Shift)
interface Shift {
    day: string; // Thứ Hai, Thứ Ba, ...
    start: string; // Giờ bắt đầu (HH:mm)
    end: string; // Giờ kết thúc (HH:mm)
}

// ⭐ KIỂU USER TỐI THIỂU CHO NAVIGATION
interface User {
    uid: string;
    email: string;
    name?: string;
}

// Khai báo kiểu dữ liệu cho tham số truyền vào từ navigation
type ScheduleSetupScreenProps = {
    navigation: any;
    // Đảm bảo tên route 'SetupLichLamViec' khớp với tên trong RootStackParamList
    route: RouteProp<RootStackParamList, "SetupLichLamViec">;
};

// Dữ liệu mặc định 7 ngày trong tuần
const INITIAL_SCHEDULE: Shift[] = [
    { day: "Thứ Hai", start: "08:00", end: "17:00" },
    { day: "Thứ Ba", start: "08:00", end: "17:00" },
    { day: "Thứ Tư", start: "08:00", end: "17:00" },
    { day: "Thứ Năm", start: "08:00", end: "17:00" },
    { day: "Thứ Sáu", start: "08:00", end: "17:00" },
    { day: "Thứ Bảy", start: "09:00", end: "13:00" },
    { day: "Chủ Nhật", start: "OFF", end: "OFF" }, // Mặc định OFF Chủ Nhật
];

// Hàm kiểm tra định dạng HH:mm
const isValidTimeFormat = (time: string): boolean => {
    if (time === "OFF") return true;
    const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/; // Regex HH:mm (24h)
    return regex.test(time);
};

// Hàm kiểm tra logic giờ (giờ kết thúc phải sau giờ bắt đầu)
const isTimeValidLogic = (start: string, end: string): boolean => {
    if (start === "OFF" || end === "OFF") return true;
    
    try {
        // Tạo đối tượng Date để so sánh. Dùng format YYYY/MM/DD HH:mm để đảm bảo tính nhất quán
        const startTime = new Date(`2000/01/01 ${start}`);
        const endTime = new Date(`2000/01/01 ${end}`);
        
        // Nếu giờ kết thúc nhỏ hơn hoặc bằng giờ bắt đầu
        if (endTime <= startTime) {
             // Thử kiểm tra trường hợp qua đêm (ví dụ: 22:00 -> 06:00 ngày hôm sau)
             // Đây là một giả định chung, nếu không có logic qua đêm, chỉ cần return false
             // Trong bối cảnh quản lý ca làm, thường ca kết thúc cùng ngày
             return false;
        }

        return true;
    } catch (e) {
        // Trường hợp parse lỗi
        return false;
    }
};

// =======================================================
// Component phụ: ShiftCard
// =======================================================
interface ShiftCardProps {
    shift: Shift;
    index: number;
    schedule: Shift[];
    setSchedule: React.Dispatch<React.SetStateAction<Shift[]>>;
    // ⭐ PROP MỚI: Chỉ báo cáo lỗi của mình cho component cha
    onValidationErrorChange: (index: number, hasError: boolean) => void;
}

const ShiftCard: React.FC<ShiftCardProps> = React.memo(({ 
    shift, 
    index, 
    schedule, 
    setSchedule, 
    onValidationErrorChange 
}) => {
    const isDayOff = shift.start === "OFF";
    // Trạng thái lỗi cục bộ (dùng để highlight input)
    const [localError, setLocalError] = useState<string | null>(null);

    // Effect để kiểm tra lỗi mỗi khi shift thay đổi (khi người dùng nhập)
    useEffect(() => {
        let errorMsg: string | null = null;
        let hasError = false;

        if (shift.start !== "OFF" && shift.end !== "OFF") {
            // 1. Kiểm tra format
            if (!isValidTimeFormat(shift.start) || !isValidTimeFormat(shift.end)) {
                errorMsg = "Định dạng phải là HH:mm (ví dụ: 08:00).";
                hasError = true;
            } 
            // 2. Kiểm tra logic (chỉ kiểm tra nếu format đúng)
            else if (!isTimeValidLogic(shift.start, shift.end)) {
                errorMsg = "Giờ kết thúc phải sau giờ bắt đầu.";
                hasError = true;
            }
        }

        setLocalError(errorMsg);
        
        // ⭐ Báo cáo trạng thái lỗi cục bộ cho component cha
        onValidationErrorChange(index, hasError);
        
    }, [shift, index, onValidationErrorChange]); // Loại bỏ schedule khỏi dependency

    const updateSchedule = (key: 'start' | 'end', value: string) => {
        // Chỉ cho phép nhập số và dấu hai chấm
        const cleanValue = value.replace(/[^0-9:]/g, ''); 
        
        // Cập nhật state với hàm callback để đảm bảo luôn dùng schedule mới nhất
        setSchedule(prevSchedule => {
            const newSchedule = [...prevSchedule];
            newSchedule[index] = { ...newSchedule[index], [key]: cleanValue };
            return newSchedule;
        });
    };

    const toggleDayOff = () => {
        setSchedule(prevSchedule => {
            const newSchedule = [...prevSchedule];
            if (isDayOff) {
                // Chuyển từ OFF sang giờ mặc định
                newSchedule[index] = { ...newSchedule[index], start: "08:00", end: "17:00" };
            } else {
                // Chuyển sang OFF
                newSchedule[index] = { ...newSchedule[index], start: "OFF", end: "OFF" };
            }
            return newSchedule;
        });
    };

    return (
        <View style={[styles.card, isDayOff ? styles.dayOffCard : { borderLeftColor: '#4a90e2' }]}>
            <View style={styles.header}>
                <Text style={styles.dayTitle}>{shift.day}</Text>
                <TouchableOpacity onPress={toggleDayOff}>
                    <Ionicons
                        name={isDayOff ? "toggle-outline" : "toggle-sharp"} // Dùng sharp cho biểu tượng rõ ràng hơn
                        size={30}
                        color={isDayOff ? "#999" : "#4a90e2"}
                    />
                </TouchableOpacity>
            </View>

            {isDayOff ? (
                <Text style={styles.offText}>Ngày nghỉ</Text>
            ) : (
                <>
                    <View style={styles.timeInputs}>
                        <TextInput
                            style={[styles.timeInput, localError && styles.errorInput]}
                            value={shift.start}
                            onChangeText={(text) => updateSchedule('start', text)}
                            placeholder="Bắt đầu (HH:mm)"
                            keyboardType="numeric" // Thử dùng numeric để gọi bàn phím số
                            maxLength={5}
                        />
                        <Text style={{ marginHorizontal: 10, color: '#666', fontWeight: 'bold' }}>-</Text>
                        <TextInput
                            style={[styles.timeInput, localError && styles.errorInput]}
                            value={shift.end}
                            onChangeText={(text) => updateSchedule('end', text)}
                            placeholder="Kết thúc (HH:mm)"
                            keyboardType="numeric" // Thử dùng numeric
                            maxLength={5}
                        />
                    </View>
                    {localError && <Text style={styles.errorMessage}>{localError}</Text>}
                </>
            )}
        </View>
    );
}, (prevProps, nextProps) => {
    // Chỉ render lại nếu shift thay đổi (để tối ưu FlatList)
    return prevProps.shift === nextProps.shift;
});


// =======================================================
// Component chính: ScheduleSetupScreen
// =======================================================
export default function ScheduleSetupScreen({ navigation, route }: ScheduleSetupScreenProps) {
    
    // ⚠️ KIỂM TRA AN TOÀN QUAN TRỌNG ĐỂ TRÁNH CRASH ⚠️
    const user = route.params?.user as (User | undefined); 

    if (!user) {
        Alert.alert("Lỗi Dữ Liệu", "Không tìm thấy thông tin nhân viên. Vui lòng thử lại.");
        navigation.goBack(); 
        return null; 
    }
    
    const [schedule, setSchedule] = useState<Shift[]>(INITIAL_SCHEDULE);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // ⭐ STATE MỚI: Theo dõi lỗi cho từng index (0-6)
    // Ví dụ: { 0: false, 1: true, 2: false, ... }
    const [shiftErrors, setShiftErrors] = useState<Record<number, boolean>>({});

    // EFFECT TÍNH TOÁN LỖI TỔNG THỂ
    // Kiểm tra xem có bất kỳ shift nào có lỗi hay không
    const hasValidationErrors = Object.values(shiftErrors).some(hasError => hasError === true);

    // CALLBACK để ShiftCard báo cáo lỗi của nó
    const handleShiftErrorChange = useCallback((index: number, hasError: boolean) => {
        setShiftErrors(prevErrors => {
            // Chỉ cập nhật nếu trạng thái lỗi thực sự thay đổi
            if (prevErrors[index] !== hasError) {
                return {
                    ...prevErrors,
                    [index]: hasError,
                };
            }
            return prevErrors;
        });
    }, []);


    // Effect tải dữ liệu và thiết lập tiêu đề
    useEffect(() => {
        navigation.setOptions({ title: `Lịch làm việc: ${user.name || user.email}` });

        const fetchSchedule = async () => {
            if (!user.uid) { 
                setIsLoading(false);
                return;
            }
            try {
                const userRef = doc(db, "users", user.uid); 
                const docSnap = await getDoc(userRef);

                if (docSnap.exists() && docSnap.data().shiftSchedule) {
                    const fetchedSchedule = docSnap.data().shiftSchedule as Shift[];
                    
                    if (fetchedSchedule.length === INITIAL_SCHEDULE.length) {
                        setSchedule(fetchedSchedule);
                    } else {
                        console.warn("Lịch làm việc không đủ 7 ngày, sử dụng mặc định.");
                        setSchedule(INITIAL_SCHEDULE);
                    }
                }
            } catch (error) {
                console.error("Lỗi khi tải lịch làm việc:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSchedule();
        
        // Khởi tạo trạng thái lỗi ban đầu (tất cả là false)
        const initialErrors: Record<number, boolean> = {};
        INITIAL_SCHEDULE.forEach((_, index) => {
            initialErrors[index] = false;
        });
        setShiftErrors(initialErrors);

    }, [user, navigation]); 


    // Hàm lưu dữ liệu
    const handleSave = async () => {
        // Kiểm tra lỗi validation TỔNG THỂ dựa trên state `hasValidationErrors`
        if (hasValidationErrors) {
            Alert.alert("Lỗi Định Dạng", "Vui lòng sửa các lỗi định dạng hoặc logic giờ làm việc đang hiển thị trên màn hình trước khi lưu.");
            return;
        }
        
        setIsSaving(true);
        try {
            // LƯU DỮ LIỆU VÀO FIRESTORE
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                shiftSchedule: schedule, // Lưu mảng lịch làm việc
            });

            Alert.alert("Thành công", `Đã lưu lịch làm việc cho nhân viên ${user.name || user.email}.`);
            navigation.goBack(); // Quay lại màn hình trước đó
        } catch (error) {
            Alert.alert("Lỗi", "Không thể lưu lịch làm việc. Vui lòng thử lại.");
            console.error("Lỗi lưu lịch làm việc:", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) { 
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4a90e2" />
                <Text style={{ marginTop: 10 }}>Đang tải lịch làm việc...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <Text style={styles.infoText}>Chỉnh sửa ca làm việc (HH:mm) hoặc chọn Ngày nghỉ (OFF).</Text>

                <FlatList
                    data={schedule}
                    keyExtractor={item => item.day}
                    renderItem={({ item, index }) => (
                        <ShiftCard
                            shift={item}
                            index={index}
                            schedule={schedule}
                            setSchedule={setSchedule}
                            onValidationErrorChange={handleShiftErrorChange} // Truyền callback mới
                        />
                    )}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />

                <TouchableOpacity 
                    style={[styles.saveButton, (isSaving || hasValidationErrors) && styles.disabledButton]} 
                    onPress={handleSave} 
                    // Tắt nút Lưu nếu đang lưu hoặc có lỗi validation
                    disabled={isSaving || hasValidationErrors}
                >
                    {isSaving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="save-outline" size={24} color="#fff" />
                            <Text style={styles.saveButtonText}>Lưu Lịch Làm Việc</Text>
                        </>
                    )}
                </TouchableOpacity>
                {hasValidationErrors && (
                    <Text style={styles.globalError}>Vui lòng sửa các lỗi định dạng trên lịch trước khi lưu.</Text>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
    },
    infoText: {
        fontSize: 14,
        color: "#555",
        textAlign: "center",
        marginBottom: 15,
        paddingHorizontal: 10,
    },
    // --- CARD & ITEM STYLES ---
    card: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        borderLeftWidth: 4,
        // Màu mặc định được set inline trong component con
    },
    dayOffCard: {
        backgroundColor: "#ffebee", // Light color for day off
        borderLeftColor: '#f00',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    dayTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: '#333',
    },
    timeInputs: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    timeInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 10,
        textAlign: "center",
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    errorInput: {
        borderColor: '#f00',
        borderWidth: 2,
    },
    errorMessage: {
        color: '#f00',
        fontSize: 12,
        marginTop: 5,
        textAlign: 'center',
    },
    offText: {
        color: "#f00",
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 10,
        textAlign: 'center',
        paddingVertical: 5,
    },
    // --- BUTTON STYLES ---
    saveButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#007bff",
        padding: 15,
        borderRadius: 10,
        marginTop: 20,
        marginBottom: 10,
    },
    saveButtonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
        marginLeft: 10,
    },
    disabledButton: {
        backgroundColor: '#a0c9f1',
    },
    globalError: {
        color: '#f00',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 10,
        fontWeight: 'bold',
    }
});