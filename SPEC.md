# SPEC: Web học tiếng Nhật trung cấp (từ vựng / kanji / đọc hiểu)

Nguồn nội dung: giáo trình 『中級を学ぼう 中級前期 第2版』(8 bài). Dữ liệu đã được trích sẵn ra JSON trong `src/data/`. **Không sửa file dữ liệu**, chỉ đọc.
Người dùng: người Việt học tiếng Nhật, giao diện (nhãn, nút, hướng dẫn) viết bằng **tiếng Việt**; nội dung học bằng tiếng Nhật.

## Stack
- Vite + React 18 (JavaScript, không TypeScript), `react-router-dom` với **HashRouter** (mở được khi host tĩnh).
- Không dùng thư viện UI / state ngoài. CSS thuần (CSS variables, một file global + CSS theo component được). Không Tailwind.
- Font: Google Fonts `Noto Sans JP` (UI/nội dung) + `Noto Serif JP` (bài đọc); có fallback system font.
- Lưu tiến độ trong `localStorage` (bọc try/catch, vẫn chạy được nếu storage bị chặn).
- Lệnh bắt buộc chạy được: `npm run dev`, `npm run build`. Build phải sạch, không warning lỗi.

## Dữ liệu (`src/data/`)
Dùng `import.meta.glob('./data/*.json', { eager: true })` hoặc import tường minh trong `src/lib/data.js`, xuất ra cấu trúc gọn cho các trang.

### `lessonN.json` (N = 1..8)
```
{
  id, title, titleVi, bookPages,
  reading: {
    paragraphs: [string],        // có furigana markup
    translationVi: [string],     // bản dịch tiếng Việt, cùng số đoạn
    table?: { afterParagraph: number, headers: [string], rows: [[string]] }  // chỉ bài 2; ô có thể có markup
  },
  vocab: [ { w, r, note?, vi } ],   // w: từ (không có furigana), r: cách đọc hiragana, note: ghi chú cách dùng, vi: nghĩa tiếng Việt
  questions: [ ... ]
}
```
**Furigana markup**: `漢字{かんじ}` = một cụm kanji liền nhau theo sau là `{cách đọc}`. Regex gợi ý: `/([一-鿿々〆ヵヶ]+)\{([^}]+)\}/g`. Phải render bằng thẻ `<ruby><rb>…<rt>…</rt></ruby>`. Mọi chuỗi có thể có markup (kể cả `title`, ô bảng, và câu hỏi) nên dùng một component chung `<Ruby text={...} show={bool} />`. Khi `show=false` thì chỉ hiện chữ gốc, không hiện `{…}`. Hàm `stripRuby(text)` trả chuỗi gốc không markup.

### Các kiểu câu hỏi (`questions[].type`)
- `tf`: `{prompt, items:[{text, answer:boolean}]}` đúng (○) / sai (×) cho từng item.
- `choice`: `{prompt, options:[string], answer:index}` chọn 1 đáp án.
- `match`: `{prompt, left:[string], right:[{key,text}], answers:[key theo thứ tự left]}` nối mỗi mục trái với 1 mục phải (dùng `<select>` cho mỗi mục trái là đủ, thân thiện mobile).
- `fill`: `{prompt, wordBank:[string], items:[{text, answer: string | string[], anyOrder?: boolean}]}`. Trong `text`, chỗ trống được đánh dấu bằng `（　）` (ngoặc toàn-width + khoảng trắng toàn-width). Mỗi chỗ trống là một `<select>` chọn từ `wordBank`. `answer` là mảng khi item có nhiều chỗ trống; nếu `anyOrder` thì so sánh không phân biệt thứ tự.
- `order`: `{prompt, items:[{key,text}], answer:[key theo thứ tự đúng]}` sắp xếp thứ tự (nút ↑ ↓ cho mỗi dòng; hiển thị ban đầu theo thứ tự trộn cố định, KHÔNG được hiện sẵn thứ tự đúng).
- `classify`: `{prompt, categories:[string], items:[{text, answer: index category}]}` mỗi item chọn một nhóm (`<select>` hoặc nút).

Chấm điểm theo từng item con (mỗi item đúng = 1 điểm). Nút "Chấm điểm" hiện đúng/sai từng item (màu + icon + chữ, không chỉ dựa vào màu); nút "Xem đáp án"; nút "Làm lại". Lưu điểm cao nhất mỗi bài.

### `kanjiN.json`
```
{ lesson, kanji: [ { k, on:[katakana], kun:[hiragana], words: [[từ, cách đọc]] } ] }
```
Tổng 193 chữ. `on` có thể rỗng, `kun` có thể rỗng.

## Trang & tính năng

