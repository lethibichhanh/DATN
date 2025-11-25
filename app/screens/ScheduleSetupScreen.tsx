import { Ionicons } from "@expo/vector-icons";
import { RouteProp } from "@react-navigation/native";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
// Giả định đường dẫn này là chính xác
import { db } from "../../firebaseConfig";
import type { RootStackParamList } from "../../types";

// ⭐ Cập nhật kiểu dữ liệu cho ca làm việc (Shift) để có field date
interface Shift {
    day: string; // Thứ Hai, Thứ Ba, ...
    dateKey: string; // YYYY-MM-DD (Ví dụ: 2025-11-25) - Dùng làm key duy nhất
    start: string; // Giờ bắt đầu (HH:mm) hoặc OFF
    end: string; // Giờ kết thúc (HH:mm) hoặc OFF
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

// =======================================================
// ⭐ HÀM TIỆN ÍCH MỚI: TẠO LỊCH 7 NGÀY DỰA TRÊN NGÀY THÁNG THỰC
// =======================================================
const getInitialSchedule = (): Shift[] => {
    const today = new Date();
    // 0 = Chủ Nhật, 1 = Thứ Hai, ...
    const dayOfWeek = today.getDay(); 
    
    // Tính ngày Thứ Hai của tuần hiện tại (để luôn bắt đầu từ Thứ Hai)
    // Nếu hôm nay là Chủ Nhật (0), diffToMonday là -6 (để lùi về Thứ Hai tuần trước)
    // Nếu hôm nay là Thứ Hai (1), diffToMonday là 0
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    
    const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    
    const schedule: Shift[] = [];
    
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(monday);
        currentDate.setDate(monday.getDate() + i);
        
        // Lấy tên ngày trong tuần (Thứ Hai,...)
        const dayIndex = currentDate.getDay(); // 0=CN, 1=T2, ...
        const dayName = days[dayIndex];
        
        // Định dạng YYYY-MM-DD làm key
        const dateKey = currentDate.toISOString().split('T')[0];

        schedule.push({
            day: dayName,
            dateKey: dateKey,
            start: dayName === "Chủ Nhật" ? "OFF" : "08:00",
            end: dayName === "Chủ Nhật" ? "OFF" : "17:00",
        });
    }

    // ⭐ Sắp xếp lại để Thứ Hai là đầu tiên
    const sortedSchedule = schedule.sort((a, b) => {
        const daysOrder = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];
        return daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day);
    });

    return sortedSchedule;
};

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
             return false;
        }

        return true;
    } catch (e) {
        // Trường hợp parse lỗi
        return false;
    }
};

// =======================================================
// Component phụ: ShiftCard (Gần như không thay đổi, chỉ dùng dateKey)
// =======================================================
interface ShiftCardProps {
    shift: Shift;
    index: number;
    schedule: Shift[];
    setSchedule: React.Dispatch<React.SetStateAction<Shift[]>>;
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
        
    }, [shift, index, onValidationErrorChange]);

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
    
    // ⭐ Định dạng ngày/tháng để hiển thị
    const [year, month, day] = shift.dateKey.split('-');
    const displayDate = `${day}/${month}`;

    return (
        <View style={[styles.card, isDayOff ? styles.dayOffCard : { borderLeftColor: '#4a90e2' }]}>
            <View style={styles.header}>
                {/* ⭐ HIỂN THỊ CẢ NGÀY TRONG TUẦN VÀ NGÀY/THÁNG */}
                <Text style={styles.dayTitle}>{shift.day} ({displayDate})</Text>
                <TouchableOpacity onPress={toggleDayOff}>
                    <Ionicons
                        name={isDayOff ? "toggle-outline" : "toggle-sharp"} 
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
                            keyboardType="numeric" 
                            maxLength={5}
                        />
                        <Text style={{ marginHorizontal: 10, color: '#666', fontWeight: 'bold' }}>-</Text>
                        <TextInput
                            style={[styles.timeInput, localError && styles.errorInput]}
                            value={shift.end}
                            onChangeText={(text) => updateSchedule('end', text)}
                            placeholder="Kết thúc (HH:mm)"
                            keyboardType="numeric" 
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
    
    // ⭐ LẤY LỊCH LÀM VIỆC BAN ĐẦU DỰA TRÊN NGÀY THÁNG THỰC
    const INITIAL_SCHEDULE = getInitialSchedule();
    
    const user = route.params?.user as (User | undefined); 

    if (!user) {
        Alert.alert("Lỗi Dữ Liệu", "Không tìm thấy thông tin nhân viên. Vui lòng thử lại.");
        navigation.goBack(); 
        return null; 
    }
    
    const [schedule, setSchedule] = useState<Shift[]>(INITIAL_SCHEDULE);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [shiftErrors, setShiftErrors] = useState<Record<number, boolean>>({});

    const hasValidationErrors = Object.values(shiftErrors).some(hasError => hasError === true);

    const handleShiftErrorChange = useCallback((index: number, hasError: boolean) => {
        setShiftErrors(prevErrors => {
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
        navigation.setOptions({ title: `Thiết lập lịch: ${user.name || user.email}` });

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
                    
                    // ⭐ Lấy các ca làm việc đã lưu TỪNG NGÀY (dateKey)
                    const fetchedMap = fetchedSchedule.reduce((acc, shift) => {
                        acc[shift.dateKey] = shift;
                        return acc;
                    }, {} as Record<string, Shift>);
                    
                    // ⭐ Cập nhật lịch ban đầu với dữ liệu đã lưu nếu có (dựa trên dateKey)
                    const mergedSchedule = INITIAL_SCHEDULE.map(initialShift => {
                        const existingShift = fetchedMap[initialShift.dateKey];
                        // Nếu có ca làm việc đã lưu cho ngày này, dùng nó. Ngược lại dùng mặc định.
                        return existingShift ? existingShift : initialShift;
                    });
                    
                    setSchedule(mergedSchedule);
                    
                } else {
                    // Nếu chưa có lịch, dùng lịch mặc định được tạo theo ngày
                    setSchedule(INITIAL_SCHEDULE);
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

    }, [user, navigation]); // Thêm user và navigation vào dependency array


    // Hàm lưu dữ liệu
    const handleSave = async () => {
        if (hasValidationErrors) {
            Alert.alert("Lỗi Định Dạng", "Vui lòng sửa các lỗi định dạng hoặc logic giờ làm việc đang hiển thị trên màn hình trước khi lưu.");
            return;
        }
        
        setIsSaving(true);
        try {
            // ⭐ LƯU DỮ LIỆU MỚI: Chỉ lưu 7 ngày vừa được thiết lập (theo dateKey)
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                shiftSchedule: schedule, // Lưu mảng 7 ngày có dateKey
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
                <Text style={styles.infoText}>
                    Chỉnh sửa ca làm việc (HH:mm) cho tuần bắt đầu từ {schedule[0].dateKey.split('-').reverse().join('/')}.
                </Text>

                <FlatList
                    data={schedule}
                    keyExtractor={item => item.dateKey} // ⭐ Dùng dateKey làm key
                    renderItem={({ item, index }) => (
                        <ShiftCard
                            shift={item}
                            index={index}
                            schedule={schedule}
                            setSchedule={setSchedule}
                            onValidationErrorChange={handleShiftErrorChange} 
                        />
                    )}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />

                <TouchableOpacity 
                    style={[styles.saveButton, (isSaving || hasValidationErrors) && styles.disabledButton]} 
                    onPress={handleSave} 
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
        fontWeight: '600', // Đậm hơn để nổi bật thông tin ngày
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