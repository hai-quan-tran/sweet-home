import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { AuthService } from '../../core/auth.service';
import { formatMoney } from '../../core/money';
import { PricingOverview, RoomDto } from '../../core/room.models';
import { RoomService } from '../../core/room.service';
import { PricingDialog } from './pricing-dialog';

type Tab = 'phong' | 'bang-gia' | 'phu-thu';

/** Màn Phòng & bảng giá: danh sách phòng, bảng giá theo hạng, phụ thu (chưa làm). */
@Component({
  selector: 'app-rooms-page',
  imports: [RouterLink, ButtonModule, PricingDialog],
  templateUrl: './rooms-page.html',
  styleUrl: './rooms-page.scss',
})
export class RoomsPage {
  private readonly roomService = inject(RoomService);
  private readonly auth = inject(AuthService);

  protected readonly formatMoney = formatMoney;
  protected readonly tab = signal<Tab>('phong');
  protected readonly rooms = signal<RoomDto[]>([]);
  protected readonly pricing = signal<PricingOverview | null>(null);
  protected readonly loading = signal(true);
  protected readonly pricingDialogVisible = signal(false);
  protected readonly isManager = computed(() => this.auth.currentUser()?.role === 'MANAGER');

  constructor() {
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
    this.roomService.list().subscribe((rooms) => {
      this.rooms.set(rooms);
      this.loading.set(false);
    });
    this.roomService.pricingOverview().subscribe((overview) => this.pricing.set(overview));
  }

  /** Bật/tắt nhận đặt phòng ngay trên thẻ phòng. */
  toggleAccepting(room: RoomDto): void {
    this.roomService.setAcceptingBookings(room.id, !room.acceptingBookings).subscribe((updated) => {
      this.rooms.update((list) => list.map((r) => (r.id === updated.id ? updated : r)));
    });
  }

  /** Cập nhật lại bảng giá sau khi dialog lưu xong. */
  onPricingSaved(overview: PricingOverview): void {
    this.pricing.set(overview);
    this.reload();
  }

  /** Nhãn hình thức check-in mặc định hiển thị trên thẻ phòng. */
  checkInLabel(room: RoomDto): string {
    return room.defaultCheckInMode === 'SELF' ? 'Mặc định: khách tự check-in' : 'Mặc định: nhân viên check-in';
  }

  protected readonly roomTypeCount = computed(() => this.pricing()?.roomTypes.length ?? 0);

  /** Ảnh bìa của phòng, null nếu chưa có ảnh. */
  coverPhoto(room: RoomDto): string | null {
    return room.photos.find((p) => p.cover)?.url ?? null;
  }
}
