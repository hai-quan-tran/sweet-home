package com.sweethome.staff;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.sweethome.auth.Account;
import com.sweethome.auth.AccountRepository;
import com.sweethome.auth.AccountRole;
import com.sweethome.auth.AccountStatus;
import com.sweethome.auth.RefreshTokenRepository;
import com.sweethome.common.crypto.CryptoService;
import com.sweethome.common.error.BusinessException;

/**
 * Kiểm tra thêm/sửa/khoá tài khoản nhân viên.
 */
@ExtendWith(MockitoExtension.class)
class AccountManagementServiceTest {

	@Mock
	private AccountRepository accountRepository;
	@Mock
	private RefreshTokenRepository refreshTokenRepository;
	@Mock
	private PasswordEncoder passwordEncoder;

	private final CryptoService cryptoService = new CryptoService("MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=");
	private AccountManagementService service;

	@BeforeEach
	void setUp() {
		service = new AccountManagementService(accountRepository, refreshTokenRepository, passwordEncoder, cryptoService);
	}

	@Test
	void listMapsAccounts() {
		when(accountRepository.findAllByOrderByRoleDescFullNameAsc()).thenReturn(List.of(staff(5L)));

		assertThat(service.list()).extracting(AccountDto::username).containsExactly("hong");
	}

	@Test
	void getThrowsWhenMissing() {
		when(accountRepository.findById(9L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(9L)).isInstanceOf(BusinessException.class).hasMessage("Không tìm thấy tài khoản");
	}

	@Test
	void createHashesPasswordEncryptsIdNumberAndMasksIt() {
		when(accountRepository.existsByUsername("vy.nguyen")).thenReturn(false);
		when(passwordEncoder.encode("Temp1234")).thenReturn("hashed");
		when(accountRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

		AccountDto dto = service.create(request("vy.nguyen", "Temp1234", "0792 0100 7302", AccountRole.STAFF, true));

		assertThat(dto.idNumberMasked()).isEqualTo("•••••••• 7302");
		assertThat(dto.status()).isEqualTo(AccountStatus.ACTIVE);
		assertThat(dto.phone()).isEqualTo("0978345120");
		verify(accountRepository).save(org.mockito.ArgumentMatchers.argThat(a -> a.getPasswordHash().equals("hashed")
				&& a.isMustChangePassword()
				&& cryptoService.decrypt(a.getIdNumberEncrypted()).equals("079201007302")));
	}

	@Test
	void createRejectsDuplicateUsername() {
		when(accountRepository.existsByUsername("hong")).thenReturn(true);

		assertThatThrownBy(() -> service.create(request("hong", "Temp1234", null, AccountRole.STAFF, true)))
				.isInstanceOf(BusinessException.class).hasMessage("Tên đăng nhập đã được dùng");
	}

	@Test
	void createRejectsWeakOrMissingPassword() {
		when(accountRepository.existsByUsername("vy")).thenReturn(false);

		assertThatThrownBy(() -> service.create(request("vy", null, null, AccountRole.STAFF, true)))
				.isInstanceOf(BusinessException.class).hasMessageContaining("ít nhất 8 ký tự");
	}

	@Test
	void updateWithoutPasswordKeepsPasswordAndIdNumber() {
		Account account = staff(5L);
		account.setPasswordHash("old");
		account.setIdNumberLast4("1111");
		when(accountRepository.findById(5L)).thenReturn(Optional.of(account));
		when(accountRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

		AccountDto dto = service.update(5L, request("ignored", "", "", AccountRole.MANAGER, true), 1L);

		assertThat(account.getPasswordHash()).isEqualTo("old");
		assertThat(dto.idNumberMasked()).isEqualTo("•••••••• 1111");
		assertThat(dto.role()).isEqualTo(AccountRole.MANAGER);
		assertThat(dto.username()).isEqualTo("hong");
		verify(refreshTokenRepository, never()).revokeAllByAccountId(anyLong());
	}

	@Test
	void updateResettingPasswordRevokesSessions() {
		Account account = staff(5L);
		when(accountRepository.findById(5L)).thenReturn(Optional.of(account));
		when(passwordEncoder.encode("NewTemp99")).thenReturn("new-hash");
		when(accountRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

		service.update(5L, request("hong", "NewTemp99", null, AccountRole.STAFF, true), 1L);

		assertThat(account.getPasswordHash()).isEqualTo("new-hash");
		assertThat(account.isMustChangePassword()).isTrue();
		verify(refreshTokenRepository).revokeAllByAccountId(5L);
	}

	@Test
	void lockingAccountRevokesSessions() {
		Account account = staff(5L);
		when(accountRepository.findById(5L)).thenReturn(Optional.of(account));
		when(accountRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

		AccountDto dto = service.update(5L, request("hong", null, null, AccountRole.STAFF, false), 1L);

		assertThat(dto.status()).isEqualTo(AccountStatus.LOCKED);
		verify(refreshTokenRepository).revokeAllByAccountId(5L);
	}

	@Test
	void managerCannotLockOrDemoteSelf() {
		when(accountRepository.findById(1L)).thenReturn(Optional.of(staff(1L)));

		assertThatThrownBy(() -> service.update(1L, request("admin", null, null, AccountRole.MANAGER, false), 1L))
				.isInstanceOf(BusinessException.class).hasMessageContaining("chính mình");
		assertThatThrownBy(() -> service.update(1L, request("admin", null, null, AccountRole.STAFF, true), 1L))
				.isInstanceOf(BusinessException.class).hasMessageContaining("chính mình");
	}

	private AccountUpsertRequest request(String username, String password, String idNumber, AccountRole role, boolean active) {
		return new AccountUpsertRequest(" Nguyễn Thảo Vy ", "0978345120", idNumber, LocalDate.of(2026, 10, 12), username,
				password, true, role, active);
	}

	private Account staff(Long id) {
		Account account = new Account();
		account.setUsername("hong");
		account.setFullName("Lê Thị Hồng");
		account.setRole(AccountRole.STAFF);
		try {
			var field = Account.class.getDeclaredField("id");
			field.setAccessible(true);
			field.set(account, id);
		} catch (ReflectiveOperationException e) {
			throw new IllegalStateException(e);
		}
		return account;
	}
}
