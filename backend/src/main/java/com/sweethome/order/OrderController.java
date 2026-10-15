package com.sweethome.order;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.validation.Valid;

import org.springframework.format.annotation.DateTimeFormat;
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
	private final OrderExtensionService extensionService;

	public OrderController(OrderService orderService, OrderPaymentService paymentService,
			OrderLifecycleService lifecycleService, OrderExtensionService extensionService) {
		this.orderService = orderService;
		this.paymentService = paymentService;
		this.lifecycleService = lifecycleService;
		this.extensionService = extensionService;
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

	/** Các chặng giao với khoảng thời gian, dùng vẽ lịch đặt phòng. */
	@GetMapping("/stays")
	public List<OrderStayDto> stays(
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
		return orderService.stays(from, to);
	}

	/** Chi tiết một đơn. */
	@GetMapping("/{id}")
	public OrderDto get(@PathVariable Long id) {
		return orderService.get(id);
	}

	/** Mã cửa đã giải mã của một đơn; {@code forMessage=true} khi lấy để sao chép tin nhắn gửi khách (ghi nhật ký riêng). */
	@GetMapping("/{id}/door-code")
	public DoorCodeResponse doorCode(@PathVariable Long id, @RequestParam(defaultValue = "false") boolean forMessage) {
		return orderService.getDoorCode(id, forMessage);
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

	/** Sửa đơn còn ở trạng thái Đã đặt (sửa tiền cọc chỉ Quản lý). */
	@PutMapping("/{id}")
	public OrderDto update(@PathVariable Long id, @Valid @RequestBody OrderUpsertRequest request,
			@AuthenticationPrincipal JwtService.AuthenticatedPrincipal principal) {
		return orderService.update(id, request, isManager(principal));
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

	/** Xem trước gia hạn tại phòng đang ở. */
	@PostMapping("/{id}/extend/preview")
	public ExtendPreviewResponse previewExtend(@PathVariable Long id, @Valid @RequestBody ExtendRequest request) {
		return extensionService.preview(id, request);
	}

	/** Gia hạn tại phòng đang ở. */
	@PostMapping("/{id}/extend")
	public OrderDto extend(@PathVariable Long id, @Valid @RequestBody ExtendRequest request) {
		return extensionService.extend(id, request);
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
		return lifecycleService.cancel(id, request, isManager(principal));
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

	private static boolean isManager(JwtService.AuthenticatedPrincipal principal) {
		return principal != null && principal.role() == AccountRole.MANAGER;
	}
}
