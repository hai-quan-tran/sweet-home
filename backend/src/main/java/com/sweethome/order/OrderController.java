package com.sweethome.order;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * API đơn thuê. Quản lý và Nhân viên đều tạo/xem được (xem {@code business-rules.md}); GĐ4 chưa
 * có sửa/huỷ/đổi trạng thái.
 */
@RestController
@RequestMapping("/orders")
public class OrderController {

	private final OrderService orderService;

	public OrderController(OrderService orderService) {
		this.orderService = orderService;
	}

	/** Danh sách đơn có lọc/tìm kiếm/phân trang. */
	@GetMapping
	public OrderListResponse list(
			@RequestParam(required = false) OrderStatus status,
			@RequestParam(required = false) Long roomId,
			@RequestParam(required = false) String search,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size) {
		return orderService.list(status, roomId, search, page, size);
	}

	/** Chi tiết một đơn. */
	@GetMapping("/{id}")
	public OrderDto get(@PathVariable Long id) {
		return orderService.get(id);
	}

	/** Mã cửa đã giải mã của một đơn. */
	@GetMapping("/{id}/door-code")
	public DoorCodeResponse doorCode(@PathVariable Long id) {
		return orderService.getDoorCode(id);
	}

	/** Xem trước giờ nhận/trả, phòng trống và tiền tạm tính trong lúc điền form Tạo đơn. */
	@PostMapping("/preview")
	public OrderPreviewResponse preview(@Valid @RequestBody OrderPreviewRequest request) {
		return orderService.preview(request);
	}

	/** Tạo đơn thuê mới. */
	@PostMapping
	public OrderDto create(@Valid @RequestBody OrderUpsertRequest request) {
		return orderService.create(request);
	}
}
