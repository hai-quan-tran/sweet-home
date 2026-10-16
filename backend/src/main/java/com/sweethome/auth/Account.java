package com.sweethome.auth;

import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import com.sweethome.common.audit.Auditable;

/**
 * Tài khoản đăng nhập: Quản lý hoặc Nhân viên.
 */
@Entity
@Table(name = "account")
public class Account extends Auditable {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true, length = 50)
	private String username;

	@Column(name = "password_hash", nullable = false, length = 100)
	private String passwordHash;

	@Column(name = "full_name", nullable = false, length = 100)
	private String fullName;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private AccountRole role;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private AccountStatus status = AccountStatus.ACTIVE;

	@Column(name = "must_change_password", nullable = false)
	private boolean mustChangePassword = true;

	@Column(length = 20)
	private String phone;

	/** CCCD mã hoá AES (nguồn sự thật), giải mã bằng CryptoService. */
	@Column(name = "id_number_encrypted")
	private String idNumberEncrypted;

	/** 4 số cuối CCCD, để hiển thị dạng che mà không phải giải mã. */
	@Column(name = "id_number_last4", length = 4)
	private String idNumberLast4;

	@Column(name = "start_date")
	private LocalDate startDate;

	/** Số lần đăng nhập sai liên tiếp; về 0 khi đăng nhập đúng hoặc khi bị khoá tạm. */
	@Column(name = "failed_login_count", nullable = false)
	private int failedLoginCount;

	/** Khoá tạm do sai mật khẩu nhiều lần: không đăng nhập được tới thời điểm này; null nếu không bị khoá tạm. */
	@Column(name = "login_locked_until")
	private LocalDateTime loginLockedUntil;

	public Long getId() {
		return id;
	}

	public String getUsername() {
		return username;
	}

	public void setUsername(String username) {
		this.username = username;
	}

	public String getPasswordHash() {
		return passwordHash;
	}

	public void setPasswordHash(String passwordHash) {
		this.passwordHash = passwordHash;
	}

	public String getFullName() {
		return fullName;
	}

	public void setFullName(String fullName) {
		this.fullName = fullName;
	}

	public AccountRole getRole() {
		return role;
	}

	public void setRole(AccountRole role) {
		this.role = role;
	}

	public AccountStatus getStatus() {
		return status;
	}

	public void setStatus(AccountStatus status) {
		this.status = status;
	}

	public boolean isMustChangePassword() {
		return mustChangePassword;
	}

	public void setMustChangePassword(boolean mustChangePassword) {
		this.mustChangePassword = mustChangePassword;
	}

	public String getPhone() {
		return phone;
	}

	public void setPhone(String phone) {
		this.phone = phone;
	}

	public String getIdNumberEncrypted() {
		return idNumberEncrypted;
	}

	public void setIdNumberEncrypted(String idNumberEncrypted) {
		this.idNumberEncrypted = idNumberEncrypted;
	}

	public String getIdNumberLast4() {
		return idNumberLast4;
	}

	public void setIdNumberLast4(String idNumberLast4) {
		this.idNumberLast4 = idNumberLast4;
	}

	public LocalDate getStartDate() {
		return startDate;
	}

	public void setStartDate(LocalDate startDate) {
		this.startDate = startDate;
	}

	public int getFailedLoginCount() {
		return failedLoginCount;
	}

	public void setFailedLoginCount(int failedLoginCount) {
		this.failedLoginCount = failedLoginCount;
	}

	public LocalDateTime getLoginLockedUntil() {
		return loginLockedUntil;
	}

	public void setLoginLockedUntil(LocalDateTime loginLockedUntil) {
		this.loginLockedUntil = loginLockedUntil;
	}
}
