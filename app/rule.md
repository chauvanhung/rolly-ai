# Quy tắc phát triển hệ thống AI Automation Assistant

1. Không sử dụng API ngoài, chỉ dùng Ollama local.
2. Tất cả truy vấn SQL phải là SELECT, không được phép DELETE/UPDATE/INSERT/DROP.
3. Dữ liệu nhạy cảm phải được che/mask khi trả về.
4. Log mọi truy vấn và hành động tự động.
5. Tối ưu RAM, chỉ load model/FAISS 1 lần (singleton).
6. Giao diện web đơn giản, dễ dùng, không lưu lịch sử chat trên server.
7. Tự động hóa phải có log và cảnh báo lỗi.
8. Hệ thống phải chạy được offline hoàn toàn.
9. Mọi câu trả lời pháp luật phải trích dẫn nguồn luật.
10. Code phải rõ ràng, có chú thích, dễ bảo trì.
