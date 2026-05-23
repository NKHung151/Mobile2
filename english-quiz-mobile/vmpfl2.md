# Luồng hoạt động: Module View My Progress - Tab History
1. Tại trang HistoryScreen_New.js, người dùng nhấn chọn tab "History"
2. Trang HistoryScreen_New.js gọi lớp api.js yêu cầu lấy danh sách lịch sử buổi học
3. Lớp api.js gọi hàm getLearningHistory()
4. Hàm getLearningHistory() thực hiện và gửi GET request đến Router learningHistory
5. Router learningHistory.js gọi controller learningHistoryController
6. learningHistoryController gọi hàm getUserLearningHistory()
7. Hàm getUserLearningHistory() gọi service learningHistoryService
8. learningHistoryService gọi hàm getUserHistory()
9. Hàm getUserHistory() gọi lớp LearningHistory (Model) thực hiện truy vấn danh sách buổi học
10. Lớp LearningHistory thực hiện hàm find() kèm điều kiện lọc (user_id, sort: created_at desc)
11. Lớp LearningHistory trả kết quả danh sách buổi học cho service
12. Service learningHistoryService trả kết quả cho controller
13. Controller getUserLearningHistory() trả kết quả JSON cho Router learningHistory.js
14. Router learningHistory.js trả kết quả cho hàm getLearningHistory() của api.js
15. Lớp api.js trả kết quả cho trang HistoryScreen_New.js
16. Trang HistoryScreen_New.js thực hiện hàm renderHistoryCard() để hiển thị danh sách các thẻ buổi học
17. Người dùng nhấn chọn vào một thẻ buổi học trong danh sách lịch sử
18. Trang HistoryScreen_New.js thực hiện điều hướng sang trang SessionDetailsScreen.js kèm theo session_id
19. Trang SessionDetailsScreen.js gọi lớp api.js yêu cầu lấy chi tiết câu trả lời của buổi học
20. Lớp api.js gọi hàm getSessionAnswers()
21. Hàm getSessionAnswers() thực hiện và gửi GET request đến Router learningHistory
22. Router learningHistory.js gọi controller learningHistoryController
23. learningHistoryController gọi hàm getSessionAnswers()
24. Hàm getSessionAnswers() gọi service learningHistoryService
25. learningHistoryService gọi hàm getSessionDetails()
26. Hàm getSessionDetails() gọi lớp LearningHistory để lấy thông tin tổng quát buổi học
27. Hàm getSessionDetails() gọi lớp SessionAnswer (Model) để lấy danh sách chi tiết các câu trả lời
28. Lớp SessionAnswer thực hiện hàm find() dựa trên session_id và trả kết quả cho service
29. Service learningHistoryService đóng gói thông tin (session, answers) trả về cho controller
30. Controller getSessionAnswers() trả kết quả JSON cho Router learningHistory.js
31. Router learningHistory.js trả kết quả cho hàm getSessionAnswers() của api.js
32. Lớp api.js trả kết quả cho trang SessionDetailsScreen.js
33. Trang SessionDetailsScreen.js hiển thị giao diện chi tiết (Câu hỏi, Đáp án người dùng, Đáp án đúng, Kết quả Đúng/Sai)