### Chung
- Header cố định: logo/tên "中級を学ぼう" + điều hướng (Trang chủ · Từ vựng · Kanji · Đọc hiểu), nút đổi giao diện sáng/tối (mặc định theo `prefers-color-scheme`, lưu lựa chọn).
- Footer nhỏ: ghi chú "Nghĩa tiếng Việt và đáp án câu hỏi do AI soạn từ nội dung sách (sách gốc không kèm bản dịch và đáp án trong file này), hãy đối chiếu lại với sách/giáo viên."
- Mọi từ tiếng Nhật có nút 🔊 đọc bằng Web Speech API (`speechSynthesis`, lang `ja-JP`); ẩn nút nếu trình duyệt không hỗ trợ.
- Responsive từ 360px; không cuộn ngang; vùng bấm tối thiểu 44px; focus rõ ràng; hỗ trợ bàn phím; tôn trọng `prefers-reduced-motion`.

### `/` Trang chủ
- Giới thiệu ngắn, 3 thẻ kỹ năng lớn (Từ vựng / Kanji / Đọc hiểu) và lưới 8 bài học (số bài, tiêu đề có furigana, tiêu đề tiếng Việt, số từ vựng, số kanji). Mỗi thẻ bài có thanh tiến độ gồm: % từ đã thuộc, % kanji đã thuộc, điểm đọc hiểu cao nhất; bấm vào bài mở nhanh 3 kỹ năng của bài đó.
- Khối "Tiếp tục học" nếu có lịch sử gần nhất.

### `/vocab` Từ vựng
Bộ lọc: chọn bài (Tất cả / 1–8, chọn nhiều), tìm kiếm (tiếng Nhật, hiragana, tiếng Việt), lọc "chưa thuộc".
Chế độ (tab):
1. **Danh sách**: bảng/thẻ gồm từ, cách đọc, ghi chú `note`, nghĩa; công tắc ẩn/hiện cách đọc và nghĩa (để tự kiểm tra); nút đánh dấu "đã thuộc".
2. **Thẻ ghi nhớ (flashcard)**: lật thẻ bằng click/Space; ←/→ chuyển thẻ; nút "Đã thuộc" / "Chưa thuộc"; trộn thẻ; chọn mặt trước: Nhật hoặc Việt.
3. **Trắc nghiệm**: 10/20/tất cả câu, 4 lựa chọn (đáp án nhiễu lấy từ cùng bộ lọc). Loại câu: Nhật→Việt, Việt→Nhật, Từ→Cách đọc. Hiện kết quả cuối có danh sách câu sai, nút "Ôn lại các câu sai". Câu sai tự động đánh dấu "chưa thuộc", câu đúng 2 lần liên tiếp thì tự đánh dấu "đã thuộc" (chọn cách đơn giản, nhất quán).
4. **Gõ cách đọc**: hiện từ, người dùng gõ hiragana; chấp nhận so sánh sau khi chuẩn hóa (katakana → hiragana, bỏ khoảng trắng). Hiện đáp án đúng khi sai.

### `/kanji` Kanji
- Lưới ô chữ kanji theo bài (tab/bộ lọc bài 1–8 + Tất cả), tìm kiếm theo chữ / âm On / âm Kun; ô kanji đã thuộc có dấu hiệu rõ ràng (không chỉ màu).
- Bấm vào một ô mở modal/panel chi tiết: chữ lớn, âm On (katakana), âm Kun (hiragana), danh sách từ ví dụ kèm cách đọc, 🔊, nút "Đã thuộc", trước/sau (←/→). Đóng bằng Esc, focus trap đúng chuẩn.
- Chế độ luyện (tab):
  1. **Thẻ ghi nhớ**: mặt trước kanji, mặt sau On/Kun + từ ví dụ.
  2. **Đọc từ**: hiện một từ ví dụ (ví dụ 幾分), chọn cách đọc đúng trong 4 lựa chọn (nhiễu lấy từ các từ khác cùng bộ lọc, cùng độ dài tương đối).
  3. **Gõ cách đọc**: như vocab.
  4. **Chọn kanji**: hiện từ ở dạng hiragana + một chữ kanji trong từ bị khuyết (ví dụ `か□ぶん`?) → đơn giản hơn: hiện cách đọc của từ, người dùng chọn đúng viết kanji trong 4 lựa chọn là các từ khác nhau cùng bài.
- Hiển thị tiến độ đã thuộc / tổng.

