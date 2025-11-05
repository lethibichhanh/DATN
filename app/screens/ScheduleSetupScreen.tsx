import { Ionicons } from "@expo/vector-icons";
import { RouteProp } from "@react-navigation/native";
import { doc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { db } from "../../firebaseConfig";
import type { RootStackParamList } from "../../types";

// Khai báo kiểu dữ liệu cho ca làm việc (Shift)
interface Shift {
  day: string; // Thứ Hai, Thứ Ba, ...
  start: string; // Giờ bắt đầu (HH:mm)
  end: string; // Giờ kết thúc (HH:mm)
}

// Khai báo kiểu dữ liệu cho tham số truyền vào từ navigation
type ScheduleSetupScreenProps = {
  navigation: any;
  route: RouteProp<RootStackParamList, "SetupLichLamViec">;
};

// Dữ liệu mặc định 7 ngày trong tuần
const INITIAL_SCHEDULE: Shift[] = [
  { day: "Thứ Hai", start: "08:00", end: "17:00" },
  { day: "Thứ Ba", start: "08:00", end: "17:00" },
  { day: "Thứ Tư", start: "08:00", end: "17:00" },
  { day: "Thứ Năm", start: "08:00", end: "17:00" },
  { day: "Thứ Sáu", start: "08:00", end: "17:00" },
  { day: "Thứ Bảy", start: "08:00", end: "12:00" },
  { day: "Chủ Nhật", start: "00:00", end: "00:00" }, // Mặc định là nghỉ (Day Off)
];

// Hàm kiểm tra định dạng giờ HH:mm
const isValidTimeFormat = (time: string): boolean => {
  return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
};

export default function ScheduleSetupScreen({ navigation, route }: ScheduleSetupScreenProps) {
  const { user } = route.params;
  const [schedule, setSchedule] = useState<Shift[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Initialize the schedule from user data or use default
  useEffect(() => {
    const currentSchedule = user.shiftSchedule as Shift[] | undefined;
    if (currentSchedule && currentSchedule.length === 7) {
      // Use existing 7-day schedule
      setSchedule(currentSchedule);
    } else {
      // Use default schedule
      setSchedule(INITIAL_SCHEDULE);
    }
  }, [user.shiftSchedule]);

  // 2. Handle time change for start/end time
  const handleTimeChange = (
    dayName: string,
    timeType: "start" | "end",
    value: string
  ) => {
    // Only allow HH:mm format input
    const formattedValue = value.replace(/[^0-9:]/g, "");

    setSchedule((prevSchedule) =>
      prevSchedule.map((shift) =>
        shift.day === dayName
          ? { ...shift, [timeType]: formattedValue }
          : shift
      )
    );
  };

  // 3. Handle setting a day as "Day Off" (00:00 - 00:00)
  const handleSetDayOff = (dayName: string) => {
    setSchedule((prevSchedule) =>
      prevSchedule.map((shift) =>
        shift.day === dayName
          ? { ...shift, start: "00:00", end: "00:00" }
          : shift
      )
    );
  };

  // 4. Handle saving the schedule to Firestore
  const handleSave = async () => {
    // 4.1. Validation
    const invalidShifts = schedule.filter(
      (shift) =>
        (shift.start !== "00:00" && !isValidTimeFormat(shift.start)) ||
        (shift.end !== "00:00" && !isValidTimeFormat(shift.end))
    );

    if (invalidShifts.length > 0) {
      Alert.alert(
        "⚠️ Lỗi Định Dạng Giờ",
        `Lịch làm việc có lỗi ở các ngày: ${invalidShifts
          .map((s) => s.day)
          .join(", ")}. Vui lòng nhập đúng định dạng HH:mm (ví dụ: 08:30).`
      );
      return;
    }

    setIsSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        shiftSchedule: schedule, // Update the schedule array in Firestore
      });

      Alert.alert("✅ Thành công", "Đã lưu lịch làm việc thành công!");
      // 5. Navigate back (ScheduleScreen uses onSnapshot and will auto-reload)
      navigation.goBack(); 
    } catch (error: any) {
      console.error("Error saving schedule:", error);
      Alert.alert("❌ Lỗi", "Không thể lưu lịch làm việc: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Child component to render each day's shift
  const renderShiftItem = ({ item }: { item: Shift }) => {
    const isDayOff = item.start === "00:00" && item.end === "00:00";
    const isError = 
      (item.start !== "00:00" && !isValidTimeFormat(item.start)) || 
      (item.end !== "00:00" && !isValidTimeFormat(item.end));

    return (
      <View style={[styles.shiftCard, isDayOff && styles.dayOffCard]}>
        <Text style={styles.dayTitle}>{item.day}</Text>

        {isDayOff ? (
          <Text style={styles.offText}>=NGÀY NGHỈ</Text>
        ) : (
          <View style={styles.timeInputs}>
            <TextInput
              style={[styles.timeInput, isError && styles.errorInput]}
              value={item.start}
              onChangeText={(text) => handleTimeChange(item.day, "start", text)}
              placeholder="Bắt đầu (HH:mm)"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
            <Text style={{ marginHorizontal: 10, fontSize: 16 }}>-</Text>
            <TextInput
              style={[styles.timeInput, isError && styles.errorInput]}
              value={item.end}
              onChangeText={(text) => handleTimeChange(item.day, "end", text)}
              placeholder="Kết thúc (HH:mm)"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
        )}
        
        {isError && (
             <Text style={styles.errorMessage}>Lỗi: Nhập giờ đúng định dạng HH:mm</Text>
        )}

        <TouchableOpacity
          style={[styles.dayOffBtn, { backgroundColor: isDayOff ? "#ccc" : "#f00" }]}
          onPress={() => handleSetDayOff(item.day)}
          disabled={isDayOff}
        >
          <Ionicons name="close-circle-outline" size={18} color="#fff" />
          <Text style={styles.dayOffBtnText}>
            {isDayOff ? "Đã Nghỉ" : "Đặt Ngày Nghỉ"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>
        Thiết lập lịch làm việc cho:{" "}
        <Text style={{ fontWeight: "bold", color: "#4a90e2" }}>
          {user.name}
        </Text>
      </Text>

      {/* Sử dụng ScrollView thay vì FlatList để đảm bảo hiển thị đúng trên mọi thiết bị */}
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {schedule.map((item) => (
            <View key={item.day}>
                {renderShiftItem({ item })}
            </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>💾 Lưu Lịch làm việc</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16, 
    backgroundColor: "#f5f5f5" 
  },
  headerTitle: {
    fontSize: 18,
    color: "#555",
    marginBottom: 20,
    textAlign: 'center',
  },
  shiftCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  dayOffCard: {
    backgroundColor: "#ffebee", // Light color for day off
    borderLeftWidth: 4,
    borderLeftColor: '#f00',
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
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
  },
  errorInput: {
      borderColor: '#f00',
      borderWidth: 2,
  },
  errorMessage: {
    color: '#f00',
    fontSize: 12,
    marginBottom: 5,
  },
  offText: {
    color: "#f00",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  dayOffBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    borderRadius: 6,
    marginTop: 5,
  },
  dayOffBtnText: {
    color: "#fff",
    marginLeft: 5,
    fontWeight: "500",
  },
  saveButton: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    margin: 16,
    backgroundColor: "#2ecc71",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
