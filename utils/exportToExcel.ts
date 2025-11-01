import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Thuoc } from '../types';

export const exportKiemKhoToExcel = async (data: Thuoc[]) => {
  const ws = XLSX.utils.json_to_sheet(
    data.map(item => ({
      'Tên thuốc': item.ten,
      'Số lượng': item.soluong,
      'Hạn sử dụng': item.hanSuDung,
    }))
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'KiemKho');

  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const uri = FileSystem.cacheDirectory + 'kiem-kho.xlsx';

  await FileSystem.writeAsStringAsync(uri, wbout, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await Sharing.shareAsync(uri, {
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Chia sẻ kiểm kho',
    UTI: 'com.microsoft.excel.xlsx',
  });
};
