package com.sweethome.order;

import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.sweethome.auth.AccountRole;
import com.sweethome.auth.JwtService;

/**
 * API đơn thuê. Quản lý và Nhân viên đều tạo/xem/thu tiền được; sửa/xoá khoản đã thu chỉ Quản lý
 * (xem {@code business-rules.md}).
 */
@RestController
@RequestMapping("/orders")
public class OrderController {

	private final OrderService orderService;
	private final OrderPaymentService paymentService;
	private final OrderLifecycleService lifecycleService;

	public OrderController(OrderService orderService, OrderPaymentService paymentService,
			OrderLifecycleService lifecycleService) {
		this.orderService = orderService;
		this.paymentService = paymentService;
		this.lifecycleService = lifecycleService;
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

	/** Xác nhận khách đã nhận phòng. */
	@PostMapping("/{id}/check-in")
	public OrderDto checkIn(@PathVariable Long id) {
		return lifecycleService.checkIn(id);
	}

	/** Xem trước tiền khi trả phòng (phụ thu quá giờ, thêm tay, còn phải thu). */
	@PostMapping("/{id}/checkout/preview")
	public CheckoutPreviewResponse previewCheckout(@PathVariable Long id, @Valid @RequestBody CheckoutRequest request) {
		return lifecycleService.previewCheckout(id, request);
	}

	/** Trả phòng (xác nhận trả). */
	@PostMapping("/{id}/checkout")
	public OrderDto checkout(@PathVariable Long id, @Valid @RequestBody CheckoutRequest request) {
		return lifecycleService.checkout(id, request);
	}

	/** Mức hoàn cọc mặc định nếu huỷ ngay bây giờ. */
	@GetMapping("/{id}/cancel/preview")
	public CancelPreviewResponse previewCancel(@PathVariable Long id) {
		return lifecycleService.previewCancel(id);
	}

	/** Huỷ đơn (quyền theo vai trò, xem business-rules.md mục Huỷ đơn). */
	@PostMapping("/{id}/cancel")
	public OrderDto cancel(@PathVariable Long id, @Valid @RequestBody CancelRequest request,
			@AuthenticationPrincipal JwtService.AuthenticatedPrincipal principal) {
		return lifecycleService.cancel(id, request, principal != null && principal.role() == AccountRole.MANAGER);
	}

	/** Thu thêm một khoản tiền của đơn. */
	@PostMapping("/{id}/payments")
	public OrderDto addPayment(@PathVariable Long id, @Valid @RequestBody OrderPaymentRequest request) {
		return paymentService.add(id, request);
	}

	/** Sửa một khoản đã thu (chỉ Quản lý). */
	@PutMapping("/{id}/payments/{paymentId}")
	@PreAuthorize("hasRole('MANAGER')")
	public OrderDto updatePayment(@PathVariable Long id, @PathVariable Long paymentId,
			@Valid @RequestBody OrderPaymentRequest request) {
		return paymentService.update(id, paymentId, request);
	}

	/** Xoá một khoản đã thu (chỉ Quản lý). */
	@DeleteMapping("/{id}/payments/{paymentId}")
	@PreAuthorize("hasRole('MANAGER')")
	public OrderDto deletePayment(@PathVariable Long id, @PathVariable Long paymentId) {
		return paymentService.delete(id, paymentId);
	}
}
