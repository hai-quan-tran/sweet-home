import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Component gốc, chỉ chứa router-outlet.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {}
