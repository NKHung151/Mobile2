# Luồng hoạt động: Module View My Progress - Tab Dashboard

1. Tại trang HomeScreen, người dùng nhấn chọn "View My Progress"
2. Trang HomeScreen gọi trang HistoryScreen_New.js
3. Trang HistoryScreen_New.js hiển thị giao diện tab Dashboard
4. Trang HistoryScreen_New.js gọi lớp api.js yêu cầu lấy dữ liệu dashboard
5. Lớp api.js gọi hàm getLearningDashboard()
6. Hàm getLearningDashboard() thực hiện và gửi GET request đến Router learningHistory
7. Router learningHistory.js gọi controller learningHistoryController
8. learningHistoryController gọi hàm getLearningDashboard()
9. Hàm getLearningDashboard() gọi service learningHistoryService
10. learningHistoryService gọi hàm getDashboardSummary()
11. Hàm getDashboardSummary() gọi lớp LearningHistory yêu cầu lấy các session hoàn thành hôm nay
12. Lớp LearningHistory thực hiện hàm find() và trả kết quả cho service
13. Hàm getDashboardSummary() gọi lớp LearningHistory yêu cầu lấy các session trong 7 ngày gần nhất
14. Lớp LearningHistory thực hiện hàm find() và trả kết quả cho service
15. Hàm getDashboardSummary() gọi lớp LearningHistory yêu cầu lấy thông tin tổng quan các chủ đề
16. Lớp LearningHistory thực hiện hàm aggregate() và trả kết quả cho service
17. Hàm getDashboardSummary() trả kết quả tổng hợp cho controller
18. Controller getLearningDashboard() trả kết quả cho Router learningHistory.js
19. Router learningHistory.js trả kết quả cho hàm getLearningDashboard()
20. Lớp api.js trả kết quả cho trang HistoryScreen_New.js
21. Trang HistoryScreen_New.js hiển thị các thẻ thống kê (Today, Last 7 Days) lên giao diện
22. Người dùng nhấn nút "Get AI Recommendations"
23. Trang HistoryScreen_New.js gọi lớp api.js yêu cầu lấy lời khuyên từ AI
24. Lớp api.js gọi hàm getRecommendations()
25. Hàm getRecommendations() thực hiện và gửi GET request đến Router learningHistory
26. Router learningHistory.js gọi controller learningHistoryController
27. learningHistoryController gọi hàm getRecommendations()
28. Hàm getRecommendations() gọi service learningHistoryService
29. learningHistoryService gọi hàm generateAISuggestions()
30. Hàm generateAISuggestions() gọi lớp LearningHistory yêu cầu tìm chủ đề yếu nhất
31. Lớp LearningHistory thực hiện hàm aggregate() và trả kết quả cho service
32. Hàm generateAISuggestions() thực hiện xây dựng prompt và gọi lớp AI (Gemini API)
33. Lớp AI thực hiện phân tích và trả về lời khuyên học tập
34. Hàm generateAISuggestions() trả kết quả cho controller
35. Controller getRecommendations() trả kết quả cho Router learningHistory.js
36. Router learningHistory.js trả kết quả cho hàm getRecommendations()
37. Lớp api.js trả kết quả cho trang HistoryScreen_New.js
38. Trang HistoryScreen_New.js hiển thị nội dung lời khuyên AI lên giao diện Dashboard
