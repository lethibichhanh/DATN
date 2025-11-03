import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";

export default function LichLamViecScreen({ route }: any) {
  const { user } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🗓 Lịch làm việc: {user.name}</Text>
      <FlatList
        data={user.shiftSchedule ?? []}
        keyExtractor={(item) => item.day}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>{item.day}: {item.start} - {item.end}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  item: { padding: 10, backgroundColor: "#eee", marginBottom: 8, borderRadius: 6 },
});