### `/reading` và `/reading/:id` Đọc hiểu
- `/reading`: danh sách 8 bài (tiêu đề, độ dài, điểm cao nhất).
- `/reading/:id`:
  - Thanh công cụ dính (sticky): công tắc **Furigana** (mặc định bật), công tắc **Bản dịch tiếng Việt** (hiện dưới mỗi đoạn), chỉnh cỡ chữ (3 mức), nút 🔊 đọc cả bài (đọc từng đoạn bằng chuỗi `speechSynthesis`, có nút dừng; dùng `stripRuby` để lấy văn bản gốc).
  - Hiển thị tiêu đề + các đoạn (đánh số đoạn 第1段落…) bằng font serif, giãn dòng rộng (line-height ≥ 2.2 khi có furigana). Với bài 2 chèn bảng đúng vị trí `afterParagraph`.
  - **Tra từ**: trong đoạn văn, các từ có trong `vocab` của bài (so khớp theo `w` đã bỏ `(な)`, `～`, ghi chú trong ngoặc; chỉ làm best-effort) được gạch chân nhẹ; bấm/hover/focus hiện popover có cách đọc + nghĩa tiếng Việt. Không được làm hỏng ruby/xuống dòng.
  - Panel/accordion **Từ vựng của bài** (danh sách vocab của bài, đánh dấu đã thuộc).
  - Mục **Câu hỏi** (ngay dưới bài, `questions` của bài) với 6 kiểu như mô tả; hiện tổng điểm; lưu điểm cao nhất.
  - Chế độ **Ẩn furigana để tự kiểm tra** chính là công tắc Furigana tắt; đồng thời cho phép bấm một từ có furigana khi đang tắt để xem đọc (nice-to-have, bỏ qua nếu phức tạp).
  - Nút bài trước / bài sau.

## Tiến độ (`src/lib/progress.js`)
Một khóa `localStorage` `tn:v1` chứa JSON: `{ vocabKnown: {"1:0": true,...}, kanjiKnown: {"音": true,...}, readingScore: {"1": {score, total}}, settings: {theme, furigana, fontSize, showTranslation}, recent: {...} }`. Cung cấp hook `useProgress()` (có `useSyncExternalStore` hoặc context) để mọi trang đồng bộ. Có nút "Xóa toàn bộ tiến độ" (xác nhận) ở trang chủ hoặc footer.
`id` từ vựng = `${lesson.id}:${index trong mảng vocab}`.

## Thiết kế
- Phong cách: sạch, ấm, dễ đọc lâu, hơi hướng giấy washi hiện đại: nền kem nhạt (sáng) / xanh than đậm (tối), một màu nhấn (đỏ son #c0392b hoặc chàm), thẻ có viền mảnh, bo góc vừa phải. Tránh phong cách "template AI": không gradient tím, không glassmorphism, không hiệu ứng thừa.
- Định nghĩa màu bằng CSS variables trên `:root`, có bản tối qua `@media (prefers-color-scheme: dark)` và `[data-theme]` override. Đảm bảo tương phản AA.
- Chữ kanji lớn trong flashcard/modal (≥ 96px), thang cỡ chữ rõ ràng.
- Hoạt ảnh: chỉ lật thẻ flashcard và chuyển nhẹ; tắt khi `prefers-reduced-motion`.

## Cấu trúc thư mục gợi ý
```
src/
  main.jsx, App.jsx, index.css
  data/              (CÓ SẴN, không sửa)
  lib/ data.js, progress.js, ruby.js (parse + stripRuby), speech.js, quiz.js (sinh câu hỏi, trộn có seed), kana.js (katakana→hiragana)
  components/ Ruby.jsx, Header.jsx, Footer.jsx, ProgressBar.jsx, SpeakButton.jsx, Modal.jsx, Tabs.jsx, LessonFilter.jsx
  pages/ Home.jsx, Vocab.jsx, Kanji.jsx, ReadingList.jsx, Reading.jsx
  pages/reading/ Questions.jsx + một component cho mỗi kiểu câu hỏi (Tf, Choice, Match, Fill, Order, Classify)
```

## Tiêu chí hoàn thành
1. `npm run build` thành công.
2. Cả 8 bài đọc hiển thị đúng furigana (kiểm tra bằng cách đếm: không còn ký tự `{` hoặc `}` hiển thị ra màn hình ở bất kỳ trang nào).
3. Cả 193 kanji hiển thị trong trang Kanji; cả vocab của 8 bài hiển thị trong trang Từ vựng.
4. 6 kiểu câu hỏi chấm điểm đúng với dữ liệu mẫu (tự kiểm tra bằng cách chọn đáp án đúng từ dữ liệu → đạt điểm tối đa).
5. Tiến độ vẫn còn sau khi tải lại trang.
6. Không có lỗi console khi điều hướng qua tất cả các trang.
7. Chạy tốt ở 360px và 1280px, cả sáng lẫn tối.
