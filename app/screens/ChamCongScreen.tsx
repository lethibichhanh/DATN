import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebaseConfig";

export default function ChamCongScreen({ route }: any) {
  const { user } = route.params;
  const [attendance, setAttendance] = useState<any[]>([]);
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  useEffect(() => {
    const q = query(collection(db, "attendance"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAttendance(data);
    });
    return () => unsub();
  }, []);

  const handleCheckIn = async () => {
    const existing = attendance.find(a => a.date === today);
    if (existing && existing.checkIn) {
      Alert.alert("Thông báo", "Bạn đã check-in hôm nay!");
      return;
    }
    await addDoc(collection(db, "attendance"), {
      uid: user.uid,
      date: today,
      checkIn: new Date().toISOString(),
      checkOut: null,
    });
  };

  const handleCheckOut = async () => {
    const existing = attendance.find(a => a.date === today);
    if (!existing) {
      Alert.alert("Thông báo", "Chưa check-in hôm nay!");
      return;
    }
    if (existing.checkOut) {
      Alert.alert("Thông báo", "Bạn đã check-out hôm nay!");
      return;
    }
    await updateDoc(doc(db, "attendance", existing.id), { checkOut: new Date().toISOString() });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>✅ Chấm công: {user.name}</Text>

      <View style={{ flexDirection: "row", marginBottom: 12 }}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: "green" }]} onPress={handleCheckIn}>
          <Text style={styles.btnText}>Check-in</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: "red" }]} onPress={handleCheckOut}>
          <Text style={styles.btnText}>Check-out</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={attendance.sort((a, b) => b.date.localeCompare(a.date))}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>{item.date}</Text>
            <Text>Check-in: {item.checkIn ? new Date(item.checkIn).toLocaleTimeString() : "--"}</Text>
            <Text>Check-out: {item.checkOut ? new Date(item.checkOut).toLocaleTimeString() : "--"}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  btn: { flex: 1, padding: 12, borderRadius: 8, marginRight: 8, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "bold" },
  item: { padding: 10, backgroundColor: "#eee", marginBottom: 8, borderRadius: 6 },
});
