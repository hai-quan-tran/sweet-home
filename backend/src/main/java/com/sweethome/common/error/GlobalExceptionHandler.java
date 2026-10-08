package com.sweethome.common.error;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Chuyển mọi lỗi thành ProblemDetail (RFC 9457). Không trả chi tiết kỹ thuật ra ngoài.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	/**
	 * Lỗi nghiệp vụ: trả đúng mã HTTP và thông báo đã soạn sẵn.
	 *
	 * @param ex lỗi nghiệp vụ
	 * @return ProblemDetail kèm thông báo
	 */
	@ExceptionHandler(BusinessException.class)
	public ProblemDetail handleBusiness(BusinessException ex) {
		return ProblemDetail.forStatusAndDetail(ex.getStatus(), ex.getMessage());
	}

	/**
	 * Dữ liệu gửi lên sai: trả 400 kèm danh sách lỗi theo từng trường.
	 *
	 * @param ex      lỗi kiểm tra dữ liệu
	 * @param headers header phản hồi
	 * @param status  mã HTTP
	 * @param request request hiện tại
	 * @return ProblemDetail có thuộc tính "errors" (tên trường → thông báo)
	 */
	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		Map<String, String> errors = new LinkedHashMap<>();
		for (FieldError e : ex.getBindingResult().getFieldErrors()) {
			errors.putIfAbsent(e.getField(), e.getDefaultMessage());
		}
		ProblemDetail body = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Dữ liệu không hợp lệ");
		body.setProperty("errors", errors);
		return ResponseEntity.badRequest().body(body);
	}

	/**
	 * Lỗi không lường trước: ghi log đầy đủ, chỉ trả thông báo chung cho người dùng.
	 *
	 * @param ex lỗi bất kỳ
	 * @return ProblemDetail 500
	 */
	@ExceptionHandler(Exception.class)
	public ProblemDetail handleUnexpected(Exception ex) {
		log.error("Lỗi không lường trước", ex);
		return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "Đã có lỗi xảy ra, vui lòng thử lại");
	}
}
