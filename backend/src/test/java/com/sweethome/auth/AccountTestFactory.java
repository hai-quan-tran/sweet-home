package com.sweethome.auth;

/** Tạo Account cho test, gán id qua reflection vì id chỉ sinh khi lưu DB thật. */
final class AccountTestFactory {

	private AccountTestFactory() {
	}

	static Account create(long id, String username, String passwordHash, AccountRole role, AccountStatus status,
			boolean mustChangePassword) {
		Account account = new Account();
		account.setUsername(username);
		account.setPasswordHash(passwordHash);
		account.setFullName("Tên test");
		account.setRole(role);
		account.setStatus(status);
		account.setMustChangePassword(mustChangePassword);
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
