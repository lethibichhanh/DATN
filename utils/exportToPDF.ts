import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { Thuoc } from "../types";

export const exportKiemKhoToPDF = async (thuocs: Thuoc[]) => {
  try {
    const today = new Date().toLocaleString("vi-VN");

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #4a90e2; }
            p { text-align: right; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; }
          </style>
        </head>
        <body>
          <h1>BÁO CÁO KIỂM KHO</h1>
          <p>Ngày xuất: ${today}</p>
          <table>
            <tr>
              <th>Tên thuốc</th>
              <th>Số lượng</th>
              <th>Hạn sử dụng</th>
            </tr>
            ${thuocs
              .map(
                (t) => `
                <tr>
                  <td>${t.ten}</td>
                  <td>${t.soluong}</td>
                  <td>${t.hanSuDung}</td>
                </tr>`
              )
              .join("")}
          </table>
        </body>
      </html>
    `;

    // Xuất ra PDF
    const { uri } = await Print.printToFileAsync({ html });

    // Mở share dialog
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Chia sẻ báo cáo kiểm kho",
    });
  } catch (error) {
    console.error("Lỗi xuất PDF:", error);
    throw error;
  }
};
