# Luồng hoạt động: Module View My Progress - Tab Report (Statistics)

1. Tại trang HistoryScreen_New.js, người dùng nhấn chọn tab "Report"
2. Trang HistoryScreen_New.js hiển thị giao diện tab Statistics
3. Trang HistoryScreen_New.js gọi lớp api.js yêu cầu lấy dữ liệu thống kê chi tiết
4. Lớp api.js gọi hàm getLearningStatistics()
5. Hàm getLearningStatistics() thực hiện và gửi GET request đến Router learningHistory
6. Router learningHistory.js gọi controller learningHistoryController
7. learningHistoryController gọi hàm getLearningStatistics()
8. Hàm getLearningStatistics() gọi service learningHistoryService
9. learningHistoryService gọi hàm getDetailedStatistics()
10. Hàm getDetailedStatistics() gọi lớp LearningHistory (Model) để lấy toàn bộ danh sách buổi học của người dùng
11. Lớp LearningHistory thực hiện hàm find() dựa trên user_id và trả về danh sách các buổi học hoàn thành
12. Hàm getDetailedStatistics() thực hiện phân tích dữ liệu tổng quát (Tính tổng số câu hỏi, tổng số câu đúng, tổng thời gian học)
13. Hàm getDetailedStatistics() thực hiện tính toán tỷ lệ hoàn thành và thời gian trung bình mỗi buổi học
14. Hàm getDetailedStatistics() gọi lớp LearningHistory thực hiện hàm aggregate() để phân tích sâu theo từng chủ đề
15. Lớp LearningHistory trả về danh sách các chủ đề đã học kèm theo độ chính xác trung bình của từng chủ đề
16. Hàm getDetailedStatistics() lọc ra danh sách "Top Topics" (Các chủ đề có kết quả tốt nhất)
17. Hàm getDetailedStatistics() trả kết quả thống kê chi tiết cho controller
18. Controller getLearningStatistics() trả kết quả JSON cho Router learningHistory.js
19. Router learningHistory.js trả kết quả cho hàm getLearningStatistics() của api.js
20. Lớp api.js trả kết quả dữ liệu cho trang HistoryScreen_New.js
21. Trang HistoryScreen_New.js thực hiện hàm renderStatisticsCard() để hiển thị dữ liệu lên màn hình
22. Trang hiển thị phần "Overall Performance" (Tổng số buổi học, Tổng số câu hỏi, Độ chính xác trung bình)
23. Trang hiển thị phần "Learning Time" (Tổng số phút học, Thời gian trung bình mỗi buổi)
24. Trang hiển thị danh sách các chủ đề hàng đầu (Top Topics) với biểu đồ thanh thể hiện độ chính xác
25. Trang hiển thị phần "Weekly Summary" (Số buổi học trong tuần, Số ngày học trong tuần)
