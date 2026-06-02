# Kiểm chứng TradeOS trên eBay

## Kịch bản kiểm tra

> "Tôi cần mua **Bluetooth 5.3 Earhook Earbuds** với budget tốt nhất."

---

## Bảng kiểm tra thực tế

### Bước 1: Tìm kiếm

| #   | Hành động                                           | Kết quả mong đợi                                                                              | Ghi chú |
| --- | --------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------- |
| 1.1 | Mở ebay.com, search "Bluetooth 5.3 earhook earbuds" | Thấy danh sách sản phẩm                                                                       |         |
| 1.2 | Ghi lại 3 listing khác nhau                         | URL: \_\_\_\_\_\_\_\_\_\_\_\_\_\_, \_\_\_\_\_\_\_\_\_\_\_\_\_\_, \_\_\_\_\_\_\_\_\_\_\_\_\_\_ |         |

### Bước 2: Thu thập dữ liệu từ mỗi listing

**Listing 1**
| Field | Giá trị | Nguồn (URL/cột nào trên page) |
|---|---|---|
| Tên sản phẩm | | |
| Giá | | |
| Shipping | | |
| Seller name | | |
| Seller rating (%) | | |
| Seller reviews (count) | | |
| Returns policy | | |
| Item condition | | |
| Location | | |
| Est. delivery | | |

**Listing 2** (dùng bảng tương tự)
**Listing 3** (dùng bảng tương tự)

### Bước 3: So sánh — AI làm labor chỗ này

| Tiêu chí                  | Listing 1      | Listing 2      | Listing 3      |
| ------------------------- | -------------- | -------------- | -------------- |
| Giá niêm yết              | \$             | \$             | \$             |
| Shipping                  | \$             | \$             | \$             |
| **Tổng giá (all-in)**     | **\$**         | **\$**         | **\$**         |
| Seller rating             | %              | %              | %              |
| Seller reviews            |                |                |                |
| Returns                   | (y/n + policy) | (y/n + policy) | (y/n + policy) |
| Condition                 |                |                |                |
| **Red flags**             |                |                |                |
| — Giá rẻ bất thường?      | □ Có □ Không   | □ Có □ Không   | □ Có □ Không   |
| — Seller mới / ít review? | □ Có □ Không   | □ Có □ Không   | □ Có □ Không   |
| — Shipping lạ / quá đắt?  | □ Có □ Không   | □ Có □ Không   | □ Có □ Không   |
| — No return policy?       | □ Có □ Không   | □ Có □ Không   | □ Có □ Không   |

### Bước 4: Quyết định

**Best option:** Listing \_\_\_\_\_\_\_\_\_

**Lý do:**
\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Evidence đã lưu:**

- [ ] Screenshot listing
- [ ] Seller page screenshot
- [ ] Bảng so sánh này
- [ ] Quyết định + lý do

---

## Nếu TradeOS tự động làm

| Việc                         | AI làm                                            | Human làm                  |
| ---------------------------- | ------------------------------------------------- | -------------------------- |
| Tìm listing                  | —                                                 | Search trên eBay           |
| Thu thập data từ mỗi listing | ✅ Đọc page, extract giá/seller/shipping          | —                          |
| So sánh total cost           | ✅ Tự động cộng price + shipping                  | —                          |
| Flag red flags               | ✅ Giá rẻ quá mức → flag; Seller ít review → flag | —                          |
| Tạo bảng so sánh             | ✅ Xuất bảng như trên                             | —                          |
| Lưu evidence                 | ✅ Screenshot tự động, link gốc                   | —                          |
| Quyết định                   | —                                                 | **Chọn listing + approve** |

---

## Giá trị sau khi kiểm chứng

Khoanh tròn: **Hệ thống này có giúp tôi:**

1. **Tiết kiệm thời gian** so với tự so sánh thủ công? □ Có □ Không
2. **Phát hiện red flags** mà tôi có thể bỏ qua? □ Có □ Không
3. **Có evidence để quyết định** thay vì "cảm giác"? □ Có □ Không
4. **Tự tin ra quyết định** hơn? □ Có □ Không
5. **Trả tiền cho báo cáo kiểu này?** □ Có □ Không (nếu có: \$\_\_\_\_\_/lần)
