import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig";

export default function BangLuongScreen({ route }: any) {
  const { user } = route.params;
  const [attendance, setAttendance] = useState<any[]>([]);
  const [totalSalary, setTotalSalary] = useState<number>(0);

  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();

  useEffect(() => {
    const q = query(collection(db, "attendance"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => d.data());
      const monthlyData = data.filter(a => {
        const d = new Date(a.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });
      setAttendance(monthlyData);

      let totalHours = 0;
      monthlyData.forEach(a => {
        if(a.checkIn && a.checkOut){
          totalHours += (new Date(a.checkOut).getTime() - new Date(a.checkIn).getTime())/(1000*60*60);
        }
      });

      const salaryPerHour = (user.salary ?? 0)/8;
      setTotalSalary(Math.round(totalHours*salaryPerHour));
    });
    return () => unsub();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💰 Bảng lương: {user.name}</Text>
      <Text>Tháng {month}/{year}</Text>
      <Text style={styles.total}>Tổng lương: {totalSalary} VNĐ</Text>

      <FlatList
        data={attendance.sort((a,b)=>b.date.localeCompare(a.date))}
        keyExtractor={(item,index)=>index.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>{item.date}</Text>
            <Text>Check-in: {item.checkIn ? new Date(item.checkIn).toLocaleTimeString():"--"}</Text>
            <Text>Check-out: {item.checkOut ? new Date(item.checkOut).toLocaleTimeString():"--"}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,padding:16},
  title:{fontSize:20,fontWeight:"bold",marginBottom:8},
  total:{fontSize:18,fontWeight:"600",marginBottom:12},
  item:{padding:10,backgroundColor:"#eee",marginBottom:8,borderRadius:6},
});
